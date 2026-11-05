import { describe, expect, it } from "vitest";
import type { NoteSchedule } from "@prisma/client";
import { mergeSchedulePatch, resolveScheduleTimezone, scheduleInputFromRecord } from "./schedule";
import { createScheduleSchema, updateScheduleSchema } from "./validation/schedule";

const allDaySchedule: NoteSchedule = {
  id: "schedule-1",
  noteId: "note-1",
  scheduleType: "ALL_DAY",
  startAtUtc: null,
  endAtUtc: null,
  startDate: new Date("2026-11-04T00:00:00.000Z"),
  endDate: null,
  timezone: "Asia/Jakarta",
  sourcePropertyId: null,
  enabled: true,
  createdAt: new Date("2026-11-01T00:00:00.000Z"),
};

describe("schedule validation", () => {
  it("allows the server to supply an omitted create timezone", () => {
    expect(
      createScheduleSchema.safeParse({
        scheduleType: "ALL_DAY",
        startDate: "2026-11-04",
      }).success,
    ).toBe(true);
  });

  it("accepts an enabled-only patch and rejects an empty patch", () => {
    expect(updateScheduleSchema.safeParse({ enabled: false }).success).toBe(true);
    expect(updateScheduleSchema.safeParse({}).success).toBe(false);
  });

  it("uses user timezone and falls back to Asia/Jakarta", () => {
    expect(resolveScheduleTimezone(undefined, "Asia/Singapore")).toBe("Asia/Singapore");
    expect(resolveScheduleTimezone(undefined, null)).toBe("Asia/Jakarta");
    expect(resolveScheduleTimezone(undefined, "invalid/zone")).toBe("Asia/Jakarta");
    expect(resolveScheduleTimezone("UTC", "Asia/Singapore")).toBe("UTC");
  });
});

describe("mergeSchedulePatch", () => {
  it("preserves existing fields for an enabled-only update", () => {
    const result = mergeSchedulePatch(allDaySchedule, { enabled: false });

    expect(result.enabled).toBe(false);
    expect(result.parsedSchedule.success).toBe(true);
    expect(scheduleInputFromRecord(allDaySchedule)).toMatchObject({
      scheduleType: "ALL_DAY",
      timezone: "Asia/Jakarta",
      startDate: "2026-11-04",
    });
    if (result.parsedSchedule.success) {
      expect(result.parsedSchedule.data).toMatchObject({
        scheduleType: "ALL_DAY",
        timezone: "Asia/Jakarta",
        startDate: "2026-11-04",
      });
    }
  });

  it("rejects a partial update that makes a date range invalid", () => {
    const rangeSchedule: NoteSchedule = {
      ...allDaySchedule,
      scheduleType: "RANGE",
      endDate: new Date("2026-11-05T00:00:00.000Z"),
    };

    const result = mergeSchedulePatch(rangeSchedule, { startDate: "2026-11-06" });
    expect(result.parsedSchedule.success).toBe(false);
  });

  it("rejects a partial timed update that moves the end before the start", () => {
    const timedSchedule: NoteSchedule = {
      ...allDaySchedule,
      scheduleType: "TIMED",
      startAtUtc: new Date("2026-11-04T09:00:00.000Z"),
      endAtUtc: new Date("2026-11-04T10:00:00.000Z"),
      startDate: null,
    };

    const result = mergeSchedulePatch(timedSchedule, {
      startAtUtc: "2026-11-04T11:00:00Z",
    });
    expect(result.parsedSchedule.success).toBe(false);
  });
});
