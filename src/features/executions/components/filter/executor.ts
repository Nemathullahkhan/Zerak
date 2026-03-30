import { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { filterChannel } from "@/app/inngest/channels/filter";
import { resolveContextPath } from "@/lib/resolve-context-path";

type FilterNodeData = {
  variableName?: string;
  sourceVariable?: string;
  condition?: string;
};

// Safe evaluation of condition (similar to IF node)
function evaluateCondition(
  condition: string,
  item: any,
  context: any,
): boolean {
  // Use Function constructor with isolated scope
  const fn = new Function("item", "context", `return ${condition}`);
  return fn(item, context);
}

export const filterExecutor: NodeExecutor<FilterNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(filterChannel().status({ nodeId, status: "loading" }));

  if (!data.sourceVariable || !data.variableName || !data.condition) {
    await publish(filterChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "FILTER: missing sourceVariable, variableName, or condition",
    );
  }

  try {
    const result = await step.run("filter-execution", async () => {
      const sourceArray = resolveContextPath(
        context as Record<string, unknown>,
        data.sourceVariable!,
      );
      if (!Array.isArray(sourceArray)) {
        throw new NonRetriableError(
          `FILTER: source '${data.sourceVariable}' is not an array`,
        );
      }

      const filtered = sourceArray.filter((item) =>
        evaluateCondition(data.condition!, item, context),
      );

      return {
        ...context,
        [data.variableName!]: filtered,
      };
    });

    await publish(filterChannel().status({ nodeId, status: "success" }));
    return result;
  } catch (error) {
    await publish(filterChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
