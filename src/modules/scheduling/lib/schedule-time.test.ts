import { describe, expect, it } from "vitest";
import {
  formatScheduleDate,
  formatScheduleTime,
  instantToLocalDateTime,
  localDateTimeToInstant,
  schedulePayloadFromDraft,
} from "./schedule-time";

describe("schedule timezone conversion", () => {
  it("round-trips an IANA local time through UTC", () => {
    const instant = localDateTimeToInstant("2026-11-04T09:30", "Asia/Jakarta");

    expect(instant).toBe("2026-11-04T02:30:00Z");
    expect(instantToLocalDateTime(instant, "Asia/Jakarta")).toBe("2026-11-04T09:30");
  });

  it("rejects local times that are ambiguous or skipped by DST", () => {
    expect(() => localDateTimeToInstant("2026-11-01T01:30", "America/New_York")).toThrow();
    expect(() => localDateTimeToInstant("2026-03-08T02:30", "America/New_York")).toThrow();
  });

  it("formats date-only values without shifting their calendar day", () => {
    expect(formatScheduleDate("2026-11-04T00:00:00.000Z", "en-CA")).toBe("Nov 4, 2026");
  });

  it("formats timed values in the schedule timezone", () => {
    expect(formatScheduleTime("2026-11-04T02:30:00.000Z", "Asia/Jakarta", "en-GB")).toContain(
      "09:30",
    );
  });

  it("sends null to clear optional end fields only during updates", () => {
    const allDayDraft = {
      scheduleType: "ALL_DAY" as const,
      timezone: "Asia/Jakarta",
      startDate: "2026-11-04",
      endDate: "",
      startAtLocal: "",
      endAtLocal: "",
    };
    const timedDraft = {
      ...allDayDraft,
      scheduleType: "TIMED" as const,
      startAtLocal: "2026-11-04T09:30",
    };

    expect(schedulePayloadFromDraft(allDayDraft, true)).toHaveProperty("endDate", null);
    expect(schedulePayloadFromDraft(timedDraft, true)).toHaveProperty("endAtUtc", null);
    expect(schedulePayloadFromDraft(allDayDraft)).not.toHaveProperty("endDate");
    expect(schedulePayloadFromDraft(timedDraft)).not.toHaveProperty("endAtUtc");
  });
});
