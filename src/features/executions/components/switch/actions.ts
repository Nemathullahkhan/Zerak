"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { switchChannel } from "@/app/inngest/channels/switch";
import { inngest } from "@/app/inngest/client";

export type SwitchRealtimeToken = Realtime.Token<
  typeof switchChannel,
  ["status"]
>;

export async function fetchSwitchRealtimeToken(): Promise<SwitchRealtimeToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: switchChannel(),
    topics: ["status"],
  });
  return token;
}
