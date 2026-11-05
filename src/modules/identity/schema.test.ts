import { describe, expect, it } from "vitest";
import { updateTimezoneSchema } from "./schema";

describe("updateTimezoneSchema", () => {
  it("accepts valid IANA zones and clearing the account override", () => {
    expect(updateTimezoneSchema.safeParse({ timezone: "Asia/Singapore" }).success).toBe(true);
    expect(updateTimezoneSchema.safeParse({ timezone: null }).success).toBe(true);
  });

  it("rejects invalid IANA zones and unexpected fields", () => {
    expect(updateTimezoneSchema.safeParse({ timezone: "Mars/Olympus" }).success).toBe(false);
    expect(updateTimezoneSchema.safeParse({ timezone: "UTC", extra: true }).success).toBe(false);
  });
});
