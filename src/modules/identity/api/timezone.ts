import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { apiData, apiError } from "@/shared/lib/api-response";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { updateTimezoneSchema } from "@/modules/identity/schema";

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = updateTimezoneSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid timezone.", 400);
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: { timezone: parsed.data.timezone },
    select: { timezone: true },
  });

  return apiData({
    timezone: user.timezone,
    effectiveTimezone: resolveScheduleTimezone(undefined, user.timezone),
  });
}
