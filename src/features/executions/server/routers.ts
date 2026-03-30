// src/features/executions/server/routers.ts
import { prisma } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { executorRegistry } from "@/features/executions/lib/executor-registry";
import { NodeType } from "@/generated/prisma/enums";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { topologicalSort } from "@/app/inngest/utils";
import { Connection, Node } from "@/generated/prisma/client";

// ─── Step shim ────────────────────────────────────────────────────────────────

const createStepShim = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>): Promise<T> => fn(),
  sleep: async (_id: string, _duration: unknown) => {},
  sleepUntil: async (_id: string, _time: unknown) => {},
  sendEvent: async (_id: string, _event: unknown) => {},
  waitForEvent: async (_id: string, _opts: unknown) => null,
  invoke: async (_id: string, _opts: unknown) => null,
  ai: {
    wrap: async <T>(
      _id: string,
      fn: (opts: any) => Promise<T>,
      opts: any,
    ): Promise<T> => fn(opts),
  },
});

const publishShim = async (..._args: unknown[]) => {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildGroups(
  output: Record<string, unknown>,
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    data: Record<string, unknown>;
  }>,
) {
  return nodes.map((node) => {
    const variableName = node.data?.variableName as string | undefined;
    const variables: Array<{ variableName: string; output: unknown }> = [];

    if (variableName) {
      const value = output[variableName];
      if (value !== undefined) {
        variables.push({ variableName, output: value });

        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          for (const [key, val] of Object.entries(
            value as Record<string, unknown>,
          )) {
            variables.push({
              variableName: `${variableName}.${key}`,
              output: val,
            });
          }
        }
      }
    }

    return {
      nodeId: node.id,
      nodeName: node.name || formatVariableName(variableName ?? node.type),
      nodeType: node.type,
      variables,
    };
  });
}

function atomOutputsToContext(
  outputs: Array<{ variableName: string; output: unknown }>,
): Record<string, unknown> {
  return Object.fromEntries(
    outputs
      .filter((o) => !o.variableName.includes("."))
      .map((o) => [o.variableName, o.output]),
  );
}

function formatVariableName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const executionsRouter = createTRPCRouter({
  getLastForWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input, ctx }) => {
      const [execution, workflow] = await Promise.all([
        prisma.execution.findFirst({
          where: {
            workflowId: input.workflowId,
            workflow: { userId: ctx.auth.user.id },
          },
          orderBy: { startedAt: "desc" },
        }),
        prisma.workflow.findUniqueOrThrow({
          where: {
            id: input.workflowId,
            userId: ctx.auth.user.id,
          },
          include: { nodes: true, connections: true },
        }),
      ]);

      if (!execution) return null;

      const output = (execution.output ?? {}) as Record<string, unknown>;

      // Sort nodes to reflect execution flow
      const sortedNodes = topologicalSort(
        workflow.nodes as Node[],
        workflow.connections as Connection[],
      );

      const nodes = sortedNodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type as string,
        data: (n.data ?? {}) as Record<string, unknown>,
      }));

      return {
        id: execution.id,
        status: execution.status,
        startedAt: execution.startedAt.toISOString(),
        groups: buildGroups(output, nodes),
        output,
      };
    }),

  executeNode: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
        workflowId: z.string(),
        contextOutputs: z
          .array(
            z.object({
              variableName: z.string(),
              output: z.unknown(),
            }),
          )
          .default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // findUniqueOrThrow only supports unique fields in `where` — relation
      // filters are not allowed there. Fetch by id then verify ownership.
      const node = await prisma.node.findUniqueOrThrow({
        where: { id: input.nodeId },
        include: { workflow: true },
      });

      if (
        node.workflowId !== input.workflowId ||
        node.workflow.userId !== ctx.auth.user.id
      ) {
        throw new Error("Node not found");
      }

      const data = node.data as Record<string, unknown>;
      const variableName = data.variableName as string;

      if (!variableName) {
        throw new Error(`Node ${input.nodeId} has no variableName in its data`);
      }

      const executor = executorRegistry[node.type as NodeType];

      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      const context = atomOutputsToContext(input.contextOutputs);

      const result = await executor({
        data,
        nodeId: input.nodeId,
        userId: ctx.auth.user.id,
        context,
        step: createStepShim(),
        publish: publishShim,
      });

      const output = (result as Record<string, unknown>)[variableName];

      return { output, variableName };
    }),
});
