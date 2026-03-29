"use server";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inngest } from "@/app/inngest/client";
import { filterChannel } from "@/app/inngest/channels/filter";

export type FilterToken = Realtime.Token<typeof filterChannel, ["status"]>;

export async function fetchFilterRealtimeToken(): Promise<FilterToken> {
  return getSubscriptionToken(inngest, {
    channel: filterChannel(),
    topics: ["status"],
  });
}
