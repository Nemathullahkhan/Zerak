import { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { codeChannel } from "@/app/inngest/channels/code";
import vm from "vm";

// ─── Types ────────────────────────────────────────────────────────────────────

type CodeNodeData = {
  variableName?: string;
  code?: string;
};

// ─── Executor ─────────────────────────────────────────────────────────────────

export const codeExecutor: NodeExecutor<CodeNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(codeChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("code-execution", async () => {
      if (!data.variableName) {
        await publish(codeChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("CODE node: variableName is required");
      }
      if (!data.code?.trim()) {
        await publish(codeChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("CODE node: code is required");
      }

      // Wrap user code in an IIFE so `return` works at the top level
      const wrappedCode = `(function(context) { ${data.code} })(context)`;

      let output: unknown;
      try {
        const sandbox = {
          context: JSON.parse(JSON.stringify(context)), // deep clone — no mutation
          console,
          JSON,
          Math,
          Array,
          Object,
          String,
          Number,
          Boolean,
          Date,
        };
        output = vm.runInNewContext(wrappedCode, sandbox, {
          timeout: 5000, // 5 second hard limit
          filename: `zerak-code-node-${nodeId}`,
        });
      } catch (err) {
        await publish(codeChannel().status({ nodeId, status: "error" }));
        const msg = err instanceof Error ? err.message : String(err);
        throw new NonRetriableError(`CODE node runtime error: ${msg}`);
      }

      return {
        ...context,
        [data.variableName]: output,
      };
    });

    await publish(codeChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(codeChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
