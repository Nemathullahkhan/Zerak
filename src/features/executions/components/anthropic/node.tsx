"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { useSetAtom } from "jotai";
import { memo, useCallback } from "react";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchAnthropicRealtimeToken } from "./actions";
import { Anthropic_CHANNEL_NAME } from "@/app/inngest/channels/anthropic";
import { AnthropicFormFields, type AnthropicFormValues, ANTHROPIC_AVAILABLE_MODELS } from "./form-fields";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnthropicNodeData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type AnthropicNodeType = Node<AnthropicNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const AnthropicNode = memo((props: NodeProps<AnthropicNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: Anthropic_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAnthropicRealtimeToken,
  });

  // Saves form values back into ReactFlow node data
  const handleSubmit = useCallback(
    (values: AnthropicFormValues) => {
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

  // Executes the node directly using current node data
  const handleRun = useCallback(() => {
    execute({
      nodeId: props.id,
      nodeType: props.type ?? "ANTHROPIC",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "ANTHROPIC",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, setActiveNode]);

  const description = props.data?.userPrompt
    ? `${props.data.model || ANTHROPIC_AVAILABLE_MODELS[0]} : ${props.data.userPrompt.length > 30 ? props.data.userPrompt.slice(0, 30) + "…" : props.data.userPrompt}`
    : "Not configured";

  return (
    <>
      {portal(
        <NodeFormShell
          icon="/logos/anthropic.svg"
          title="Anthropic"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <AnthropicFormFields
            onSubmit={handleSubmit}
            defaultValues={props.data}
            showSave={true}
          />
        </NodeFormShell>,
      )}

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/anthropic.svg"
        name="Anthropic"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

AnthropicNode.displayName = "AnthropicNode";
