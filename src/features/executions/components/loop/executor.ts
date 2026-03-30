import { NodeExecutor } from "@/features/executions/types";
import { NonRetriableError } from "inngest";
import { loopChannel } from "@/app/inngest/channels/loop";
import { resolveContextPath } from "@/lib/resolve-context-path";

type LoopNodeData = {
  variableName?: string;
  sourceVariable?: string;
  itemVariable?: string;
  execution?: "sequential" | "parallel";
};

export const loopExecutor: NodeExecutor<LoopNodeData> = async ({
  data,
  nodeId,
  context,
  publish,
}) => {
  await publish(loopChannel().status({ nodeId, status: "loading" }));

  if (!data.sourceVariable || !data.variableName) {
    await publish(loopChannel().status({ nodeId, status: "error" }));
    throw new NonRetriableError(
      "LOOP: missing sourceVariable or variableName",
    );
  }

  try {
    const sourceArray = resolveContextPath(
      context as Record<string, unknown>,
      data.sourceVariable,
    );
    if (!Array.isArray(sourceArray)) {
      throw new NonRetriableError(
        `LOOP: source '${data.sourceVariable}' is not an array`,
      );
    }

    await publish(loopChannel().status({ nodeId, status: "success" }));

    return {
      ...context,
      [data.variableName]: sourceArray,
      __loop__: {
        items: sourceArray,
        itemVariable: data.itemVariable || "item",
        execution: data.execution || "sequential",
      },
    };
  } catch (error) {
    await publish(loopChannel().status({ nodeId, status: "error" }));
    throw error;
  }
};
