import { describe, expect, it } from "vitest";
import { reminderRuleSchema } from "./schema";

describe("reminderRuleSchema", () => {
  it("accepts a fixed-time reminder with shared recipients", () => {
    expect(
      reminderRuleSchema.safeParse({
        triggerMode: "FIXED",
        fixedTriggerAt: "2026-11-05T04:00:00Z",
        recipientUserIds: ["shared-user"],
      }).success,
    ).toBe(true);
  });

  it("accepts a schedule-relative reminder with an offset before the schedule", () => {
    expect(
      reminderRuleSchema.safeParse({
        triggerMode: "SCHEDULE_RELATIVE",
        scheduleId: "schedule-1",
        offsetSeconds: 900,
        recipientUserIds: ["shared-user"],
      }).success,
    ).toBe(true);
  });

  it("rejects mode-mismatched fields, negative offsets and invalid recipient lists", () => {
    const invalidInputs = [
      {
        triggerMode: "FIXED",
        fixedTriggerAt: "2026-11-05T04:00:00Z",
        scheduleId: "schedule-1",
        recipientUserIds: ["shared-user"],
      },
      {
        triggerMode: "SCHEDULE_RELATIVE",
        scheduleId: "schedule-1",
        offsetSeconds: -1,
        recipientUserIds: ["shared-user"],
      },
      {
        triggerMode: "FIXED",
        fixedTriggerAt: "2026-11-05T04:00:00Z",
        recipientUserIds: ["shared-user", "shared-user"],
      },
      {
        triggerMode: "FIXED",
        fixedTriggerAt: "2026-11-05T04:00:00Z",
        recipientUserIds: [],
      },
    ];

    for (const input of invalidInputs) {
      expect(reminderRuleSchema.safeParse(input).success).toBe(false);
    }
  });
});
