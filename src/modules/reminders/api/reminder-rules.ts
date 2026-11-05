import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { canEdit, getNoteAccess } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { reminderRuleSchema, type ReminderRuleInput } from "@/modules/reminders/schema";

type CollectionRouteParams = { params: Promise<{ id: string }> };
type ItemRouteParams = { params: Promise<{ id: string; reminderId: string }> };

async function validateRule(noteId: string, input: ReminderRuleInput) {
  // The owner never has a NoteShare row (ADR-0003) but is always a valid
  // recipient on their own Note — FR-012 lists Owner/Editor/Viewer alike.
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { ownerId: true } });
  if (!note) return apiError("not_found", "Note not found.", 404);

  const shares = await prisma.noteShare.findMany({
    where: { noteId, userId: { in: input.recipientUserIds } },
    select: { userId: true },
  });
  const validRecipientIds = new Set([note.ownerId, ...shares.map((share) => share.userId)]);
  if (!input.recipientUserIds.every((userId) => validRecipientIds.has(userId))) {
    return apiError(
      "invalid_recipient",
      "Recipients must be the Note's owner or have access through its share list.",
      400,
    );
  }

  if (input.triggerMode === "SCHEDULE_RELATIVE") {
    const schedule = await prisma.noteSchedule.findFirst({
      where: {
        id: input.scheduleId,
        noteId,
        scheduleType: "TIMED",
        enabled: true,
      },
      select: { id: true },
    });
    if (!schedule) {
      return apiError(
        "invalid_schedule",
        "Schedule reminders require an enabled timed schedule on this Note.",
        400,
      );
    }
  }

  return null;
}

function reminderFields(input: ReminderRuleInput) {
  return input.triggerMode === "FIXED"
    ? {
        triggerMode: input.triggerMode,
        scheduleId: null,
        offsetSeconds: null,
        fixedTriggerAt: new Date(input.fixedTriggerAt),
      }
    : {
        triggerMode: input.triggerMode,
        scheduleId: input.scheduleId,
        offsetSeconds: input.offsetSeconds,
        fixedTriggerAt: null,
      };
}

const reminderInclude = {
  recipients: { select: { id: true, userId: true, enabled: true } },
} as const;

export async function GET(_request: Request, { params }: CollectionRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);

  const reminders = await prisma.reminder.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
    include: reminderInclude,
  });
  return apiData(reminders);
}

export async function POST(request: Request, { params }: CollectionRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot add reminders.", 403);

  const body = await request.json().catch(() => null);
  const parsed = reminderRuleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const invalidRule = await validateRule(noteId, parsed.data);
  if (invalidRule) return invalidRule;

  const reminder = await prisma.$transaction(async (transaction) => {
    const created = await transaction.reminder.create({
      data: {
        noteId,
        ...reminderFields(parsed.data),
        enabled: parsed.data.enabled ?? true,
      },
    });
    await transaction.reminderRecipient.createMany({
      data: parsed.data.recipientUserIds.map((userId) => ({ reminderId: created.id, userId })),
    });
    return transaction.reminder.findUniqueOrThrow({
      where: { id: created.id },
      include: reminderInclude,
    });
  });

  return apiData(reminder, { status: 201 });
}

export async function PATCH(request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, reminderId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot edit reminders.", 403);

  const existing = await prisma.reminder.findFirst({ where: { id: reminderId, noteId } });
  if (!existing) return apiError("not_found", "Reminder not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = reminderRuleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const invalidRule = await validateRule(noteId, parsed.data);
  if (invalidRule) return invalidRule;

  const reminder = await prisma.$transaction(async (transaction) => {
    await transaction.reminder.update({
      where: { id: reminderId },
      data: {
        ...reminderFields(parsed.data),
        enabled: parsed.data.enabled ?? existing.enabled,
      },
    });
    await transaction.reminderRecipient.deleteMany({ where: { reminderId } });
    await transaction.reminderRecipient.createMany({
      data: parsed.data.recipientUserIds.map((userId) => ({ reminderId, userId })),
    });
    return transaction.reminder.findUniqueOrThrow({
      where: { id: reminderId },
      include: reminderInclude,
    });
  });

  return apiData(reminder);
}

export async function DELETE(_request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, reminderId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot delete reminders.", 403);

  const existing = await prisma.reminder.findFirst({ where: { id: reminderId, noteId } });
  if (!existing) return apiError("not_found", "Reminder not found.", 404);

  await prisma.reminder.delete({ where: { id: reminderId } });
  return apiData({ id: reminderId });
}
