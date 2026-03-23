import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { NodeExecutor } from "@/features/executions/types";
import { switchChannel } from "@/app/inngest/channels/switch";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

// ─── Types ────────────────────────────────────────────────────────────────────

type SwitchCase = {
  label: string;   // handle id used for routing (e.g. "case-1")
  value: string;   // value to match against resolved inputExpression
};

type SwitchNodeData = {
  variableName?: string;
  inputExpression?: string;
  cases?: SwitchCase[];
};

// ─── Executor ─────────────────────────────────────────────────────────────────

export const switchExecutor: NodeExecutor<SwitchNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(switchChannel().status({ nodeId, status: "loading" }));

  try {
    const result = await step.run("switch-condition", async () => {
      if (!data.variableName) {
        await publish(switchChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("SWITCH node: variableName is required");
      }
      if (!data.inputExpression) {
        await publish(switchChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("SWITCH node: inputExpression is required");
      }

      const cases: SwitchCase[] = data.cases ?? [];

      // Resolve the input expression against the execution context
      const resolved = Handlebars.compile(data.inputExpression)(context);

      // Find the first case whose value matches the resolved expression
      const matchedCase = cases.find((c) => c.value === resolved.trim());
      const takenHandle = matchedCase ? matchedCase.label : "default";

      const output = {
        inputExpression: data.inputExpression,
        resolved,
        taken: takenHandle,
        matched: matchedCase?.value ?? null,
      };

      return {
        ...context,
        [data.variableName]: output,
        // Signal the workflow execution loop about the branch taken
        __branch__: { type: "switch", taken: takenHandle, cases: cases.map((c) => c.label) },
      };
    });

    await publish(switchChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(switchChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
