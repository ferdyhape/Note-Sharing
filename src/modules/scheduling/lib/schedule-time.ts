import { Temporal } from "@js-temporal/polyfill";
import type { ScheduleType } from "@prisma/client";

export type ScheduleDraftInput = {
  scheduleType: ScheduleType;
  timezone: string;
  startDate: string;
  endDate: string;
  startAtLocal: string;
  endAtLocal: string;
};

export function instantToLocalDateTime(value: string, timezone: string) {
  return Temporal.Instant.from(value)
    .toZonedDateTimeISO(timezone)
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" });
}

export function localDateTimeToInstant(value: string, timezone: string) {
  return Temporal.PlainDateTime.from(value)
    .toZonedDateTime(timezone, { disambiguation: "reject" })
    .toInstant()
    .toString();
}

export function schedulePayloadFromDraft(
  draft: ScheduleDraftInput,
  clearOptionalEnds = false,
): Record<string, unknown> {
  if (draft.scheduleType === "TIMED") {
    return {
      scheduleType: draft.scheduleType,
      timezone: draft.timezone,
      startAtUtc: localDateTimeToInstant(draft.startAtLocal, draft.timezone),
      ...(draft.endAtLocal
        ? { endAtUtc: localDateTimeToInstant(draft.endAtLocal, draft.timezone) }
        : clearOptionalEnds
          ? { endAtUtc: null }
          : {}),
    };
  }

  return {
    scheduleType: draft.scheduleType,
    timezone: draft.timezone,
    startDate: draft.startDate,
    ...(draft.endDate
      ? { endDate: draft.endDate }
      : clearOptionalEnds && draft.scheduleType === "ALL_DAY"
        ? { endDate: null }
        : {}),
  };
}

export function formatScheduleDate(value: string, locale = "en-ID") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export function formatScheduleTime(value: string, timezone: string, locale = "en-ID") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}
