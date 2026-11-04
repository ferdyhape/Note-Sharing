import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { apiData, apiError } from "@/shared/lib/api-response";
import { resolveScheduleTimezone } from "@/shared/lib/schedule";
import { agendaQuerySchema } from "@/modules/calendar/schema";
import { getAgenda } from "@/modules/calendar/lib/get-agenda";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const parsed = agendaQuerySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    timezone: url.searchParams.get("timezone") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid calendar range.",
      400,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { timezone: true },
  });
  const timezone = resolveScheduleTimezone(
    parsed.data.timezone ?? user?.timezone ?? undefined,
    undefined,
  );
  const events = await getAgenda(auth.userId, { ...parsed.data, timezone });
  return apiData(events);
}
