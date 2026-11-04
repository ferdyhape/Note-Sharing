import { Temporal } from "@js-temporal/polyfill";
import type { ScheduleOccurrence } from "@/modules/scheduling/lib/occurrences";

export type CalendarEvent = ScheduleOccurrence & { noteTitle: string };

export function groupCalendarEventsByDate(
  events: CalendarEvent[],
  fromDate: string,
  toDate: string,
) {
  const windowStart = Temporal.PlainDate.from(fromDate);
  const windowEnd = Temporal.PlainDate.from(toDate);
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    let startDate: Temporal.PlainDate;
    let endDate: Temporal.PlainDate;

    if (event.scheduleType === "TIMED") {
      const start = Temporal.Instant.from(event.startAtUtc!).toZonedDateTimeISO(event.timezone);
      startDate = start.toPlainDate();
      endDate = event.endAtUtc
        ? Temporal.Instant.from(event.endAtUtc).toZonedDateTimeISO(event.timezone).toPlainDate()
        : startDate;

      if (
        event.endAtUtc &&
        Temporal.Instant.compare(
          Temporal.Instant.from(event.endAtUtc),
          Temporal.Instant.from(event.startAtUtc!),
        ) > 0 &&
        Temporal.Instant.from(event.endAtUtc)
          .toZonedDateTimeISO(event.timezone)
          .toPlainTime()
          .equals(Temporal.PlainTime.from("00:00"))
      ) {
        endDate = endDate.subtract({ days: 1 });
      }
    } else {
      startDate = Temporal.PlainDate.from(event.startDate!);
      endDate = event.endDate ? Temporal.PlainDate.from(event.endDate) : startDate;
    }

    if (
      Temporal.PlainDate.compare(endDate, windowStart) < 0 ||
      Temporal.PlainDate.compare(startDate, windowEnd) > 0
    ) {
      continue;
    }

    const clippedStart =
      Temporal.PlainDate.compare(startDate, windowStart) < 0 ? windowStart : startDate;
    const clippedEnd = Temporal.PlainDate.compare(endDate, windowEnd) > 0 ? windowEnd : endDate;
    for (
      let date = clippedStart;
      Temporal.PlainDate.compare(date, clippedEnd) <= 0;
      date = date.add({ days: 1 })
    ) {
      const key = date.toString();
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
  }

  for (const dayEvents of grouped.values()) {
    dayEvents.sort((left, right) => {
      const leftTimed = left.scheduleType === "TIMED";
      const rightTimed = right.scheduleType === "TIMED";
      if (leftTimed !== rightTimed) return leftTimed ? 1 : -1;
      const leftStart = left.startAtUtc ?? `${left.startDate}T00:00:00.000Z`;
      const rightStart = right.startAtUtc ?? `${right.startDate}T00:00:00.000Z`;
      return leftStart.localeCompare(rightStart);
    });
  }

  return grouped;
}
