import { describe, expect, it } from "vitest";
import { reminderDeliveryKey } from "./delivery-key";

describe("reminderDeliveryKey", () => {
  it("is stable and separates recipients, occurrences, and channels", () => {
    const key = reminderDeliveryKey("reminder-1", "2026-11-05T04:00:00Z", "user-1", "IN_APP");

    expect(key).toBe(reminderDeliveryKey("reminder-1", "2026-11-05T04:00:00Z", "user-1", "IN_APP"));
    expect(key).not.toBe(
      reminderDeliveryKey("reminder-1", "2026-11-05T04:00:00Z", "user-2", "IN_APP"),
    );
    expect(key).not.toBe(
      reminderDeliveryKey("reminder-1", "2026-11-05T04:00:00Z", "user-1", "PUSH"),
    );
  });
});
