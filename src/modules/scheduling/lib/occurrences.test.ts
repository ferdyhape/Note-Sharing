import { describe, expect, it } from "vitest";
import type { NoteSchedule, RecurrenceRule, ScheduleException } from "@prisma/client";
import { recurrenceInputSchema } from "../schema";
import { buildRRule } from "./recurrence";
import { expandScheduleOccurrences, type OccurrenceWindow } from "./occurrences";

const window: OccurrenceWindow = {
  fromDate: "2026-03-01",
  toDate: "2026-03-31",
  timezone: "America/New_York",
};

function timedSchedule(startAtUtc: string, timezone = "America/New_York"): NoteSchedule {
  return {
    id: "schedule-1",
    noteId: "note-1",
    scheduleType: "TIMED",
    startAtUtc: new Date(startAtUtc),
    endAtUtc: null,
    startDate: null,
    endDate: null,
    timezone,
    sourcePropertyId: null,
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function recurrenceFor(schedule: NoteSchedule, options: unknown): RecurrenceRule {
  const parsed = recurrenceInputSchema.parse(options);
  return {
    id: "recurrence-1",
    scheduleId: schedule.id,
    rrule: buildRRule(schedule, parsed),
    timezone: schedule.timezone,
    startsAt: schedule.startAtUtc ?? schedule.startDate!,
    endsAt: null,
    untilDate: parsed.untilDate ? new Date(`${parsed.untilDate}T00:00:00.000Z`) : null,
  };
}

describe("expandScheduleOccurrences", () => {
  it("keeps weekly wall time across DST and skips a gap without consuming COUNT", () => {
    const schedule = timedSchedule("2026-03-01T07:30:00.000Z");
    const recurrence = recurrenceFor(schedule, {
      frequency: "WEEKLY",
      weekdays: ["SU"],
      count: 3,
    });
    const occurrences = expandScheduleOccurrences(schedule, recurrence, [], window);

    expect(occurrences.map((item) => item.startAtUtc)).toEqual([
      "2026-03-01T07:30:00Z",
      "2026-03-15T06:30:00Z",
      "2026-03-22T06:30:00Z",
    ]);
  });

  it("chooses the earlier instant for an ambiguous overlap time", () => {
    const schedule = timedSchedule("2026-10-25T05:30:00.000Z");
    const recurrence = recurrenceFor(schedule, {
      frequency: "WEEKLY",
      weekdays: ["SU"],
      count: 2,
    });
    const occurrences = expandScheduleOccurrences(schedule, recurrence, [], {
      fromDate: "2026-11-01",
      toDate: "2026-11-01",
      timezone: "America/New_York",
    });

    expect(occurrences[0]?.startAtUtc).toBe("2026-11-01T05:30:00Z");
  });

  it("skips missing monthly dates without consuming COUNT", () => {
    const schedule = {
      ...timedSchedule("2026-01-31T14:00:00.000Z", "Asia/Jakarta"),
      startAtUtc: new Date("2026-01-31T02:00:00.000Z"),
    };
    const recurrence = recurrenceFor(schedule, {
      frequency: "MONTHLY",
      count: 3,
    });
    const occurrences = expandScheduleOccurrences(schedule, recurrence, [], {
      fromDate: "2026-01-01",
      toDate: "2026-07-31",
      timezone: "Asia/Jakarta",
    });

    expect(occurrences.map((item) => item.startAtUtc?.slice(0, 10))).toEqual([
      "2026-01-31",
      "2026-03-31",
      "2026-05-31",
    ]);
  });

  it("omits skipped exceptions and includes a range occurrence overlapping the window start", () => {
    const schedule: NoteSchedule = {
      ...timedSchedule("2026-03-01T07:00:00.000Z"),
      endAtUtc: new Date("2026-03-01T10:00:00.000Z"),
    };
    const recurrence = recurrenceFor(schedule, { frequency: "DAILY", count: 3 });
    const skipped: ScheduleException = {
      id: "exception-1",
      scheduleId: schedule.id,
      occurrenceKey: "2026-03-01T07:00:00Z",
      exceptionType: "SKIP",
      overrideJson: null,
    };
    const occurrences = expandScheduleOccurrences(schedule, recurrence, [skipped], {
      fromDate: "2026-03-01",
      toDate: "2026-03-02",
      timezone: "America/New_York",
    });

    expect(occurrences.map((item) => item.occurrenceKey)).toEqual(["2026-03-02T07:00:00Z"]);
  });

  it("includes a moved-in override while preserving its original occurrence key", () => {
    const schedule = timedSchedule("2026-03-02T14:00:00.000Z");
    const recurrence = recurrenceFor(schedule, { frequency: "DAILY", count: 5 });
    const override: ScheduleException = {
      id: "override-1",
      scheduleId: recurrence.id,
      occurrenceKey: "2026-03-03T14:00:00Z",
      exceptionType: "OVERRIDE",
      overrideJson: {
        scheduleType: "TIMED",
        startAtUtc: "2026-03-06T15:00:00Z",
        endAtUtc: null,
      },
    };
    const occurrences = expandScheduleOccurrences(schedule, recurrence, [override], {
      fromDate: "2026-03-06",
      toDate: "2026-03-06",
      timezone: "America/New_York",
    });
    const moved = occurrences.find((item) => item.occurrenceKey === override.occurrenceKey);

    expect(moved?.startAtUtc).toBe("2026-03-06T15:00:00Z");
    expect(moved?.occurrenceKey).toBe("2026-03-03T14:00:00Z");
    expect(moved?.isOverridden).toBe(true);
  });

  it("does not show the original slot when its override moved outside the window", () => {
    const schedule = timedSchedule("2026-03-02T14:00:00.000Z");
    const recurrence = recurrenceFor(schedule, { frequency: "DAILY", count: 5 });
    const override: ScheduleException = {
      id: "override-1",
      scheduleId: recurrence.id,
      occurrenceKey: "2026-03-03T14:00:00Z",
      exceptionType: "OVERRIDE",
      overrideJson: {
        scheduleType: "TIMED",
        startAtUtc: "2026-03-06T15:00:00Z",
        endAtUtc: null,
      },
    };

    const occurrences = expandScheduleOccurrences(schedule, recurrence, [override], {
      fromDate: "2026-03-03",
      toDate: "2026-03-03",
      timezone: "America/New_York",
    });

    expect(occurrences).toEqual([]);
  });
});
