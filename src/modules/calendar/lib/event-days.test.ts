import { describe, expect, it } from "vitest";
import type { ScheduleOccurrence } from "@/modules/scheduling/lib/occurrences";
import { groupCalendarEventsByDate } from "./event-days";

function occurrence(
  fields: Partial<ScheduleOccurrence> & Pick<ScheduleOccurrence, "scheduleType">,
): ScheduleOccurrence & { noteTitle: string } {
  return {
    scheduleId: "schedule-1",
    noteId: "note-1",
    occurrenceKey: "2026-11-02T00:00:00.000Z",
    timezone: "Asia/Jakarta",
    startAtUtc: null,
    endAtUtc: null,
    startDate: "2026-11-02",
    endDate: null,
    ...fields,
    scheduleType: fields.scheduleType,
    noteTitle: "Note",
  };
}

describe("groupCalendarEventsByDate", () => {
  it("places a date range on every occupied date and clips it to the window", () => {
    const range = occurrence({
      scheduleType: "RANGE",
      startDate: "2026-10-31",
      endDate: "2026-11-03",
    });
    const grouped = groupCalendarEventsByDate([range], "2026-11-01", "2026-11-02");

    expect([...grouped.keys()]).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("places a timed event on both local dates when it crosses midnight", () => {
    const event = occurrence({
      scheduleType: "TIMED",
      timezone: "Asia/Jakarta",
      startAtUtc: "2026-11-01T16:30:00Z",
      endAtUtc: "2026-11-01T17:30:00Z",
      startDate: null,
    });
    const grouped = groupCalendarEventsByDate([event], "2026-11-01", "2026-11-02");

    expect([...grouped.keys()]).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("treats a timed end exactly at midnight as exclusive", () => {
    const event = occurrence({
      scheduleType: "TIMED",
      timezone: "Asia/Jakarta",
      startAtUtc: "2026-11-01T16:00:00Z",
      endAtUtc: "2026-11-01T17:00:00Z",
      startDate: null,
    });
    const grouped = groupCalendarEventsByDate([event], "2026-11-01", "2026-11-02");

    expect([...grouped.keys()]).toEqual(["2026-11-01"]);
  });
});
