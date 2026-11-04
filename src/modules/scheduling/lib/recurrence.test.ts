import { describe, expect, it } from "vitest";
import { RRule, rrulestr } from "rrule";
import type { NoteSchedule } from "@prisma/client";
import { recurrenceInputSchema, skipOccurrenceSchema } from "../schema";
import { buildRRule, recurrenceStartsAt } from "./recurrence";

const timedSchedule: NoteSchedule = {
  id: "schedule-1",
  noteId: "note-1",
  scheduleType: "TIMED",
  startAtUtc: new Date("2026-03-02T14:00:00.000Z"),
  endAtUtc: null,
  startDate: null,
  endDate: null,
  timezone: "America/New_York",
  sourcePropertyId: null,
  enabled: true,
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
};

describe("recurrenceInputSchema", () => {
  it("rejects conflicting end conditions and unsupported custom fields", () => {
    expect(
      recurrenceInputSchema.safeParse({
        frequency: "DAILY",
        count: 5,
        untilDate: "2026-12-31",
      }).success,
    ).toBe(false);
    expect(recurrenceInputSchema.safeParse({ frequency: "DAILY", monthDays: [1] }).success).toBe(
      false,
    );
  });

  it("requires canonical UTC occurrence keys for skip exceptions", () => {
    expect(skipOccurrenceSchema.safeParse({ occurrenceKey: "2026-03-02T09:00:00Z" }).success).toBe(
      true,
    );
    expect(
      skipOccurrenceSchema.safeParse({ occurrenceKey: "2026-03-02T09:00:00-05:00" }).success,
    ).toBe(false);
  });
});

describe("buildRRule", () => {
  it("builds a weekly rule from the schedule's local wall-clock start", () => {
    const input = recurrenceInputSchema.parse({
      frequency: "WEEKLY",
      weekdays: ["MO", "WE"],
      count: 4,
    });
    const value = buildRRule(timedSchedule, input);
    const parsed = rrulestr(`DTSTART:20260302T090000Z\nRRULE:${value}`);

    expect(value).toContain("FREQ=WEEKLY");
    expect(parsed.all().map((date) => date.toISOString())).toEqual([
      "2026-03-02T09:00:00.000Z",
      "2026-03-04T09:00:00.000Z",
      "2026-03-09T09:00:00.000Z",
      "2026-03-11T09:00:00.000Z",
    ]);
  });

  it("uses the schedule's starting weekday and month day when custom values are omitted", () => {
    const weekly = buildRRule(timedSchedule, recurrenceInputSchema.parse({ frequency: "WEEKLY" }));
    const monthly = buildRRule(
      timedSchedule,
      recurrenceInputSchema.parse({ frequency: "MONTHLY" }),
    );

    expect(weekly).toContain(`BYDAY=${RRule.MO.toString()}`);
    expect(monthly).toContain("BYMONTHDAY=2");
  });
});

describe("recurrenceStartsAt", () => {
  it("keeps timed instants and represents all-day starts as date values", () => {
    expect(recurrenceStartsAt(timedSchedule).toISOString()).toBe("2026-03-02T14:00:00.000Z");
    expect(
      recurrenceStartsAt({
        ...timedSchedule,
        scheduleType: "ALL_DAY",
        startAtUtc: null,
        startDate: new Date("2026-03-02T00:00:00.000Z"),
      }).toISOString(),
    ).toBe("2026-03-02T00:00:00.000Z");
  });
});
