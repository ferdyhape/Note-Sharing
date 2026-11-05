import { describe, expect, it } from "vitest";
import { isInMonth, monthGridDates, monthGridStart, shiftMonth, weekGridDates } from "./month-grid";

describe("month calendar grid", () => {
  it("starts on Monday and renders six full weeks across month boundaries", () => {
    const dates = monthGridDates("2026-11-18");

    expect(dates).toHaveLength(42);
    expect(dates[0]?.toString()).toBe("2026-10-26");
    expect(dates.at(-1)?.toString()).toBe("2026-12-06");
    expect(dates[0]?.dayOfWeek).toBe(1);
  });

  it("marks adjacent-month days and advances month navigation across year end", () => {
    const dates = monthGridDates("2026-12-04");

    expect(isInMonth(dates[0]!, "2026-12-04")).toBe(false);
    expect(shiftMonth("2026-12-04", 1)).toBe("2027-01-01");
    expect(shiftMonth("2027-01-19", -1)).toBe("2026-12-01");
    expect(monthGridStart("2027-01-19").toString()).toBe("2026-12-28");
  });
});

describe("week calendar grid", () => {
  it("starts on Monday and stays within the requested seven-day week", () => {
    const dates = weekGridDates("2027-01-01");

    expect(dates).toHaveLength(7);
    expect(dates[0]?.toString()).toBe("2026-12-28");
    expect(dates.at(-1)?.toString()).toBe("2027-01-03");
  });
});
