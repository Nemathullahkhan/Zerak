import { anthropicChannel } from "@/app/inngest/channels/anthropic";
import { contentSourceChannel } from "@/app/inngest/channels/content-source";
import { discordChannel } from "@/app/inngest/channels/discord";
import { geminiChannel } from "@/app/inngest/channels/gemini";
import { googleFormTriggerChannel } from "@/app/inngest/channels/google-form-trigger";
import { httpRequestChannel } from "@/app/inngest/channels/http-request";
import { manualTriggerChannel } from "@/app/inngest/channels/manual-trigger";
import { inngest } from "@/app/inngest/client";
import { topologicalSort } from "@/app/inngest/utils";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { NonRetriableError } from "inngest";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: 0, // TODO: REMOVE IN PRODUCTION
    onFailure: async ({ event, step }) => {
      return prisma.execution.update({
        where: {
          inngestEventId: event.data.event.id,
        },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },

  {
    event: "workflows/execute-workflow",
    channels: [
      contentSourceChannel(),
      httpRequestChannel(),
      manualTriggerChannel(),
      googleFormTriggerChannel(),
      geminiChannel(),
      discordChannel(),
      anthropicChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or Workflow ID is missing");
    }

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

    const sortedNodes = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
        },
        include: {
          nodes: true,
          connections: true,
        },
      });
      return topologicalSort(workflow.nodes, workflow.connections);
    });

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: workflowId,
        },
        select: {
          userId: true,
        },
      });

      return workflow.userId;
    });

    // Initialize the context with any initial data from the trigger
    let context = event.data.initialData || {};

    // Load connections once so we can resolve which nodes to skip after IF branches.
    const connections = await step.run("load-connections", async () => {
      const wf = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: { connections: true },
      });
      return wf.connections;
    });

    // Nodes whose execution should be skipped because they lie exclusively on
    // a non-taken IF branch. We grow this set as we encounter IF nodes.
    const skippedNodeIds = new Set<string>();

    // Execute each node in topological order
    for (const node of sortedNodes) {
      // Skip nodes that were marked as unreachable by a prior IF branch
      if (skippedNodeIds.has(node.id)) continue;

      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
      });
g
      // After executing, check if this node set a branch decision
      const branchMeta = (context as Record<string, unknown>).__branch__ as
        | { type: string; taken: string }
        | undefined;

      if (branchMeta?.type === "if") {
        const takenHandle = branchMeta.taken; // "true" or "false"
        const skippedHandle = takenHandle === "true" ? "false" : "true";

        // Find all nodes directly connected via the non-taken branch handle
        const skippedDirectChildren = connections
          .filter(
            (c) => c.fromNodeId === node.id && c.fromOutput === skippedHandle,
          )
          .map((c) => c.toNodeId);

        // Transitively collect all descendants of the skipped children
        // (stop at nodes that are also reachable from the taken branch — not
        // implemented here for simplicity; linear branches skip cleanly)
        const queue = [...skippedDirectChildren];
        while (queue.length > 0) {
          const id = queue.shift()!;
          if (skippedNodeIds.has(id)) continue;
          skippedNodeIds.add(id);
          // Enqueue children of id that aren't also reached from another node
          const children = connections
            .filter((c) => c.fromNodeId === id)
            .map((c) => c.toNodeId);
          queue.push(...children);
        }

        // Clear the branch flag from context so it doesn't confuse downstream nodes
        const { __branch__, ...rest } = context as Record<string, unknown>;
        void __branch__;
        context = rest;
      }
    }


    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });

    return {
      workflowId,
      result: context,
    };
  },
);
