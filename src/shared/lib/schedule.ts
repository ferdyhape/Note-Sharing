import type { NoteSchedule } from "@prisma/client";
import {
  createScheduleSchema,
  timezoneSchema,
  type ScheduleInput,
  type SchedulePatch,
} from "./validation/schedule";

type ScheduleFields = Pick<
  NoteSchedule,
  "scheduleType" | "timezone" | "startAtUtc" | "endAtUtc" | "startDate" | "endDate"
>;

export function toScheduleFields(schedule: ScheduleInput): ScheduleFields {
  if (!schedule.timezone) {
    throw new Error("A timezone is required before persisting a schedule.");
  }

  const fields: ScheduleFields = {
    scheduleType: schedule.scheduleType,
    timezone: schedule.timezone,
    startAtUtc: null,
    endAtUtc: null,
    startDate: null,
    endDate: null,
  };

  if (schedule.scheduleType === "ALL_DAY" || schedule.scheduleType === "RANGE") {
    fields.startDate = new Date(`${schedule.startDate}T00:00:00.000Z`);
    fields.endDate = schedule.endDate ? new Date(`${schedule.endDate}T00:00:00.000Z`) : null;
  }
  if (schedule.scheduleType === "TIMED") {
    fields.startAtUtc = new Date(schedule.startAtUtc);
    fields.endAtUtc = schedule.endAtUtc ? new Date(schedule.endAtUtc) : null;
  }

  return fields;
}

export function scheduleInputFromRecord(
  schedule: NoteSchedule,
): ScheduleInput & { timezone: string } {
  const common = { scheduleType: schedule.scheduleType, timezone: schedule.timezone };

  if (schedule.scheduleType === "TIMED") {
    return {
      ...common,
      scheduleType: "TIMED",
      startAtUtc: schedule.startAtUtc!.toISOString(),
      ...(schedule.endAtUtc ? { endAtUtc: schedule.endAtUtc.toISOString() } : {}),
    };
  }

  const startDate = schedule.startDate!.toISOString().slice(0, 10);
  if (schedule.scheduleType === "RANGE") {
    return {
      ...common,
      scheduleType: "RANGE",
      startDate,
      endDate: schedule.endDate!.toISOString().slice(0, 10),
    };
  }

  return {
    ...common,
    scheduleType: "ALL_DAY",
    startDate,
    ...(schedule.endDate ? { endDate: schedule.endDate.toISOString().slice(0, 10) } : {}),
  };
}

export function mergeSchedulePatch(schedule: NoteSchedule, patch: SchedulePatch) {
  const { enabled, ...schedulePatch } = patch;
  const candidate: Record<string, unknown> = {
    ...scheduleInputFromRecord(schedule),
    ...schedulePatch,
  };
  for (const key of ["startDate", "endDate", "startAtUtc", "endAtUtc"]) {
    if (candidate[key] === null) delete candidate[key];
  }

  return {
    enabled,
    parsedSchedule: createScheduleSchema.safeParse(candidate),
  };
}

export function resolveScheduleTimezone(
  requestedTimezone: string | undefined,
  userTimezone: string | null | undefined,
) {
  const timezone = requestedTimezone ?? userTimezone;
  return timezone && timezoneSchema.safeParse(timezone).success ? timezone : "Asia/Jakarta";
}
