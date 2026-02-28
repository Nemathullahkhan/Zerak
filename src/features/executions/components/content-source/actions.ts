"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { contentSourceChannel } from "@/app/inngest/channels/content-source";

export type ContentSourceToken = Realtime.Token<
  typeof contentSourceChannel,
  ["status"]
>;

export async function fetchContentSourceRealtimeToken(): Promise<ContentSourceToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: contentSourceChannel(),
    topics: ["status"],
  });

  return token;
}
