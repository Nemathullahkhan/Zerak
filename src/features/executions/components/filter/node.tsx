import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchFilterRealtimeToken } from "./actions";
import { FILTER_CHANNEL_NAME } from "@/app/inngest/channels/filter";
import { FilterFormFields, type FilterFormValues } from "./form-fields";

type FilterNodeData = {
  variableName?: string;
  sourceVariable?: string;
  condition?: string;
};

type FilterNodeType = Node<FilterNodeData>;

export const FilterNode = memo((props: NodeProps<FilterNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: FILTER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchFilterRealtimeToken,
  });

  const handleSubmit = useCallback(
    (values: FilterFormValues) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === props.id
            ? { ...node, data: { ...node.data, ...values } }
            : node,
        ),
      );
    },
    [props.id, setNodes],
  );

  const handleRun = useCallback(() => {
    execute({
      nodeId: props.id,
      nodeType: props.type ?? "FILTER",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "FILTER",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, setActiveNode]);

  const description = props.data?.sourceVariable
    ? `filter: ${props.data.sourceVariable} → ${props.data.variableName}`
    : "Not configured";

  return (
    <>
      {portal(
        <NodeFormShell onRun={handleRun} isRunning={isRunning} error={error}>
          <FilterFormFields
            onSubmit={handleSubmit}
            defaultValues={props.data}
            showSave={true}
          />
        </NodeFormShell>,
      )}
      <BaseExecutionNode
        {...props}
        icon="/logos/filter.svg" // You can reuse code icon or create a new one
        name="Filter"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

FilterNode.displayName = "FilterNode";
