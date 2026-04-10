"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { mistralChannel } from "@/app/inngest/channels/mistral";

export type MistralToken = Realtime.Token<typeof mistralChannel, ["status"]>;

export async function fetchMistralRealtimeToken(): Promise<MistralToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: mistralChannel(),
    topics: ["status"],
  });

  return token;
}
