"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { loopChannel } from "@/app/inngest/channels/loop";

export type LoopToken = Realtime.Token<typeof loopChannel, ["status"]>;

export async function fetchLoopRealtimeToken(): Promise<LoopToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: loopChannel(),
    topics: ["status"],
  });

  return token;
}
