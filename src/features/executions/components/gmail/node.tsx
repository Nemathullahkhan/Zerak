"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { GmailFormValues, GmailDialog } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { fetchGmailRealtimeToken } from "./actions";
import { GMAIL_CHANNEL_NAME } from "@/app/inngest/channels/gmail";

// ─── Types ────────────────────────────────────────────────────────────────────

type GmailNodeData = {
  variableName?: string;
  to?: string;
  subject?: string;
  body?: string;
};

type GmailNodeType = Node<GmailNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GMAIL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGmailRealtimeToken,
  });

  const handleSubmit = (values: GmailFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === props.id
          ? { ...node, data: { ...node.data, ...values } }
          : node,
      ),
    );
  };

  const nodeData = props.data;

  // Build a readable description for the canvas card
  const description = nodeData?.to
    ? `To: ${nodeData.to.length > 30 ? nodeData.to.slice(0, 30) + "…" : nodeData.to}`
    : "Not configured";

  return (
    <>
      <GmailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/gmail.svg"
        name="Gmail"
        description={description}
        status={nodeStatus}
        onSettings={() => setDialogOpen(true)}
        onDoubleClick={() => setDialogOpen(true)}
      />
    </>
  );
});

GmailNode.displayName = "GmailNode";
