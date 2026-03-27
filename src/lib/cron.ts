// src/lib/cron.ts
import { CronExpressionParser } from "cron-parser";

/**
 * Computes the next Date a cron expression will fire.
 * All dates are returned in UTC regardless of the timezone parameter —
 * `timezone` is used only to correctly interpret the cron schedule.
 */
export function computeNextRun(expression: string, timezone: string): Date {
  const interval = CronExpressionParser.parse(expression, {
    tz: timezone,
    currentDate: new Date(),
  });
  return interval.next().toDate();
}