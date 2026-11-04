import { Temporal } from "@js-temporal/polyfill";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { canEdit, getNoteAccess } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { overrideOccurrenceSchema, skipOccurrenceSchema } from "@/modules/scheduling/schema";
import { expandScheduleOccurrences } from "@/modules/scheduling/lib/occurrences";

type RouteParams = { params: Promise<{ id: string; scheduleId: string }> };

async function loadEditableSchedule(noteId: string, scheduleId: string, userId: string) {
  const access = await getNoteAccess(noteId, userId);
  if (!access) return { response: apiError("not_found", "Note not found.", 404) };
  if (!canEdit(access))
    return { response: apiError("forbidden", "Viewers cannot edit schedule exceptions.", 403) };

  const schedule = await prisma.noteSchedule.findFirst({
    where: { id: scheduleId, noteId },
    include: { recurrence: true },
  });
  if (!schedule) return { response: apiError("not_found", "Schedule not found.", 404) };
  if (!schedule.recurrence) {
    return { response: apiError("invalid_input", "Exceptions require a recurring schedule.", 400) };
  }

  return { schedule, recurrence: schedule.recurrence };
}

function occurrenceWindowDate(scheduleType: string, occurrenceKey: string, timezone: string) {
  return scheduleType === "TIMED"
    ? Temporal.Instant.from(occurrenceKey).toZonedDateTimeISO(timezone).toPlainDate().toString()
    : occurrenceKey.slice(0, 10);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = skipOccurrenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid occurrence key.",
      400,
    );
  }

  const loaded = await loadEditableSchedule(noteId, scheduleId, auth.userId);
  if ("response" in loaded) return loaded.response;

  const fromDate = occurrenceWindowDate(
    loaded.schedule.scheduleType,
    parsed.data.occurrenceKey,
    loaded.schedule.timezone,
  );
  const occurrenceExists = expandScheduleOccurrences(loaded.schedule, loaded.recurrence, [], {
    fromDate,
    toDate: fromDate,
    timezone: loaded.schedule.timezone,
  }).some((occurrence) => occurrence.occurrenceKey === parsed.data.occurrenceKey);
  if (!occurrenceExists) {
    return apiError("not_found", "Occurrence not found in this recurrence.", 404);
  }

  const recurrenceId = loaded.recurrence.id;
  const existingException = await prisma.scheduleException.findUnique({
    where: {
      scheduleId_occurrenceKey: {
        scheduleId: recurrenceId,
        occurrenceKey: parsed.data.occurrenceKey,
      },
    },
  });
  if (existingException && existingException.exceptionType !== "SKIP") {
    return apiError("exception_conflict", "This occurrence already has an override.", 409);
  }

  const exception = await prisma.scheduleException.upsert({
    where: {
      scheduleId_occurrenceKey: {
        scheduleId: recurrenceId,
        occurrenceKey: parsed.data.occurrenceKey,
      },
    },
    create: {
      scheduleId: recurrenceId,
      occurrenceKey: parsed.data.occurrenceKey,
      exceptionType: "SKIP",
    },
    update: { exceptionType: "SKIP", overrideJson: Prisma.DbNull },
  });

  return apiData(exception, { status: 201 });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = overrideOccurrenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid occurrence override.",
      400,
    );
  }

  const loaded = await loadEditableSchedule(noteId, scheduleId, auth.userId);
  if ("response" in loaded) return loaded.response;
  if (parsed.data.scheduleType !== loaded.schedule.scheduleType) {
    return apiError("invalid_input", "An occurrence override must keep the schedule type.", 400);
  }

  const fromDate = occurrenceWindowDate(
    loaded.schedule.scheduleType,
    parsed.data.occurrenceKey,
    loaded.schedule.timezone,
  );
  const occurrenceExists = expandScheduleOccurrences(loaded.schedule, loaded.recurrence, [], {
    fromDate,
    toDate: fromDate,
    timezone: loaded.schedule.timezone,
  }).some((occurrence) => occurrence.occurrenceKey === parsed.data.occurrenceKey);
  if (!occurrenceExists) {
    return apiError("not_found", "Occurrence not found in this recurrence.", 404);
  }

  const recurrenceId = loaded.recurrence.id;
  const existingException = await prisma.scheduleException.findUnique({
    where: {
      scheduleId_occurrenceKey: {
        scheduleId: recurrenceId,
        occurrenceKey: parsed.data.occurrenceKey,
      },
    },
  });
  if (existingException?.exceptionType === "SKIP") {
    return apiError(
      "exception_conflict",
      "Remove the skipped exception before overriding it.",
      409,
    );
  }

  const { occurrenceKey, ...override } = parsed.data;
  const exception = await prisma.scheduleException.upsert({
    where: { scheduleId_occurrenceKey: { scheduleId: recurrenceId, occurrenceKey } },
    create: {
      scheduleId: recurrenceId,
      occurrenceKey,
      exceptionType: "OVERRIDE",
      overrideJson: override as Prisma.InputJsonValue,
    },
    update: {
      exceptionType: "OVERRIDE",
      overrideJson: override as Prisma.InputJsonValue,
    },
  });

  return apiData(exception);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, scheduleId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = skipOccurrenceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid occurrence key.",
      400,
    );
  }

  const loaded = await loadEditableSchedule(noteId, scheduleId, auth.userId);
  if ("response" in loaded) return loaded.response;

  const deleted = await prisma.scheduleException.deleteMany({
    where: {
      scheduleId: loaded.recurrence.id,
      occurrenceKey: parsed.data.occurrenceKey,
    },
  });
  if (deleted.count === 0) return apiError("not_found", "Occurrence exception not found.", 404);

  return apiData({ scheduleId, occurrenceKey: parsed.data.occurrenceKey });
}
