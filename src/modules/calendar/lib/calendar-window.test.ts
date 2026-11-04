import { describe, expect, it } from "vitest";
import { agendaQuerySchema } from "../schema";
import { makeCalendarWindow } from "./calendar-window";

describe("agendaQuerySchema", () => {
  it("accepts a bounded window and rejects reversed or oversized windows", () => {
    expect(agendaQuerySchema.safeParse({ from: "2026-11-01", to: "2026-12-31" }).success).toBe(
      true,
    );
    expect(agendaQuerySchema.safeParse({ from: "2026-12-02", to: "2026-12-01" }).success).toBe(
      false,
    );
    expect(agendaQuerySchema.safeParse({ from: "2026-01-01", to: "2026-03-31" }).success).toBe(
      false,
    );
  });
});

describe("makeCalendarWindow", () => {
  it("converts date boundaries using the requested timezone", () => {
    const query = agendaQuerySchema.parse({ from: "2026-11-01", to: "2026-11-01" });
    const window = makeCalendarWindow(query, "America/New_York");

    expect(window.startsAtUtc.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(window.endsAtUtc.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(window.endsBeforeDate.toISOString()).toBe("2026-11-02T00:00:00.000Z");
  });
});
