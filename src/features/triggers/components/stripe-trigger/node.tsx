import { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { GoogleFormTriggerDialog, StripeTriggerDialog } from "./dialog";
import { GOOGLE_FORM_TRIGGER_CHANNEL_NAME } from "@/app/inngest/channels/google-form-trigger";
import { fetchGoogleFormTriggerRealtimeToken } from "./actions";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

export const StripeTriggerNode = memo((props: NodeProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  // const nodeStatus = useNodeStatus({
  //   nodeId: props.id,
  //   channel: GOOGLE_FORM_TRIGGER_CHANNEL_NAME,
  //   topic: "status",
  //   refreshToken: fetchGoogleFormTriggerRealtimeToken,
  // });

  const nodeStatus = "initial";

  const handleOpenSettings = () => {
    setDialogOpen(true);
  };
  return (
    <>
      <StripeTriggerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <BaseTriggerNode
        {...props}
        icon={"/logos/stripe.svg"}
        name="Stripe"
        description="When stripe event is captured"
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

StripeTriggerNode.displayName = "StripeTriggerNode";
