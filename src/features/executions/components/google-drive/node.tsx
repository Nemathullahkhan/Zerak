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
import { fetchGoogleDriveRealtimeToken } from "./actions";
import { GOOGLE_DRIVE_CHANNEL_NAME } from "@/app/inngest/channels/google-drive";
import { GoogleDriveFormFields, type GoogleDriveFormValues } from "./dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

type GoogleDriveNodeData = {
  variableName?: string;
  fileId?: string;
  action?: "read" | "search";
  searchQuery?: string;
};

type GoogleDriveNodeType = Node<GoogleDriveNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const GoogleDriveNode = memo((props: NodeProps<GoogleDriveNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GOOGLE_DRIVE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGoogleDriveRealtimeToken,
  });

  // Saves form values back into ReactFlow node data
  const handleSubmit = useCallback(
    (values: GoogleDriveFormValues) => {
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
    });
  }, [props.id, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "GOOGLE_DRIVE",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, setActiveNode]);

  const actionLabel: Record<string, string> = {
    read: "Read",
    search: "Search",
  };

  const description = props.data?.action
    ? `${actionLabel[props.data.action]} - ${props.data.fileId || props.data.searchQuery || "Not configured"}`
    : "Not configured";

  return (
    <>
      {portal(
        <NodeFormShell
          icon="/logos/google-drive.svg"
          title="Google Drive"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <GoogleDriveFormFields
            onSubmit={handleSubmit}
            defaultValues={props.data}
            showSave={true}
          />
        </NodeFormShell>,
      )}

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon="/logos/google-drive.svg"
        name="Google Drive"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

GoogleDriveNode.displayName = "GoogleDriveNode";
