import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { expandScheduleOccurrences } from "@/modules/scheduling/lib/occurrences";
import { makeCalendarWindow } from "@/modules/calendar/lib/calendar-window";
import type { AgendaQuery } from "@/modules/calendar/schema";

export async function getAgenda(userId: string, query: AgendaQuery & { timezone: string }) {
  const window = makeCalendarWindow(query, query.timezone);
  const notes = await prisma.note.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    select: { id: true, title: true },
  });
  if (notes.length === 0) return [];

  const noteById = new Map(notes.map((note) => [note.id, note]));
  const dateFrom = new Date(`${query.from}T00:00:00.000Z`);
  const dateTo = new Date(`${query.to}T00:00:00.000Z`);
  const scheduleWhere: Prisma.NoteScheduleWhereInput = {
    noteId: { in: notes.map((note) => note.id) },
    enabled: true,
    OR: [
      {
        recurrence: {
          is: {
            startsAt: { lt: window.endsAtUtc },
            OR: [{ untilDate: null }, { untilDate: { gte: dateFrom } }],
          },
        },
      },
      {
        scheduleType: "TIMED",
        OR: [
          { startAtUtc: { gte: window.startsAtUtc, lt: window.endsAtUtc } },
          { startAtUtc: { lt: window.startsAtUtc }, endAtUtc: { gte: window.startsAtUtc } },
        ],
      },
      {
        scheduleType: { in: ["ALL_DAY", "RANGE"] },
        OR: [
          { startDate: { gte: dateFrom, lt: window.endsBeforeDate } },
          { startDate: { lt: dateFrom }, endDate: { gte: dateFrom } },
          { startDate: { lte: dateTo }, endDate: { gte: dateFrom } },
        ],
      },
    ],
  };

  const schedules = await prisma.noteSchedule.findMany({
    where: scheduleWhere,
    include: { recurrence: { include: { exceptions: true } } },
  });

  const events = schedules.flatMap((schedule) => {
    const note = noteById.get(schedule.noteId);
    if (!note) return [];
    return expandScheduleOccurrences(
      schedule,
      schedule.recurrence,
      schedule.recurrence?.exceptions ?? [],
      { fromDate: query.from, toDate: query.to, timezone: query.timezone },
    ).map((occurrence) => ({ ...occurrence, noteTitle: note.title }));
  });

  events.sort((left, right) => {
    const leftStart = left.startAtUtc ?? `${left.startDate}T00:00:00.000Z`;
    const rightStart = right.startAtUtc ?? `${right.startDate}T00:00:00.000Z`;
    return leftStart.localeCompare(rightStart);
  });

  return events;
}
