import { channel, topic } from "@inngest/realtime";

export const CONTENT_SOURCE_CHANNEL_NAME = "content-source-execution";
export const contentSourceChannel = channel(CONTENT_SOURCE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
