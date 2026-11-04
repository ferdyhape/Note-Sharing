import { describe, expect, it } from "vitest";
import { authorizeCronRequest } from "./cron-auth";

describe("authorizeCronRequest", () => {
  it("requires a configured secret and matching bearer header", () => {
    expect(authorizeCronRequest(new Request("https://example.test"), undefined)).toBe(
      "unconfigured",
    );
    expect(
      authorizeCronRequest(
        new Request("https://example.test", { headers: { authorization: "Bearer test-secret" } }),
        "test-secret",
      ),
    ).toBe("authorized");
  });

  it("rejects missing and incorrect bearer headers", () => {
    expect(authorizeCronRequest(new Request("https://example.test"), "test-secret")).toBe(
      "forbidden",
    );
    expect(
      authorizeCronRequest(
        new Request("https://example.test", { headers: { authorization: "Bearer wrong" } }),
        "test-secret",
      ),
    ).toBe("forbidden");
  });
});
