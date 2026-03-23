"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IF_CONDITION_CHANNEL_NAME } from "@/app/inngest/channels/if-condition";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { useSetAtom } from "jotai";
import { GitBranch } from "lucide-react";
import { memo, useCallback } from "react";
import { useParams } from "next/navigation";
import { fetchIfConditionRealtimeToken } from "./actions";
import { IfFormFields, type IfFormValues } from "./form-fields";

// ─── Types ────────────────────────────────────────────────────────────────────

type IfNodeData = {
  variableName?: string;
  condition?: string;
  trueLabel?: string;
  falseLabel?: string;
};

type IfNodeType = Node<IfNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const IfConditionNode = memo((props: NodeProps<IfNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();
  const params = useParams();
  const workflowId = params.workflowId as string;

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IF_CONDITION_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchIfConditionRealtimeToken,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (values: IfFormValues) => {
      console.log("Clicked here on save button");
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
      type: props.type ?? "IF",
      workflowId,
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, workflowId, setActiveNode]);

  const description = props.data?.condition
    ? props.data.condition.length > 30
      ? props.data.condition.slice(0, 30) + "…"
      : props.data.condition
    : "Not configured";

  return (
    <>
      {portal(
        <NodeFormShell
          iconEmoji=" - "
          title="If condition"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <IfFormFields
            onSubmit={handleSubmit}
            defaultValues={{
              variableName: props.data?.variableName ?? "condition",
              condition: props.data?.condition ?? "",
              trueLabel: props.data?.trueLabel ?? "",
              falseLabel: props.data?.falseLabel ?? "",
            }}
          />
        </NodeFormShell>,
      )}

      <Handle type="target" position={Position.Left} id="input" />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GitBranch}
        name="If condition"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />

      {/* True branch — top-right handle with green pill */}
      <div
        className="absolute right-0 flex translate-x-full items-center gap-1.5"
        style={{ top: "calc(35% - 8px)" }}
      >
        <span className="whitespace-nowrap rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          true
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="!relative !right-auto !top-auto !translate-y-0"
        />
      </div>

      {/* False branch — bottom-right handle with red pill */}
      <div
        className="absolute right-0 flex translate-x-full items-center gap-1.5"
        style={{ top: "calc(65% - 8px)" }}
      >
        <span className="whitespace-nowrap rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          false
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="!relative !right-auto !top-auto !translate-y-0"
        />
      </div>
    </>
  );
});

IfConditionNode.displayName = "IfConditionNode";
