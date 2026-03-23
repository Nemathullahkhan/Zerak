"use client";

import { BaseExecutionNode } from "@/features/executions/components/base-execution-node";
import { NodeFormShell } from "@/features/editor/components/node-form-shell";
import { useNodeFormPortal } from "@/features/editor/hooks/use-node-form-portal";
import { activeNodeAtom } from "@/features/editor/store/node-execution-atoms";
import { useExecuteNode } from "@/features/executions/hooks/use-execute-node";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { SWITCH_CHANNEL_NAME } from "@/app/inngest/channels/switch";
import {
  Handle,
  Position,
  type Node,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import { useSetAtom } from "jotai";
import { GitMerge } from "lucide-react";
import { memo, useCallback } from "react";
import { useParams } from "next/navigation";
import { fetchSwitchRealtimeToken } from "./actions";
import { SwitchFormFields, type SwitchFormValues } from "./form-fields";

// ─── Types ────────────────────────────────────────────────────────────────────

type SwitchCase = {
  label: string;
  value: string;
};

type SwitchNodeData = {
  variableName?: string;
  inputExpression?: string;
  cases?: SwitchCase[];
};

type SwitchNodeType = Node<SwitchNodeData>;

// ─── Component ────────────────────────────────────────────────────────────────

export const SwitchNode = memo((props: NodeProps<SwitchNodeType>) => {
  const setActiveNode = useSetAtom(activeNodeAtom);
  const { setNodes } = useReactFlow();
  const { portal } = useNodeFormPortal(props.id);
  const { execute, isRunning, error } = useExecuteNode();
  const params = useParams();
  const workflowId = params.workflowId as string;

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SWITCH_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSwitchRealtimeToken,
  });

  const cases: SwitchCase[] = props.data?.cases ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    (values: SwitchFormValues) => {
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
      type: props.type ?? "SWITCH",
      workflowId,
      data: props.data as Record<string, unknown>,
    });
  }, [props.id, props.type, props.data, workflowId, setActiveNode]);

  const description = props.data?.inputExpression
    ? `Switch on ${props.data.inputExpression.length > 24 ? props.data.inputExpression.slice(0, 24) + "…" : props.data.inputExpression}`
    : "Not configured";

  const defaultValues: SwitchFormValues = {
    variableName: props.data?.variableName ?? "switchResult",
    inputExpression: props.data?.inputExpression ?? "",
    cases: cases.length > 0 ? cases : [{ label: "case-1", value: "" }],
  };

  return (
    <>
      {portal(
        <NodeFormShell
          iconEmoji="🔀"
          title="Switch"
          isRunning={isRunning}
          onRun={handleRun}
          error={error}
        >
          <SwitchFormFields
            onSubmit={handleSubmit}
            defaultValues={defaultValues}
          />
        </NodeFormShell>,
      )}

      <Handle type="target" position={Position.Left} id="input" />

      <BaseExecutionNode
        {...props}
        id={props.id}
        icon={GitMerge}
        name="Switch"
        description={description}
        status={nodeStatus}
        onSettings={handleOpen}
        onDoubleClick={handleOpen}
      />

      {/* Dynamic case output handles */}
      {cases.map((c, i) => {
        const totalHandles = cases.length + 1; // +1 for default
        const spacing = 100 / (totalHandles + 1);
        const topPercent = spacing * (i + 1);
        return (
          <div
            key={c.label}
            className="absolute right-0 flex translate-x-full items-center gap-1.5"
            style={{ top: `calc(${topPercent}% - 8px)` }}
          >
            <span className="whitespace-nowrap rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {c.label || `case-${i + 1}`}
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id={c.label || `case-${i + 1}`}
              className="!relative !right-auto !top-auto !translate-y-0"
            />
          </div>
        );
      })}

      {/* Default handle — always present */}
      <div
        className="absolute right-0 flex translate-x-full items-center gap-1.5"
        style={{ top: `calc(${(100 / (cases.length + 2)) * (cases.length + 1)}% - 8px)` }}
      >
        <span className="whitespace-nowrap rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[7px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 ml-4">
          default
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="default"
          className="!relative !right-auto !top-auto !translate-y-0"
        />
      </div>
    </>
  );
});

SwitchNode.displayName = "SwitchNode";
