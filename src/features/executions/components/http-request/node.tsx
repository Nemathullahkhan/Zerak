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
import { fetchHttpRequestRealtimeToken } from "./actions";
import { HTTP_REQUEST_CHANNEL_NAME } from "@/app/inngest/channels/http-request";
import { HttpRequestFormFields, type HttpRequestFormValues } from "./form-fields";
import { GlobeIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type HttpRequestNodeData = {
  variableName?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: HTTP_REQUEST_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchHttpRequestRealtimeToken,
  });

  // Saves form values back into ReactFlow node data
  const handleSubmit = useCallback(
    (values: HttpRequestFormValues) => {
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
      nodeType: props.type ?? "HTTP_REQUEST",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, execute]);

  const handleOpen = useCallback(() => {
    setActiveNode({
      id: props.id,
      type: props.type ?? "HTTP_REQUEST",
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, setActiveNode]);

  const description = props.data?.endpoint
    ? `${props.data.method || "GET"} ${props.data.endpoint.length > 30 ? props.data.endpoint.slice(0, 30) + "…" : props.data.endpoint}`
    : "Not configured";

  return (
    <>
      {portal(
        <NodeFormShell
          iconEmoji="🌐"
          title="HTTP Request"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <HttpRequestFormFields
            onSubmit={handleSubmit}
            defaultValues={props.data}
            showSave={true}
          />
        </NodeFormShell>,
      )}

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GlobeIcon}
        name="HTTP Request"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />
    </>
  );
});

HttpRequestNode.displayName = "HttpRequestNode";
