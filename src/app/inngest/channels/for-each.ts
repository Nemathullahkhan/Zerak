import { channel, topic } from "@inngest/realtime";

export const FOR_EACH_CHANNEL_NAME = "for-each-execution";

export const forEachChannel = channel(FOR_EACH_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
