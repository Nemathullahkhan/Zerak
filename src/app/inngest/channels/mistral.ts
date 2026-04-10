import { channel, topic } from "@inngest/realtime";

export const MISTRAL_CHANNEL_NAME = "mistral-execution";
export const mistralChannel = channel(MISTRAL_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>(),
);
