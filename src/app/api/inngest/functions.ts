import { anthropicChannel } from "@/app/inngest/channels/anthropic";
import { codeChannel } from "@/app/inngest/channels/code";
import { contentSourceChannel } from "@/app/inngest/channels/content-source";
import { discordChannel } from "@/app/inngest/channels/discord";
import { geminiChannel } from "@/app/inngest/channels/gemini";
import { googleFormTriggerChannel } from "@/app/inngest/channels/google-form-trigger";
import { httpRequestChannel } from "@/app/inngest/channels/http-request";
import { manualTriggerChannel } from "@/app/inngest/channels/manual-trigger";
import { switchChannel } from "@/app/inngest/channels/switch";
import { inngest } from "@/app/inngest/client";
import { sendWorkflowExecution, topologicalSort } from "@/app/inngest/utils";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { computeNextRun } from "@/lib/cron";
import { NonRetriableError } from "inngest";
import { ifConditionChannel } from "@/app/inngest/channels/if-condition";
import { filterChannel } from "@/app/inngest/channels/filter";
import { googleSheetsChannel } from "@/app/inngest/channels/google-sheets";
import { loopChannel } from "@/app/inngest/channels/loop";

// ─────────────────────────────────────────────────────────────────────────────
// Cron poller — fires every minute, dispatches due scheduled workflows
// ─────────────────────────────────────────────────────────────────────────────

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export const scheduledWorkflowPoller = inngest.createFunction(
  // ✅ Correct syntax from docs: single config object with triggers key
  {
    id: "scheduled-workflow-poller",
    concurrency: { limit: 1 },
  },
  // arg 2: trigger
  { cron: "* * * * *" },

  async ({ step, logger }) => {
    // Reset any schedules stuck in RUNNING (e.g. after a crash)
    const unstuckCount = await step.run("unstick-stale-running", async () => {
      const staleThreshold = new Date(Date.now() - STUCK_THRESHOLD_MS);
      const result = await prisma.scheduledWorkflow.updateMany({
        where: {
          status: "RUNNING",
          lastRun: { lte: staleThreshold },
        },
        data: { status: "IDLE" },
      });
      return result.count;
    });

    if (unstuckCount > 0) {
      logger.warn(`Reset ${unstuckCount} stuck RUNNING schedule(s) to IDLE`);
    }

    const due = await step.run("find-due-schedules", async () => {
      return prisma.scheduledWorkflow.findMany({
        where: {
          isActive: true,
          status: "IDLE",
          nextRun: { lte: new Date() },
        },
      });
    });

    logger.info(`Found ${due.length} due schedule(s)`);

    if (due.length === 0) return { triggered: 0 };

    // ✅ Fan-out pattern from docs: build all events then send in one batch
    const events = await step.run("claim-and-prepare-events", async () => {
      const claimed = [];

      for (const schedule of due) {
        const claim = await prisma.scheduledWorkflow.updateMany({
          where: { id: schedule.id, status: "IDLE" },
          data: {
            status: "RUNNING",
            lastRun: new Date(),
            nextRun: computeNextRun(schedule.cronExpression, schedule.timezone),
          },
        });

        if (claim.count === 0) continue; // already claimed

        claimed.push({
          name: "workflows/execute-workflow" as const,
          data: {
            workflowId: schedule.workflowId,
            initialData: {
              triggeredAt: new Date().toISOString(),
              triggerType: "cron",
            },
          },
        });
      }

      return claimed;
    });

    if (events.length === 0) return { triggered: 0 };

    // ✅ Single batch send — same fan-out pattern shown in docs
    await step.sendEvent("trigger-due-workflows", events);

    logger.info(`Triggered ${events.length} workflow(s)`);

    return { triggered: events.length };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Workflow executor — runs a workflow end-to-end
// ─────────────────────────────────────────────────────────────────────────────

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event, step }) => {
      const workflowId = event.data.event.data.workflowId;

      await prisma.execution.update({
        where: {
          inngestEventId: event.data.event.id,
        },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });

      // Reset schedule
      if (workflowId) {
        await prisma.scheduledWorkflow.updateMany({
          where: { workflowId, status: "RUNNING" },
          data: { status: "ERROR" },
        });
      }
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
      switchChannel(),
      codeChannel(),
      loopChannel(),
      googleSheetsChannel(),
      ifConditionChannel(),
      filterChannel(),
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
        data: { workflowId, inngestEventId },
      });
    });

    const sortedNodes = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: { nodes: true, connections: true },
      });
      return topologicalSort(workflow.nodes, workflow.connections);
    });

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: { userId: true },
      });
      return workflow.userId;
    });

    let context = event.data.initialData || {};

    const connections = await step.run("load-connections", async () => {
      const wf = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: { connections: true },
      });
      return wf.connections;
    });

    const skippedNodeIds = new Set<string>();

    const nodeTimings: Record<
      string,
      { durationMs: number; nodeType: string; nodeName: string }
    > = {};

    const nodeResults: Record<
      string,
      { status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED"; error?: string }
    > = {};

    // Initialize all nodes as PENDING
    for (const node of sortedNodes) {
      nodeResults[node.id] = { status: "PENDING" };
    }

    // Initial update to set PENDING statuses
    await step.run("initialize-node-results", async () => {
      return prisma.execution.update({
        where: { inngestEventId },
        data: {
          output: {
            ...(context as Record<string, unknown>),
            __metadata__: {
              nodeTimings,
              nodeResults,
              totalNodes: sortedNodes.length,
            },
          },
        },
      });
    });

    for (const node of sortedNodes) {
      if (skippedNodeIds.has(node.id)) continue;

      const executor = getExecutor(node.type as NodeType);
      const nodeStart = Date.now();

      // Mark as RUNNING
      nodeResults[node.id] = { status: "RUNNING" };
      await step.run(`mark-running-${node.id}`, async () => {
        return prisma.execution.update({
          where: { inngestEventId },
          data: {
            output: {
              ...(context as Record<string, unknown>),
              __metadata__: {
                nodeTimings,
                nodeResults,
                totalNodes: sortedNodes.length,
              },
            },
          },
        });
      });

      try {
        context = await executor({
          data: node.data as Record<string, unknown>,
          nodeId: node.id,
          userId,
          context,
          step,
          publish,
        });

        nodeTimings[node.id] = {
          durationMs: Date.now() - nodeStart,
          nodeType: node.type,
          nodeName:
            ((node.data as Record<string, unknown>).variableName as string) ??
            node.type,
        };

        // Mark as SUCCESS
        nodeResults[node.id] = { status: "SUCCESS" };
        await step.run(`mark-success-${node.id}`, async () => {
          return prisma.execution.update({
            where: { inngestEventId },
            data: {
              output: {
                ...(context as Record<string, unknown>),
                __metadata__: {
                  nodeTimings,
                  nodeResults,
                  totalNodes: sortedNodes.length,
                },
              },
            },
          });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        nodeResults[node.id] = { status: "FAILED", error: msg };
        await step.run(`mark-failed-${node.id}`, async () => {
          return prisma.execution.update({
            where: { inngestEventId },
            data: {
              output: {
                ...(context as Record<string, unknown>),
                __metadata__: {
                  nodeTimings,
                  nodeResults,
                  totalNodes: sortedNodes.length,
                },
              },
            },
          });
        });
        throw err;
      }

      const loopMeta = (context as Record<string, unknown>).__loop__ as
        | { items: any[]; itemVariable: string }
        | undefined;

      if (loopMeta) {
        const { items, itemVariable } = loopMeta;

        // Find nodes in the loop body (reachable from LOOP node)
        const bodyNodeIds = connections
          .filter((c) => c.fromNodeId === node.id)
          .map((c) => c.toNodeId);

        const bodyNodes = new Set<string>();
        const queue = [...bodyNodeIds];
        while (queue.length > 0) {
          const id = queue.shift()!;
          if (bodyNodes.has(id)) continue;
          bodyNodes.add(id);
          const children = connections
            .filter((c) => c.fromNodeId === id)
            .map((c) => c.toNodeId);
          queue.push(...children);
        }

        const loopBodyNodes = sortedNodes.filter((n) => bodyNodes.has(n.id));

        // Handle empty array: skip all body nodes
        if (items.length === 0) {
          bodyNodes.forEach((id) => skippedNodeIds.add(id));
          const { __loop__, ...rest } = context as Record<string, unknown>;
          context = rest;
          continue;
        }

        // Iterate over items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          let iterationContext = { ...context, [itemVariable]: item };
          delete (iterationContext as any).__loop__;

          for (const bodyNode of loopBodyNodes) {
            const bodyExecutor = getExecutor(bodyNode.type as NodeType);
            const bodyNodeStart = Date.now();

            // Wrap step to ensure unique execution IDs per iteration
            const iterationId = `loop-${node.id}-iter-${i}`;
            const wrappedStep = {
              ...step,
              run: async (id: string, fn: any) =>
                step.run(`${iterationId}-${id}`, fn),
            } as any;

            iterationContext = await bodyExecutor({
              data: bodyNode.data as Record<string, unknown>,
              nodeId: bodyNode.id,
              userId,
              context: iterationContext,
              step: wrappedStep,
              publish,
            });

            // Track timing for this iteration's body node
            nodeTimings[`${bodyNode.id}-iter-${i}`] = {
              durationMs: Date.now() - bodyNodeStart,
              nodeType: bodyNode.type,
              nodeName:
                ((bodyNode.data as Record<string, unknown>)
                  .variableName as string) ?? bodyNode.type,
            };
          }
        }

        // Skip body nodes in the main flow
        bodyNodes.forEach((id) => skippedNodeIds.add(id));

        // Cleanup
        const { __loop__, ...rest } = context as Record<string, unknown>;
        context = rest;
        continue; // Move to next node outside loop body
      }

      const branchMeta = (context as Record<string, unknown>).__branch__ as
        | { type: string; taken: string; cases?: string[] }
        | undefined;

      if (branchMeta?.type === "if" || branchMeta?.type === "switch") {
        const takenHandle = branchMeta.taken;

        let skippedHandles: string[];
        if (branchMeta.type === "if") {
          skippedHandles = [takenHandle === "true" ? "false" : "true"];
        } else {
          const allHandles = [...(branchMeta.cases ?? []), "default"];
          skippedHandles = allHandles.filter((h) => h !== takenHandle);
        }

        const skippedDirectChildren = connections
          .filter(
            (c) =>
              c.fromNodeId === node.id && skippedHandles.includes(c.fromOutput),
          )
          .map((c) => c.toNodeId);

        const queue = [...skippedDirectChildren];
        while (queue.length > 0) {
          const id = queue.shift()!;
          if (skippedNodeIds.has(id)) continue;
          skippedNodeIds.add(id);
          const children = connections
            .filter((c) => c.fromNodeId === id)
            .map((c) => c.toNodeId);
          queue.push(...children);
        }

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
          output: {
            ...(context as Record<string, unknown>),
            __metadata__: {
              nodeTimings,
              nodeResults,
              totalNodes: sortedNodes.length,
            },
          },
        },
      });
    });

    await step.run("reset-schedule-status", async () => {
      await prisma.scheduledWorkflow.updateMany({
        where: { workflowId, status: "RUNNING" },
        data: { status: "IDLE" },
      });
    });

    return { workflowId, result: context };
  },
);
