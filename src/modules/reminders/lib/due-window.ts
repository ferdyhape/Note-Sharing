import { Temporal } from "@js-temporal/polyfill";
import type { OccurrenceWindow } from "@/modules/scheduling/lib/occurrences";

export const REMINDER_SCAN_LOOKBACK_MS = 5 * 60 * 1000;

export type ScheduleReminderWindow = OccurrenceWindow & {
  triggerFrom: Date;
  triggerTo: Date;
};

export function isReminderTriggerDue(triggerAt: Date, window: ScheduleReminderWindow) {
  const timestamp = triggerAt.getTime();
  return (
    Number.isFinite(timestamp) &&
    timestamp >= window.triggerFrom.getTime() &&
    timestamp <= window.triggerTo.getTime()
  );
}

export function scheduleReminderWindow(
  now: Date,
  offsetSeconds: number,
  timezone: string,
): ScheduleReminderWindow {
  if (!Number.isInteger(offsetSeconds) || offsetSeconds < 0) {
    throw new RangeError("Reminder offset must be a nonnegative integer.");
  }
  if (!Number.isFinite(now.getTime())) throw new RangeError("Reminder scan time is invalid.");

  const triggerFrom = new Date(now.getTime() - REMINDER_SCAN_LOOKBACK_MS);
  const triggerTo = new Date(now);
  const offset = { seconds: offsetSeconds };
  const occurrenceFromDate = Temporal.Instant.fromEpochMilliseconds(triggerFrom.getTime())
    .add(offset)
    .toZonedDateTimeISO(timezone)
    .toPlainDate();
  const occurrenceToDate = Temporal.Instant.fromEpochMilliseconds(triggerTo.getTime())
    .add(offset)
    .toZonedDateTimeISO(timezone)
    .toPlainDate();

  return {
    fromDate: occurrenceFromDate.subtract({ days: 1 }).toString(),
    toDate: occurrenceToDate.add({ days: 1 }).toString(),
    timezone,
    triggerFrom,
    triggerTo,
  };
}
