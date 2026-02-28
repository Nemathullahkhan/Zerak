"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { Node, NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { ContentSourceDialog, ContentSourceFormValues } from "./dialog";
import { useNodeStatus } from "../../hooks/use-node-status";
import { CONTENT_SOURCE_CHANNEL_NAME } from "@/app/inngest/channels/content-source";
import { fetchContentSourceRealtimeToken } from "./actions";
import { VideoIcon } from "lucide-react";

type ContentSourceNodeData = {
  variableName?: string;
  url?: string;
};

type ContentSourceNodeType = Node<ContentSourceNodeData>;

export const ContentSourceNode = memo(
  (props: NodeProps<ContentSourceNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: CONTENT_SOURCE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchContentSourceRealtimeToken,
    });

    const handleOpenSettings = () => {
      setDialogOpen(true);
    };

    const handleSubmit = (values: ContentSourceFormValues) => {
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
    const description = nodeData?.url
      ? nodeData.url.slice(0, 50) + (nodeData.url.length > 50 ? "..." : "")
      : "Not configured";

    return (
      <>
        <ContentSourceDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseExecutionNode
          {...props}
          id={props.id}
          icon={VideoIcon}
          name="YouTube Transcript"
          description={description}
          status={nodeStatus}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

ContentSourceNode.displayName = "ContentSourceNode";
