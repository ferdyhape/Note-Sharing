import type { ScheduleType } from "@prisma/client";

export type RecurrenceDTO = {
  id: string;
  scheduleId: string;
  rrule: string;
  timezone: string;
  startsAt: string;
  endsAt: string | null;
  untilDate: string | null;
};

export type ScheduleDTO = {
  id: string;
  noteId: string;
  scheduleType: ScheduleType;
  startAtUtc: string | null;
  endAtUtc: string | null;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  recurrence: RecurrenceDTO | null;
};
