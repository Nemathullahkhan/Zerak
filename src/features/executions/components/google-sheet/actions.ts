"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { googleSheetsChannel } from "@/app/inngest/channels/google-sheets";

export type GoogleSheetsToken = Realtime.Token<
  typeof googleSheetsChannel,
  ["status"]
>;

export async function fetchGoogleSheetsRealtimeToken(): Promise<GoogleSheetsToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleSheetsChannel(),
    topics: ["status"],
  });

  return token;
}
