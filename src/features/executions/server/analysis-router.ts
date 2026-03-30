import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { prisma } from "@/lib/db";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import z from "zod";
import { ExecutionStatus, NodeType } from "@/generated/prisma/client";

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
  "claude-3-haiku": { input: 0.00025, output: 0.00125 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
  "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
};

interface SuggestionItem {
  nodeVariableName: string;
  title: string;
  body: string;
  savingLabel: string;
  priority: "high" | "medium" | "info";
  type: "model_swap" | "prompt_optimization" | "architecture";
  actionField?: string;
  actionValue?: string;
}

export const analysisRouter = createTRPCRouter({
  analyzeWorkflow: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { workflowId } = input;

      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          executions: {
            where: { status: ExecutionStatus.SUCCESS },
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      });

      if (workflow.userId !== ctx.auth.user.id) {
        throw new Error("Unauthorized");
      }

      const execution = workflow.executions[0];
      if (!execution) {
        return null; // Handle in UI: "Run the workflow first to see analysis"
      }

      const output = execution.output as any;
      const metadata = output?.__metadata__;

      let nodeTimings: Record<
        string,
        { durationMs: number; nodeType: string; nodeName: string }
      > = {};

      if (metadata?.nodeTimings) {
        nodeTimings = metadata.nodeTimings;
      } else {
        // Fallback for old executions
        workflow.nodes.forEach((node) => {
          const isAI =
            node.type === NodeType.ANTHROPIC ||
            node.type === NodeType.OPENAI ||
            node.type === NodeType.GEMINI;
          nodeTimings[node.id] = {
            durationMs: isAI ? 3000 : 500,
            nodeType: node.type,
            nodeName: (node.data as any).variableName || node.type,
          };
        });
      }

      // Performance
      const totalMs = Object.values(nodeTimings).reduce(
        (sum, t) => sum + t.durationMs,
        0,
      );
      let bottleneckNodeId = "";
      let maxMs = -1;

      const performanceNodes = Object.entries(nodeTimings).map(
        ([nodeId, timing]) => {
          if (timing.durationMs > maxMs) {
            maxMs = timing.durationMs;
            bottleneckNodeId = nodeId;
          }
          return {
            nodeId,
            nodeName: timing.nodeName,
            nodeType: timing.nodeType,
            durationMs: timing.durationMs,
            percentOfTotal:
              totalMs > 0 ? (timing.durationMs / totalMs) * 100 : 0,
          };
        },
      );

      // Cost
      let totalCost = 0;
      const aiNodesAnalysis = workflow.nodes
        .filter(
          (n) =>
            n.type === NodeType.ANTHROPIC ||
            n.type === NodeType.OPENAI ||
            n.type === NodeType.GEMINI,
        )
        .map((node) => {
          const data = node.data as any;
          const model = data.model || "";
          const variableName = data.variableName || "";

          // Check for real usage in context output
          const nodeOutput = output[variableName];
          const realUsage = nodeOutput?.__usage__;

          let inputTokens: number;
          let outputTokens: number;
          let isEstimate = false;

          if (realUsage) {
            inputTokens = realUsage.promptTokens || realUsage.inputTokens || 0;
            outputTokens =
              realUsage.completionTokens || realUsage.outputTokens || 0;
          } else {
            // Fallback estimate
            isEstimate = true;
            const systemPrompt = data.systemPrompt || "";
            const userPrompt = data.userPrompt || "";
            inputTokens = Math.ceil(
              (systemPrompt.length + userPrompt.length) / 4,
            );
            outputTokens = 500;
          }

          const rate = COST_PER_1K_TOKENS[model] || { input: 0, output: 0 };
          const cost =
            (inputTokens / 1000) * rate.input +
            (outputTokens / 1000) * rate.output;

          totalCost += cost;

          return {
            nodeId: node.id,
            nodeName: variableName || node.type,
            model,
            inputTokensEst: inputTokens,
            outputTokensEst: outputTokens,
            costPerRun: cost,
            isEstimate,
          };
        });

      // Enhancement
      const aiNodeSummaries = aiNodesAnalysis.map((n) => {
        const node = workflow.nodes.find((node) => node.id === n.nodeId);
        const data = node?.data as any;
        return {
          nodeType: node?.type,
          model: n.model,
          systemPrompt: data.systemPrompt,
          userPrompt: data.userPrompt,
          variableName: n.nodeName,
          actualUsage: {
            inputTokens: n.inputTokensEst,
            outputTokens: n.outputTokensEst,
          },
        };
      });

      let enhancementSuggestions: SuggestionItem[] = [];

      if (aiNodeSummaries.length > 0) {
        try {
          const anthropic = createAnthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
          });

          const { text } = await generateText({
            model: anthropic("claude-sonnet-4-6"),
            system: `You are a workflow optimization expert. Analyze the AI nodes in this workflow and return ONLY a raw JSON array of suggestions. No markdown, no explanation.

Each suggestion must have:
- nodeVariableName: string (the variableName of the node being improved)
- title: string (short, actionable — e.g. "Switch to a cheaper model")
- body: string (1-2 sentences explaining why)
- savingLabel: string (e.g. "~75% cost reduction" or "~3s faster" or "Reduces output tokens by 60%")
- priority: "high" | "medium" | "info"
- type: "model_swap" | "prompt_optimization" | "architecture"
- actionField: string (exactly which field in the node data should be updated, e.g. "model", "userPrompt", "systemPrompt")
- actionValue: string (the exact new value that this field should be updated to)

Focus on: (1) model downgrades where the task doesn't need a powerful model, (2) prompt verbosity — suggest adding "respond only with JSON, no preamble" style constraints where appropriate. Use the actual token usage provided to ground your recommendations.

Return a JSON array [] — nothing else.`,
            prompt: JSON.stringify(aiNodeSummaries, null, 2),
          });

          let jsonText = text.trim();
          // Remove potential markdown code blocks
          if (jsonText.startsWith("```")) {
            jsonText = jsonText
              .replace(/^```(json)?\n?/, "")
              .replace(/\n?```$/, "");
          }

          try {
            enhancementSuggestions = JSON.parse(jsonText);
          } catch (parseError) {
            console.error(
              "Failed to parse AI suggestions:",
              parseError,
              jsonText,
            );
            enhancementSuggestions = [];
          }
        } catch (error) {
          console.error("Enhancement analysis failed:", error);
          enhancementSuggestions = [];
        }
      }

      return {
        performance: {
          totalMs,
          bottleneckNodeId,
          nodes: performanceNodes,
        },
        cost: {
          perRunCost: totalCost,
          aiNodes: aiNodesAnalysis,
        },
        enhancement: enhancementSuggestions,
        executionId: execution.id,
        ranAt: execution.startedAt.toISOString(),
      };
    }),
});
