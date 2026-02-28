"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { geminiChannel } from "@/app/inngest/channels/gemini";

export type GeminiToken = Realtime.Token<typeof geminiChannel, ["status"]>;

export async function fetchGeminiRealtimeToken(): Promise<GeminiToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: geminiChannel(),
    topics: ["status"],
  });

  return token;
}
