import { timingSafeEqual } from "node:crypto";

export type CronAuthorization = "authorized" | "forbidden" | "unconfigured";

export function authorizeCronRequest(
  request: Request,
  secret: string | undefined,
): CronAuthorization {
  if (!secret) return "unconfigured";

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (received.length !== expected.length) return "forbidden";
  return timingSafeEqual(received, expected) ? "authorized" : "forbidden";
}
