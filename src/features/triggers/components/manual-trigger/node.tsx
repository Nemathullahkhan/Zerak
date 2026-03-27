import { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { MousePointerIcon } from "lucide-react";
import { ManualTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { MANUAL_TRIGGER_CHANNEL_NAME } from "@/app/inngest/channels/manual-trigger";
import { fetchManualTriggerRealtimeToken } from "./actions";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export const ManualTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const trpc = useTRPC();
  const workflowId = (props.data as any).workflowId;
  const { data: schedule } = useQuery({
    ...trpc.schedules.get.queryOptions({ workflowId }),
    enabled: !!workflowId,
  });

  const nodestatus = useNodeStatus({
    nodeId: props.id,
    channel: MANUAL_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchManualTriggerRealtimeToken,
  });

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };
  return (
    <>
      <ManualTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {schedule?.isActive && (
        <div className="absolute -top-2 -right-2 z-10 bg-purple-600 text-purple-100 text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-purple-400/50">
          ↻ scheduled
        </div>
      )}
      <BaseTriggerNode
        {...props}
        icon={MousePointerIcon}
        name="When clicking 'Execute workflow'"
        status={nodestatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ManualTriggerNode.displayName = "ManualTriggerNode";
