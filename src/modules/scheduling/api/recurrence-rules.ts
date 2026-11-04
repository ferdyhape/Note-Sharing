import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { canEdit, getNoteAccess } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { recurrenceInputSchema } from "@/modules/scheduling/schema";
import {
  buildRRule,
  recurrenceStartDate,
  recurrenceStartsAt,
} from "@/modules/scheduling/lib/recurrence";

type RouteParams = { params: Promise<{ id: string; scheduleId: string }> };

async function authorizeSchedule(noteId: string, scheduleId: string, userId: string) {
  const access = await getNoteAccess(noteId, userId);
  if (!access) return { response: apiError("not_found", "Note not found.", 404) };
  const schedule = await prisma.noteSchedule.findFirst({ where: { id: scheduleId, noteId } });
  if (!schedule) return { response: apiError("not_found", "Schedule not found.", 404) };
  return { schedule, access };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const authorized = await authorizeSchedule(noteId, scheduleId, auth.userId);
  if ("response" in authorized) return authorized.response;

  const recurrence = await prisma.recurrenceRule.findUnique({ where: { scheduleId } });
  return apiData(recurrence);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot edit recurrence rules.", 403);

  const body = await request.json().catch(() => null);
  const parsed = recurrenceInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid recurrence rule.",
      400,
    );
  }

  const schedule = await prisma.noteSchedule.findFirst({ where: { id: scheduleId, noteId } });
  if (!schedule) return apiError("not_found", "Schedule not found.", 404);

  const startDate = recurrenceStartDate(schedule);
  if (parsed.data.untilDate && parsed.data.untilDate < startDate.toString()) {
    return apiError(
      "invalid_input",
      "Recurrence end date must not precede the schedule start.",
      400,
    );
  }

  const recurrence = await prisma.recurrenceRule.upsert({
    where: { scheduleId },
    create: {
      scheduleId,
      rrule: buildRRule(schedule, parsed.data),
      timezone: schedule.timezone,
      startsAt: recurrenceStartsAt(schedule),
      untilDate: parsed.data.untilDate ? new Date(`${parsed.data.untilDate}T00:00:00.000Z`) : null,
    },
    update: {
      rrule: buildRRule(schedule, parsed.data),
      timezone: schedule.timezone,
      startsAt: recurrenceStartsAt(schedule),
      untilDate: parsed.data.untilDate ? new Date(`${parsed.data.untilDate}T00:00:00.000Z`) : null,
      endsAt: null,
    },
  });

  return apiData(recurrence);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access))
    return apiError("forbidden", "Viewers cannot delete recurrence rules.", 403);

  const schedule = await prisma.noteSchedule.findFirst({ where: { id: scheduleId, noteId } });
  if (!schedule) return apiError("not_found", "Schedule not found.", 404);

  const deleted = await prisma.recurrenceRule.deleteMany({ where: { scheduleId } });
  if (deleted.count === 0) return apiError("not_found", "Recurrence rule not found.", 404);

  return apiData({ scheduleId });
}
