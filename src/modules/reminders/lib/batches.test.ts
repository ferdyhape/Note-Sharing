import { describe, expect, it } from "vitest";
import { nextReminderBatchCursor, REMINDER_SCAN_BATCH_SIZE } from "./batches";

describe("nextReminderBatchCursor", () => {
  it("advances a full batch from its last ID", () => {
    const ids = Array.from({ length: REMINDER_SCAN_BATCH_SIZE }, (_, index) => `reminder-${index}`);
    expect(nextReminderBatchCursor(ids)).toBe(`reminder-${REMINDER_SCAN_BATCH_SIZE - 1}`);
  });

  it("resets after a partial or empty batch", () => {
    expect(nextReminderBatchCursor(["only-reminder"])).toBeNull();
    expect(nextReminderBatchCursor([])).toBeNull();
  });
});
