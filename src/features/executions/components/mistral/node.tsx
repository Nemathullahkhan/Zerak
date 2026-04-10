"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { MISTRAL_AVAILABLE_MODELS, MistralDialog, MistralFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { MISTRAL_CHANNEL_NAME } from "@/app/inngest/channels/mistral";
import { fetchMistralRealtimeToken } from "./actions";

type MistralNodeData = {
  variableName?: string;
  credentialId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

type MistralNodeType = Node<MistralNodeData>;

export const MistralNode = memo((props: NodeProps<MistralNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: MISTRAL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchMistralRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };

  const handleSubmit = (values: MistralFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      }),
    );
  };

  const nodeData = props.data;
  const description = nodeData?.userPrompt
    ? `${nodeData.model || MISTRAL_AVAILABLE_MODELS[0]} : ${nodeData.userPrompt.slice(0, 40)}...`
    : "Not configured";

  return (
    <>
      <MistralDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={"/logos/mistral.svg"}
        name="Mistral"
        description={description}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

MistralNode.displayName = "MistralNode";
