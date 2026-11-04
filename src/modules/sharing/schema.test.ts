import { describe, expect, it } from "vitest";
import { createShareSchema, updateShareSchema } from "./schema";

describe("share schemas", () => {
  it("normalizes an account email and accepts a share role", () => {
    expect(createShareSchema.parse({ email: "  Reader@Example.com ", role: "VIEWER" })).toEqual({
      email: "reader@example.com",
      role: "VIEWER",
    });
  });

  it("rejects malformed addresses, Owner grants, and unexpected fields", () => {
    expect(createShareSchema.safeParse({ email: "not-an-email", role: "VIEWER" }).success).toBe(
      false,
    );
    expect(createShareSchema.safeParse({ email: "owner@example.com", role: "OWNER" }).success).toBe(
      false,
    );
    expect(updateShareSchema.safeParse({ role: "EDITOR", userId: "another-user" }).success).toBe(
      false,
    );
  });
});
