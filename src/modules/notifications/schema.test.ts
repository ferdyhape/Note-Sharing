import { describe, expect, it } from "vitest";
import { notificationReadSchema } from "./schema";

describe("notificationReadSchema", () => {
  it("accepts read and unread states", () => {
    expect(notificationReadSchema.safeParse({ read: true }).success).toBe(true);
    expect(notificationReadSchema.safeParse({ read: false }).success).toBe(true);
  });

  it("rejects missing or unexpected fields", () => {
    expect(notificationReadSchema.safeParse({}).success).toBe(false);
    expect(notificationReadSchema.safeParse({ read: true, userId: "another-user" }).success).toBe(
      false,
    );
  });
});
