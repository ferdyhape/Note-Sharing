import { describe, expect, it } from "vitest";
import {
  isReminderTriggerDue,
  REMINDER_SCAN_LOOKBACK_MS,
  scheduleReminderWindow,
} from "./due-window";

describe("scheduleReminderWindow", () => {
  it("maps the scan window to schedule-local dates across a DST transition", () => {
    const now = new Date("2026-03-08T07:00:00.000Z");
    const window = scheduleReminderWindow(now, 60 * 60, "America/New_York");

    expect(window.triggerFrom).toEqual(new Date(now.getTime() - REMINDER_SCAN_LOOKBACK_MS));
    expect(window.triggerTo).toEqual(now);
    expect(window.fromDate).toBe("2026-03-07");
    expect(window.toDate).toBe("2026-03-09");
    expect(window.timezone).toBe("America/New_York");
  });

  it("rejects invalid offsets and scan instants", () => {
    expect(() => scheduleReminderWindow(new Date(), -1, "UTC")).toThrow(RangeError);
    expect(() => scheduleReminderWindow(new Date("invalid"), 0, "UTC")).toThrow(RangeError);
  });

  it("includes both trigger-window boundaries and rejects out-of-range instants", () => {
    const window = scheduleReminderWindow(new Date("2026-03-08T07:00:00.000Z"), 0, "UTC");
    expect(isReminderTriggerDue(window.triggerFrom, window)).toBe(true);
    expect(isReminderTriggerDue(window.triggerTo, window)).toBe(true);
    expect(isReminderTriggerDue(new Date(window.triggerFrom.getTime() - 1), window)).toBe(false);
    expect(isReminderTriggerDue(new Date("invalid"), window)).toBe(false);
  });
});
