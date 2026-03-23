"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { CODE_CHANNEL_NAME } from "@/app/inngest/channels/code";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { useSetAtom } from "jotai";
import { Code2 } from "lucide-react";
import { memo, useCallback } from "react";
import { useParams } from "next/navigation";
import { fetchCodeRealtimeToken } from "./actions";
import { CodeFormFields, type CodeFormValues } from "./form-fields";

// ─── Types ────────────────────────────────────────────────────────────────────

type CodeNodeData = {
  variableName?: string;
  code?: string;
};

type CodeNodeType = Node<CodeNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const CodeNode = memo((props: NodeProps<CodeNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();
  const params = useParams();
  const workflowId = params.workflowId as string;

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: CODE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchCodeRealtimeToken,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (values: CodeFormValues) => {
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
    execute({ nodeId: props.id });
  }, [props.id, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "CODE",
      workflowId,
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, workflowId, setActiveNode]);

  const description = props.data?.variableName
    ? `return → ${props.data.variableName}`
    : "Not configured";

  const defaultValues: CodeFormValues = {
    variableName: props.data?.variableName ?? "result",
    code: props.data?.code ?? "",
  };

  return (
    <>
      {portal(
        <NodeFormShell
          iconEmoji="</>"
          title="Code"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <CodeFormFields
            onSubmit={handleSubmit}
            defaultValues={defaultValues}
          />
        </NodeFormShell>,
      )}

      <Handle type="target" position={Position.Left} id="input" />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={Code2}
        name="Code"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />

      <Handle type="source" position={Position.Right} id="source-1" />
    </>
  );
});

CodeNode.displayName = "CodeNode";
