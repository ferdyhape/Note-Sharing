import { Temporal } from "@js-temporal/polyfill";
import { RRule } from "rrule";
import type { NoteSchedule } from "@prisma/client";
import type { RecurrenceInput } from "@/modules/scheduling/schema";

const WEEKDAY_RULES = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
} as const;

function wallStart(schedule: NoteSchedule) {
  if (schedule.scheduleType === "TIMED") {
    if (!schedule.startAtUtc) throw new Error("Timed schedules need a start instant.");
    return Temporal.Instant.from(schedule.startAtUtc.toISOString())
      .toZonedDateTimeISO(schedule.timezone)
      .toPlainDateTime();
  }

  if (!schedule.startDate) throw new Error("Date schedules need a start date.");
  return Temporal.PlainDate.from(schedule.startDate.toISOString().slice(0, 10)).toPlainDateTime();
}

function toRRuleDate(dateTime: Temporal.PlainDateTime) {
  return new Date(
    Date.UTC(
      dateTime.year,
      dateTime.month - 1,
      dateTime.day,
      dateTime.hour,
      dateTime.minute,
      dateTime.second,
    ),
  );
}

export function buildRRule(schedule: NoteSchedule, input: RecurrenceInput) {
  const start = wallStart(schedule);
  const startDate = Temporal.PlainDate.from({
    year: start.year,
    month: start.month,
    day: start.day,
  });
  const weekdays = input.weekdays?.length
    ? input.weekdays.map((weekday) => WEEKDAY_RULES[weekday])
    : input.frequency === "WEEKLY"
      ? [
          WEEKDAY_RULES[
            startDate.dayOfWeek === 7
              ? "SU"
              : (["MO", "TU", "WE", "TH", "FR", "SA"][
                  startDate.dayOfWeek - 1
                ] as keyof typeof WEEKDAY_RULES)
          ],
        ]
      : undefined;
  const monthDays = input.monthDays?.length
    ? input.monthDays
    : input.frequency === "MONTHLY"
      ? [startDate.day]
      : undefined;

  // Keep DTSTART as UTC wall-clock fields; the schedule's IANA timezone is stored separately.
  const rule = new RRule({
    freq: RRule[input.frequency],
    interval: input.interval,
    dtstart: toRRuleDate(start),
    ...(weekdays ? { byweekday: weekdays } : {}),
    ...(monthDays ? { bymonthday: monthDays } : {}),
    ...(input.count ? { count: input.count } : {}),
  });
  const rrule = rule
    .toString()
    .split("\n")
    .find((line) => line.startsWith("RRULE:"));
  if (!rrule) throw new Error("Could not serialize recurrence rule.");
  return rrule.slice("RRULE:".length);
}

export function recurrenceStartsAt(schedule: NoteSchedule) {
  if (schedule.scheduleType === "TIMED") {
    if (!schedule.startAtUtc) throw new Error("Timed schedules need a start instant.");
    return schedule.startAtUtc;
  }
  if (!schedule.startDate) throw new Error("Date schedules need a start date.");
  return new Date(`${schedule.startDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

export function recurrenceStartDate(schedule: NoteSchedule) {
  return wallStart(schedule).toPlainDate();
}
