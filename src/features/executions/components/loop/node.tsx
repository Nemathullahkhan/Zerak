import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchLoopRealtimeToken } from "./actions";
import { LOOP_CHANNEL_NAME } from "@/app/inngest/channels/loop";
import { LoopFormFields, type LoopFormValues } from "./form-fields";

type LoopNodeData = {
  variableName?: string;
  sourceVariable?: string;
  itemVariable?: string;
  body?: string;
  execution?: "sequential" | "parallel";
};

type LoopNodeType = Node<LoopNodeData>;

export const LoopNode = memo((props: NodeProps<LoopNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: LOOP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchLoopRealtimeToken,
  });

  const handleSubmit = useCallback(
    (values: LoopFormValues) => {
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
      nodeType: props.type ?? "LOOP",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "LOOP",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, setActiveNode]);

  const description = props.data?.sourceVariable
    ? `loop over ${props.data.sourceVariable} → ${props.data.variableName} (${props.data.execution || "sequential"})`
    : "Not configured";

  return (
    <>
      {portal(
        <NodeFormShell onRun={handleRun} isRunning={isRunning} error={error}>
          <LoopFormFields
            onSubmit={handleSubmit}
            defaultValues={props.data}
            showSave={true}
          />
        </NodeFormShell>,
      )}

      <BaseExecutionNode
        {...props}
        icon="/logos/loop.svg" // You can replace with a proper icon
        name="Loop"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

LoopNode.displayName = "LoopNode";
