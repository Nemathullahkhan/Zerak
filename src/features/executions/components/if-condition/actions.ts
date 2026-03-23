"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { ifConditionChannel } from "@/app/inngest/channels/if-condition";
import { inngest } from "@/app/inngest/client";

export type IfConditionRequestToken = Realtime.Token<
  typeof ifConditionChannel,
  ["status"]
>;

export async function fetchIfConditionRealtimeToken() {
  const token = await getSubscriptionToken(inngest, {
    channel: ifConditionChannel(),
    topics: ["status"],
  });

  return token;
}
