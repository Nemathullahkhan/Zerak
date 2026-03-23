"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { codeChannel } from "@/app/inngest/channels/code";
import { inngest } from "@/app/inngest/client";

export type CodeRealtimeToken = Realtime.Token<
  typeof codeChannel,
  ["status"]
>;

export async function fetchCodeRealtimeToken(): Promise<CodeRealtimeToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: codeChannel(),
    topics: ["status"],
  });
  return token;
}
