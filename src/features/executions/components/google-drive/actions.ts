"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { googleDriveChannel } from "@/app/inngest/channels/google-drive";

export type GoogleDriveToken = Realtime.Token<
  typeof googleDriveChannel,
  ["status"]
>;

export async function fetchGoogleDriveRealtimeToken(): Promise<GoogleDriveToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: googleDriveChannel(),
    topics: ["status"],
  });

  return token;
}
