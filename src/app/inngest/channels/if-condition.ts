import { Inngest } from "inngest";
import { channel, topic } from "@inngest/realtime";

export const IF_CONDITION_CHANNEL_NAME = "if-condition-execution";

export const ifConditionChannel = channel(IF_CONDITION_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
/**
 * TODO: FIX TS ERROR - Property 'type' does not exist on type 'Definition<() => "if-condition-execution", Record<string, Definition<string, any, any>>>'.
 *
 * **/
