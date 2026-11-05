import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess, canEdit } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { createScheduleSchema, updateScheduleSchema } from "@/shared/lib/validation/schedule";
import {
  mergeSchedulePatch,
  resolveScheduleTimezone,
  toScheduleFields,
} from "@/shared/lib/schedule";
import { recurrenceStartDate, recurrenceStartsAt } from "@/modules/scheduling/lib/recurrence";

type CollectionRouteParams = { params: Promise<{ id: string }> };
type ItemRouteParams = { params: Promise<{ id: string; scheduleId: string }> };

async function getUserTimezone(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  return user?.timezone;
}

export async function GET(_request: Request, { params }: CollectionRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);

  const schedules = await prisma.noteSchedule.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
    include: { recurrence: true },
  });

  return apiData(schedules);
}

export async function POST(request: Request, { params }: CollectionRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot add schedules.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const userTimezone = parsed.data.timezone ? undefined : await getUserTimezone(auth.userId);
  const timezone = resolveScheduleTimezone(parsed.data.timezone, userTimezone);
  const schedule = await prisma.noteSchedule.create({
    data: { noteId, ...toScheduleFields({ ...parsed.data, timezone }) },
    include: { recurrence: true },
  });

  return apiData(schedule, { status: 201 });
}

export async function PATCH(request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot edit schedules.", 403);

  const body = await request.json().catch(() => null);
  const patch = updateScheduleSchema.safeParse(body);
  if (!patch.success) {
    return apiError("invalid_input", patch.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const existing = await prisma.noteSchedule.findFirst({ where: { id: scheduleId, noteId } });
  if (!existing) return apiError("not_found", "Schedule not found.", 404);

  const { enabled, parsedSchedule } = mergeSchedulePatch(existing, patch.data);
  if (!parsedSchedule.success) {
    return apiError(
      "invalid_input",
      parsedSchedule.error.issues[0]?.message ?? "Invalid schedule update.",
      400,
    );
  }

  const recurrence = await prisma.recurrenceRule.findUnique({ where: { scheduleId } });
  const scheduleFields = toScheduleFields({
    ...parsedSchedule.data,
    timezone: parsedSchedule.data.timezone ?? existing.timezone,
  });
  const updatedStartDate = recurrenceStartDate({ ...existing, ...scheduleFields });
  if (
    recurrence?.untilDate &&
    recurrence.untilDate.toISOString().slice(0, 10) < updatedStartDate.toString()
  ) {
    return apiError(
      "invalid_input",
      "Schedule start must not be after its recurrence end date.",
      400,
    );
  }

  const schedule = await prisma.$transaction(async (transaction) => {
    const updatedSchedule = await transaction.noteSchedule.update({
      where: { id: scheduleId },
      data: { ...scheduleFields, ...(enabled === undefined ? {} : { enabled }) },
      include: { recurrence: true },
    });
    const updatedRecurrence = recurrence
      ? await transaction.recurrenceRule.update({
          where: { id: recurrence.id },
          data: {
            timezone: updatedSchedule.timezone,
            startsAt: recurrenceStartsAt(updatedSchedule),
          },
        })
      : null;
    return { ...updatedSchedule, recurrence: updatedRecurrence };
  });

  return apiData(schedule);
}

export async function DELETE(_request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot delete schedules.", 403);

  const existing = await prisma.noteSchedule.findFirst({ where: { id: scheduleId, noteId } });
  if (!existing) return apiError("not_found", "Schedule not found.", 404);

  await prisma.noteSchedule.delete({ where: { id: scheduleId } });

  return apiData({ id: scheduleId });
}
