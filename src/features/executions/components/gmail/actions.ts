"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { gmailChannel } from "@/app/inngest/channels/gmail";

export type GmailToken = Realtime.Token<typeof gmailChannel, ["status"]>;

export async function fetchGmailRealtimeToken(): Promise<GmailToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: gmailChannel(),
    topics: ["status"],
  });

  return token;
}
