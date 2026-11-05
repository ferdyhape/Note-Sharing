import { Temporal } from "@js-temporal/polyfill";
import type { NoteSchedule, RecurrenceRule, ScheduleException } from "@prisma/client";
import { rrulestr } from "rrule";
import { overrideOccurrenceSchema } from "../schema";

const MAX_RECURRENCE_COUNT = 1000;

export type OccurrenceWindow = {
  fromDate: string;
  toDate: string;
  timezone: string;
};

export type ScheduleOccurrence = {
  scheduleId: string;
  noteId: string;
  occurrenceKey: string;
  scheduleType: NoteSchedule["scheduleType"];
  timezone: string;
  startAtUtc: string | null;
  endAtUtc: string | null;
  startDate: string | null;
  endDate: string | null;
  isOverridden?: boolean;
};

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

function toWallDate(dateTime: Temporal.PlainDateTime) {
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

function fromWallDate(date: Date) {
  return Temporal.PlainDateTime.from({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  });
}

function wallTimeToInstant(wallTime: Temporal.PlainDateTime, timezone: string) {
  const resolved = wallTime.toZonedDateTime(timezone, { disambiguation: "earlier" });
  if (!resolved.toPlainDateTime().equals(wallTime)) return null;
  return resolved.toInstant();
}

function windowInScheduleTimezone(window: OccurrenceWindow, scheduleTimezone: string) {
  const from = Temporal.PlainDateTime.from(`${window.fromDate}T00:00`).toZonedDateTime(
    window.timezone,
    { disambiguation: "compatible" },
  );
  const to = Temporal.PlainDateTime.from(
    `${Temporal.PlainDate.from(window.toDate).add({ days: 1 }).toString()}T00:00`,
  ).toZonedDateTime(window.timezone, { disambiguation: "compatible" });

  return {
    from: from.toInstant().toZonedDateTimeISO(scheduleTimezone).toPlainDateTime(),
    to: to.toInstant().toZonedDateTimeISO(scheduleTimezone).toPlainDateTime(),
  };
}

function recurrenceCount(rrule: string) {
  const count = rrule.match(/(?:^|;)COUNT=(\d+)(?:;|$)/)?.[1];
  if (!count) return null;
  const parsed = Number(count);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_RECURRENCE_COUNT) {
    throw new Error("Stored recurrence count is outside the supported range.");
  }
  return parsed;
}

function recurrenceUntilDate(recurrence: RecurrenceRule) {
  return recurrence.untilDate
    ? Temporal.PlainDate.from(recurrence.untilDate.toISOString().slice(0, 10))
    : null;
}

function candidateWallStarts(
  schedule: NoteSchedule,
  recurrence: RecurrenceRule,
  from: Temporal.PlainDateTime,
  to: Temporal.PlainDateTime,
) {
  const start = wallStart(schedule);
  const startDate = toWallDate(start);
  const count = recurrenceCount(recurrence.rrule);
  const ruleText = count
    ? recurrence.rrule.replace(/(?:^|;)COUNT=\d+(?=;|$)/, "").replace(/^;|;$/g, "")
    : recurrence.rrule;
  const rule = rrulestr(ruleText, { dtstart: startDate });
  const untilDate = recurrenceUntilDate(recurrence);

  if (count) {
    const starts: Temporal.PlainDateTime[] = [];
    let validCount = 0;
    rule.all((candidate) => {
      const wallTime = fromWallDate(candidate);
      if (untilDate && Temporal.PlainDate.compare(wallTime.toPlainDate(), untilDate) > 0) {
        return false;
      }
      if (wallTimeToInstant(wallTime, schedule.timezone)) {
        validCount += 1;
        if (
          Temporal.PlainDateTime.compare(wallTime, from) >= 0 &&
          Temporal.PlainDateTime.compare(wallTime, to) < 0
        ) {
          starts.push(wallTime);
        }
      }
      return validCount < count;
    });
    return starts;
  }

  return rule
    .between(toWallDate(from), toWallDate(to), true)
    .map(fromWallDate)
    .filter((wallTime) =>
      untilDate ? Temporal.PlainDate.compare(wallTime.toPlainDate(), untilDate) <= 0 : true,
    );
}

function scheduleDuration(schedule: NoteSchedule) {
  if (schedule.scheduleType === "TIMED") {
    if (!schedule.startAtUtc || !schedule.endAtUtc) return { milliseconds: 0, days: 0 };
    return { milliseconds: schedule.endAtUtc.getTime() - schedule.startAtUtc.getTime(), days: 0 };
  }

  if (!schedule.startDate || !schedule.endDate) return { milliseconds: 0, days: 0 };
  const start = Temporal.PlainDate.from(schedule.startDate.toISOString().slice(0, 10));
  const end = Temporal.PlainDate.from(schedule.endDate.toISOString().slice(0, 10));
  return { milliseconds: 0, days: start.until(end, { largestUnit: "days" }).days };
}

function occurrenceFromWallStart(
  schedule: NoteSchedule,
  wallTime: Temporal.PlainDateTime,
): ScheduleOccurrence | null {
  if (schedule.scheduleType === "TIMED") {
    const start = wallTimeToInstant(wallTime, schedule.timezone);
    if (!start) return null;
    const duration = scheduleDuration(schedule).milliseconds;
    const end = schedule.endAtUtc ? start.add({ milliseconds: duration }).toString() : null;
    const startAtUtc = start.toString();
    return {
      scheduleId: schedule.id,
      noteId: schedule.noteId,
      occurrenceKey: startAtUtc,
      scheduleType: schedule.scheduleType,
      timezone: schedule.timezone,
      startAtUtc,
      endAtUtc: end,
      startDate: null,
      endDate: null,
    } satisfies ScheduleOccurrence;
  }

  const startDate = wallTime.toPlainDate();
  const durationDays = scheduleDuration(schedule).days;
  const endDate = schedule.endDate ? startDate.add({ days: durationDays }).toString() : null;
  const startDateText = startDate.toString();
  return {
    scheduleId: schedule.id,
    noteId: schedule.noteId,
    occurrenceKey: `${startDateText}T00:00:00.000Z`,
    scheduleType: schedule.scheduleType,
    timezone: schedule.timezone,
    startAtUtc: null,
    endAtUtc: null,
    startDate: startDateText,
    endDate,
  } satisfies ScheduleOccurrence;
}

function wallTimeFromOccurrenceKey(schedule: NoteSchedule, occurrenceKey: string) {
  if (schedule.scheduleType === "TIMED") {
    return Temporal.Instant.from(occurrenceKey)
      .toZonedDateTimeISO(schedule.timezone)
      .toPlainDateTime();
  }
  return Temporal.PlainDate.from(occurrenceKey.slice(0, 10)).toPlainDateTime();
}

function applyOverride(
  schedule: NoteSchedule,
  occurrence: ScheduleOccurrence,
  exception: ScheduleException,
): ScheduleOccurrence {
  const rawOverride = exception.overrideJson;
  if (!rawOverride || typeof rawOverride !== "object" || Array.isArray(rawOverride)) {
    throw new Error("Stored occurrence override is invalid.");
  }
  const parsed = overrideOccurrenceSchema.safeParse({
    occurrenceKey: exception.occurrenceKey,
    ...rawOverride,
  });
  if (!parsed.success || parsed.data.scheduleType !== schedule.scheduleType) {
    throw new Error("Stored occurrence override does not match its schedule type.");
  }

  if (parsed.data.scheduleType === "TIMED") {
    return {
      ...occurrence,
      startAtUtc: parsed.data.startAtUtc,
      endAtUtc: parsed.data.endAtUtc ?? null,
      isOverridden: true,
    };
  }
  if (parsed.data.scheduleType === "ALL_DAY") {
    return {
      ...occurrence,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate ?? null,
      isOverridden: true,
    };
  }
  return {
    ...occurrence,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    isOverridden: true,
  };
}

function overlapsWindow(occurrence: ScheduleOccurrence, window: OccurrenceWindow) {
  if (occurrence.scheduleType !== "TIMED") {
    return (
      occurrence.startDate! <= window.toDate &&
      (occurrence.endDate ?? occurrence.startDate!) >= window.fromDate
    );
  }

  const windowFrom = Temporal.PlainDateTime.from(`${window.fromDate}T00:00`)
    .toZonedDateTime(window.timezone, { disambiguation: "compatible" })
    .toInstant();
  const windowTo = Temporal.PlainDateTime.from(
    `${Temporal.PlainDate.from(window.toDate).add({ days: 1 }).toString()}T00:00`,
  )
    .toZonedDateTime(window.timezone, { disambiguation: "compatible" })
    .toInstant();
  const start = Temporal.Instant.from(occurrence.startAtUtc!);
  const end = occurrence.endAtUtc ? Temporal.Instant.from(occurrence.endAtUtc) : start;
  return (
    Temporal.Instant.compare(start, windowTo) < 0 && Temporal.Instant.compare(end, windowFrom) >= 0
  );
}

export function expandScheduleOccurrences(
  schedule: NoteSchedule,
  recurrence: RecurrenceRule | null,
  exceptions: ScheduleException[],
  window: OccurrenceWindow,
) {
  if (
    Temporal.PlainDate.compare(
      Temporal.PlainDate.from(window.fromDate),
      Temporal.PlainDate.from(window.toDate),
    ) > 0
  ) {
    throw new RangeError("Calendar window start must not be after its end.");
  }

  const { from, to } =
    schedule.scheduleType === "TIMED"
      ? windowInScheduleTimezone(window, schedule.timezone)
      : {
          from: Temporal.PlainDate.from(window.fromDate).toPlainDateTime(),
          to: Temporal.PlainDate.from(window.toDate).add({ days: 1 }).toPlainDateTime(),
        };
  const duration = scheduleDuration(schedule);
  const lookBehind =
    schedule.scheduleType === "TIMED"
      ? Temporal.Duration.from({ milliseconds: duration.milliseconds })
      : Temporal.Duration.from({ days: duration.days });
  const candidateFrom = from.subtract(lookBehind);
  const generatedWallStarts = recurrence
    ? candidateWallStarts(schedule, recurrence, candidateFrom, to)
    : [wallStart(schedule)];
  const exceptionByKey = new Map(
    exceptions.map((exception) => [exception.occurrenceKey, exception]),
  );
  const overrideExceptions = exceptions.filter(
    (exception) => exception.exceptionType === "OVERRIDE",
  );
  const overrideKeys = new Set(overrideExceptions.map((exception) => exception.occurrenceKey));
  const wallStartsByKey = new Map(
    generatedWallStarts.map((wallTime) => [wallTime.toString(), wallTime]),
  );
  for (const exception of overrideExceptions) {
    const wallTime = wallTimeFromOccurrenceKey(schedule, exception.occurrenceKey);
    wallStartsByKey.set(wallTime.toString(), wallTime);
  }

  return [...wallStartsByKey.values()]
    .filter(
      (wallTime) =>
        Temporal.PlainDateTime.compare(wallTime, candidateFrom) >= 0 ||
        overrideKeys.has(occurrenceFromWallStart(schedule, wallTime)?.occurrenceKey ?? ""),
    )
    .sort(Temporal.PlainDateTime.compare)
    .map((wallTime) => occurrenceFromWallStart(schedule, wallTime))
    .filter((occurrence): occurrence is ScheduleOccurrence => Boolean(occurrence))
    .filter((occurrence) => exceptionByKey.get(occurrence.occurrenceKey)?.exceptionType !== "SKIP")
    .map((occurrence) => {
      const exception = exceptionByKey.get(occurrence.occurrenceKey);
      return exception?.exceptionType === "OVERRIDE"
        ? applyOverride(schedule, occurrence, exception)
        : occurrence;
    })
    .filter((occurrence) => overlapsWindow(occurrence, window));
}
