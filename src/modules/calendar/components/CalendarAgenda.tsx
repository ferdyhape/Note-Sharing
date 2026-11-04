"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { ScheduleOccurrence } from "@/modules/scheduling/lib/occurrences";
import { formatScheduleDate, formatScheduleTime } from "@/modules/scheduling/lib/schedule-time";

type AgendaEvent = ScheduleOccurrence & { noteTitle: string };

function displayDate(date: string, locale = "en-ID") {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function eventDate(event: AgendaEvent, timezone: string) {
  if (event.startDate) return event.startDate;
  return Temporal.Instant.from(event.startAtUtc!)
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
}

function eventTime(event: AgendaEvent) {
  if (event.scheduleType !== "TIMED") {
    const start = event.startDate ? formatScheduleDate(event.startDate) : "Date not set";
    const end = event.endDate ? ` – ${formatScheduleDate(event.endDate)}` : "";
    return `${start}${end} · All day`;
  }
  const start = formatScheduleTime(event.startAtUtc!, event.timezone);
  const end = event.endAtUtc ? formatScheduleTime(event.endAtUtc, event.timezone) : null;
  return `${start}${end ? ` – ${end}` : ""} · ${event.timezone}`;
}

function rangeLabel(fromDate: string, toDate: string) {
  const from = new Intl.DateTimeFormat("en-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${fromDate}T00:00:00.000Z`));
  const to = new Intl.DateTimeFormat("en-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${toDate}T00:00:00.000Z`));
  return `${from} – ${to}`;
}

function shiftDate(value: string, days: number) {
  return Temporal.PlainDate.from(value).add({ days }).toString();
}

export function CalendarAgenda({
  initialFromDate,
  timezone,
  initialEvents,
}: {
  initialFromDate: string;
  timezone: string;
  initialEvents: AgendaEvent[];
}) {
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const toDate = shiftDate(fromDate, 13);
  const groupedEvents = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const date = eventDate(event, timezone);
    groupedEvents.set(date, [...(groupedEvents.get(date) ?? []), event]);
  }

  async function loadRange(nextFromDate: string) {
    const nextRequestId = ++requestId.current;
    const nextToDate = shiftDate(nextFromDate, 13);
    setFromDate(nextFromDate);
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        from: nextFromDate,
        to: nextToDate,
        timezone,
      });
      const response = await fetch(`/api/calendar?${query}`);
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Could not load calendar.");
        return;
      }
      if (requestId.current === nextRequestId) setEvents(body.data as AgendaEvent[]);
    } catch {
      if (requestId.current === nextRequestId) setError("Could not load calendar.");
    } finally {
      if (requestId.current === nextRequestId) setLoading(false);
    }
  }

  function goToToday() {
    loadRange(Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().toString()).catch(
      () => {},
    );
  }

  return (
    <section aria-labelledby="calendar-heading">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="calendar-heading" className="text-[20px] font-semibold text-text">
            Calendar
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {rangeLabel(fromDate, toDate)} · {timezone}
          </p>
        </div>
        <nav aria-label="Calendar range" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => loadRange(shiftDate(fromDate, -14))}
            disabled={loading}
            className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised disabled:opacity-60 min-[900px]:min-h-8"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={goToToday}
            disabled={loading}
            className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:opacity-60 min-[900px]:min-h-8"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => loadRange(shiftDate(fromDate, 14))}
            disabled={loading}
            className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised disabled:opacity-60 min-[900px]:min-h-8"
          >
            Next
          </button>
        </nav>
      </header>

      {loading && (
        <p role="status" className="border-y border-rule py-3 text-[13px] text-muted">
          Loading agenda…
        </p>
      )}
      {error && (
        <div className="flex items-center justify-between gap-3 border-y border-rule py-3">
          <p role="alert" className="text-[13px] text-negative">
            {error}
          </p>
          <button
            type="button"
            onClick={() => loadRange(fromDate)}
            className="min-h-11 px-2 text-[12px] font-medium text-text underline underline-offset-2 min-[900px]:min-h-8"
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && events.length === 0 && (
        <div className="border-y border-rule py-5">
          <p className="text-[14px] font-medium text-text">Nothing scheduled in this range.</p>
          <Link
            href="/notes"
            className="mt-1 inline-block text-[13px] text-muted underline underline-offset-2"
          >
            Open Notes
          </Link>
        </div>
      )}
      {!error && events.length > 0 && (
        <div aria-busy={loading}>
          {[...groupedEvents.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([date, dayEvents]) => (
              <section
                key={date}
                className="border-t border-rule py-3"
                aria-labelledby={`day-${date}`}
              >
                <h2 id={`day-${date}`} className="mb-2 text-[13px] font-semibold text-text">
                  {displayDate(date)}
                </h2>
                <ul className="divide-y divide-rule">
                  {dayEvents.map((event) => (
                    <li
                      key={`${event.scheduleId}:${event.occurrenceKey}`}
                      className="flex flex-col gap-1 py-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between"
                    >
                      <Link
                        href={`/notes/${event.noteId}`}
                        className="min-w-0 text-[14px] font-medium text-text hover:underline"
                      >
                        {event.noteTitle || "Untitled note"}
                      </Link>
                      <span className="text-[12px] text-muted">{eventTime(event)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </section>
  );
}
