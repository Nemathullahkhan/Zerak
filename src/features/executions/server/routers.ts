// src/features/executions/server/routers.ts
import { prisma } from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { executorRegistry } from "@/features/executions/lib/executor-registry";
import { NodeType } from "@/generated/prisma/enums";
import z from "zod";
import { PAGINATION } from "@/config/constants";

// ─── Step shim ────────────────────────────────────────────────────────────────

const createStepShim = () => ({
  run: async <T>(_id: string, fn: () => Promise<T>): Promise<T> => fn(),
  sleep: async (_id: string, _duration: unknown) => {},
  sleepUntil: async (_id: string, _time: unknown) => {},
  sendEvent: async (_id: string, _event: unknown) => {},
  waitForEvent: async (_id: string, _opts: unknown) => null,
  invoke: async (_id: string, _opts: unknown) => null,
});

const publishShim = async (..._args: unknown[]) => {};

// ─── Router ───────────────────────────────────────────────────────────────────

export const executionsRouter = createTRPCRouter({
  // ── Last execution for a workflow (feeds left column chips) ─────────────────
  getLastForWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const execution = await prisma.execution.findFirst({
        where: {
          workflowId: input.workflowId,
          workflow: { userId: ctx.auth.user.id },
          status: { in: ["SUCCESS", "FAILED"] },
        },
        orderBy: { startedAt: "desc" },
        include: {
          workflow: {
            select: {
              nodes: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  data: true,
                },
              },
            },
          },
        },
      });

      if (!execution) return null;

      // execution.output is a flat Record<variableName, outputValue>
      // workflow.nodes lets us match variableName → node name + type
      const output = (execution.output ?? {}) as Record<string, unknown>;
      const nodes = execution.workflow.nodes;

      // Build a lookup: variableName → { nodeName, nodeType }
      // Each node stores its variableName inside node.data
      const variableToNode = nodes.reduce<
        Record<string, { nodeName: string; nodeType: string }>
      >((acc, node) => {
        const data = node.data as Record<string, unknown> | null;
        const variableName = data?.variableName as string | undefined;
        if (variableName) {
          acc[variableName] = {
            nodeName:
              node.name && node.name !== "unknown"
                ? node.name
                : formatNodeType(node.type),
            nodeType: node.type,
          };
        }
        return acc;
      }, {});

      // Build groups: one group per node that has output
      // Group key = nodeName, value = array of { variableName, output }
      type OutputGroup = {
        nodeName: string;
        nodeType: string;
        variables: { variableName: string; output: unknown }[];
      };

      const groupMap = new Map<string, OutputGroup>();

      for (const [variableName, outputValue] of Object.entries(output)) {
        const nodeInfo = variableToNode[variableName];
        const nodeName = nodeInfo?.nodeName ?? variableName;
        const nodeType = nodeInfo?.nodeType ?? "UNKNOWN";

        if (!groupMap.has(nodeName)) {
          groupMap.set(nodeName, { nodeName, nodeType, variables: [] });
        }
        groupMap
          .get(nodeName)!
          .variables.push({ variableName, output: outputValue });
      }

      return {
        executionId: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        groups: Array.from(groupMap.values()),
      };
    }),

  // ── Execute a single node directly (no Inngest) ─────────────────────────────
  executeNode: protectedProcedure
    .input(
      z.object({
        nodeId: z.string(),
        nodeType: z.string(),
        data: z.any(),
        context: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { nodeId, nodeType, data } = input;
      const context = (input.context ?? {}) as Record<string, unknown>;

      const executor = executorRegistry[nodeType as NodeType];
      if (!executor) {
        throw new Error(`No executor registered for node type: ${nodeType}`);
      }

      const result = await executor({
        data: data as Record<string, unknown>,
        nodeId,
        userId: ctx.auth.user.id,
        context,
        step: createStepShim() as never,
        publish: publishShim as never,
      });

      const variableName = (data?.variableName as string | undefined) || nodeId;
      const output = (result as Record<string, unknown>)[variableName];

      return { output, variableName };
    }),

  // ── Get one ─────────────────────────────────────────────────────────────────
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      return prisma.execution.findUniqueOrThrow({
        where: { id: input.id, workflow: { userId: ctx.auth.user.id } },
        include: {
          workflow: { select: { id: true, name: true } },
        },
      });
    }),

  // ── Get many ────────────────────────────────────────────────────────────────
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize } = input;

      const [items, totalCount] = await Promise.all([
        prisma.execution.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: { workflow: { userId: ctx.auth.user.id } },
          orderBy: { startedAt: "desc" },
          include: {
            workflow: { select: { id: true, name: true } },
          },
        }),
        prisma.execution.count({
          where: { workflow: { userId: ctx.auth.user.id } },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNodeType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
