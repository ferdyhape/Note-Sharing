import { auth } from "@/shared/lib/auth";
import { apiError } from "@/shared/lib/api-response";

/**
 * Every Note/Property/Schedule/Reminder route starts with this — authorization
 * is checked before any data is read (03_Technical_Architecture.md §7, IDOR
 * prevention). Returns the session's user id, or a 401 response to return
 * directly from the route handler.
 */
export async function requireUser(): Promise<{ userId: string } | Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("unauthorized", "Sign in required.", 401);
  }
  return { userId: session.user.id };
}
