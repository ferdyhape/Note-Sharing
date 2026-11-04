import { describe, expect, it } from "vitest";
import { notificationReadSchema, pushSubscriptionSchema } from "./schema";

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

describe("pushSubscriptionSchema", () => {
  it("accepts a secure endpoint and base64url keys", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://push.example.test/subscription/opaque-token",
        keys: { p256dh: "A".repeat(65), auth: "B".repeat(22) },
      }).success,
    ).toBe(true);
  });

  it("rejects insecure endpoints and extra credential fields", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "http://push.example.test/subscription/token",
        keys: { p256dh: "A".repeat(65), auth: "B".repeat(22) },
      }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://push.example.test/subscription/token",
        keys: { p256dh: "A".repeat(65), auth: "B".repeat(22), secret: "extra" },
      }).success,
    ).toBe(false);
  });
});
