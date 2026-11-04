"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { ScheduleOccurrence } from "@/modules/scheduling/lib/occurrences";
import { formatScheduleDate, formatScheduleTime } from "@/modules/scheduling/lib/schedule-time";
import {
  isInMonth,
  monthGridDates,
  shiftMonth,
  weekGridDates,
} from "@/modules/calendar/lib/month-grid";

type AgendaEvent = ScheduleOccurrence & { noteTitle: string };
type CalendarView = "AGENDA" | "WEEK" | "MONTH";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month.slice(0, 7)}-01T00:00:00.000Z`));
}

function shiftDate(value: string, days: number) {
  return Temporal.PlainDate.from(value).add({ days }).toString();
}

function SelectedDayEvents({ date, events }: { date: string; events: AgendaEvent[] }) {
  return (
    <section className="mt-5" aria-labelledby="selected-date-heading">
      <h2 id="selected-date-heading" className="mb-2 text-[14px] font-semibold text-text">
        {displayDate(date)}
      </h2>
      {events.length === 0 ? (
        <p className="border-t border-rule py-3 text-[13px] text-muted">Nothing scheduled.</p>
      ) : (
        <ul className="divide-y divide-rule border-t border-rule">
          {events.map((event) => (
            <li
              key={`${event.scheduleId}:${event.occurrenceKey}`}
              className="flex flex-col gap-1 py-3 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between"
            >
              <Link
                href={`/notes/${event.noteId}`}
                className="text-[14px] font-medium text-text hover:underline"
              >
                {event.noteTitle || "Untitled note"}
              </Link>
              <span className="text-[12px] text-muted">{eventTime(event)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
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
  const [month, setMonth] = useState(`${initialFromDate.slice(0, 7)}-01`);
  const [selectedDate, setSelectedDate] = useState(initialFromDate);
  const [view, setView] = useState<CalendarView>("AGENDA");
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const monthDates = monthGridDates(month);
  const monthFromDate = monthDates[0]!.toString();
  const monthToDate = monthDates.at(-1)!.toString();
  const weekDates = weekGridDates(fromDate);
  const weekFromDate = weekDates[0]!.toString();
  const weekToDate = weekDates.at(-1)!.toString();
  const toDate =
    view === "AGENDA" ? shiftDate(fromDate, 13) : view === "WEEK" ? weekToDate : monthToDate;
  const rangeFromDate =
    view === "AGENDA" ? fromDate : view === "WEEK" ? weekFromDate : monthFromDate;
  const rangeText =
    view === "AGENDA"
      ? rangeLabel(fromDate, toDate)
      : view === "WEEK"
        ? rangeLabel(weekFromDate, weekToDate)
        : monthLabel(month);
  const groupedEvents = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const date = eventDate(event, timezone);
    groupedEvents.set(date, [...(groupedEvents.get(date) ?? []), event]);
  }

  async function loadRange(nextFromDate: string, nextToDate: string) {
    const nextRequestId = ++requestId.current;
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

  function changeView(nextView: CalendarView) {
    if (nextView === view) return;
    setView(nextView);
    const anchorDate = view === "AGENDA" ? fromDate : selectedDate;
    if (nextView === "MONTH") {
      const nextMonth = `${anchorDate.slice(0, 7)}-01`;
      const dates = monthGridDates(nextMonth);
      const nextSelectedDate =
        anchorDate.slice(0, 7) === nextMonth.slice(0, 7) ? anchorDate : nextMonth;
      setFromDate(nextSelectedDate);
      setMonth(nextMonth);
      setSelectedDate(nextSelectedDate);
      void loadRange(dates[0]!.toString(), dates.at(-1)!.toString());
      return;
    }
    if (nextView === "WEEK") {
      const dates = weekGridDates(anchorDate);
      const nextWeekStart = dates[0]!.toString();
      setFromDate(nextWeekStart);
      setSelectedDate(anchorDate);
      void loadRange(nextWeekStart, dates.at(-1)!.toString());
      return;
    }
    setFromDate(anchorDate);
    setSelectedDate(anchorDate);
    void loadRange(anchorDate, shiftDate(anchorDate, 13));
  }

  function navigateRange(direction: -1 | 1) {
    if (view === "AGENDA") {
      const nextFromDate = shiftDate(fromDate, direction * 14);
      setFromDate(nextFromDate);
      void loadRange(nextFromDate, shiftDate(nextFromDate, 13));
      return;
    }

    if (view === "WEEK") {
      const nextWeekStart = shiftDate(weekFromDate, direction * 7);
      const dates = weekGridDates(nextWeekStart);
      setFromDate(nextWeekStart);
      setSelectedDate(nextWeekStart);
      void loadRange(dates[0]!.toString(), dates.at(-1)!.toString());
      return;
    }

    const nextMonth = shiftMonth(month, direction);
    const dates = monthGridDates(nextMonth);
    setMonth(nextMonth);
    setSelectedDate(nextMonth);
    void loadRange(dates[0]!.toString(), dates.at(-1)!.toString());
  }

  function goToToday() {
    const today = Temporal.Now.instant().toZonedDateTimeISO(timezone).toPlainDate().toString();
    setFromDate(today);
    setMonth(`${today.slice(0, 7)}-01`);
    setSelectedDate(today);
    if (view === "AGENDA") {
      void loadRange(today, shiftDate(today, 13));
      return;
    }
    if (view === "WEEK") {
      const dates = weekGridDates(today);
      void loadRange(dates[0]!.toString(), dates.at(-1)!.toString());
      return;
    }
    const dates = monthGridDates(today);
    void loadRange(dates[0]!.toString(), dates.at(-1)!.toString());
  }

  const selectedDayEvents = groupedEvents.get(selectedDate) ?? [];

  return (
    <section aria-labelledby="calendar-heading">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="calendar-heading" className="text-[20px] font-semibold text-text">
            Calendar
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {rangeText} · {timezone}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Calendar view"
            className="flex rounded-control border border-control p-0.5"
          >
            {(["AGENDA", "WEEK", "MONTH"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={view === option}
                onClick={() => changeView(option)}
                className={`min-h-10 rounded-[4px] px-3 text-[12px] font-medium min-[900px]:min-h-7 ${view === option ? "bg-text text-ground" : "text-muted hover:text-text"}`}
              >
                {option === "AGENDA" ? "Agenda" : option === "WEEK" ? "Week" : "Month"}
              </button>
            ))}
          </div>
          <nav aria-label="Calendar range" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateRange(-1)}
              disabled={loading}
              className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised disabled:opacity-60 min-[900px]:min-h-8"
            >
              {view === "AGENDA"
                ? "Previous"
                : view === "WEEK"
                  ? "Previous week"
                  : "Previous month"}
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
              onClick={() => navigateRange(1)}
              disabled={loading}
              className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised disabled:opacity-60 min-[900px]:min-h-8"
            >
              {view === "AGENDA" ? "Next" : view === "WEEK" ? "Next week" : "Next month"}
            </button>
          </nav>
        </div>
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
            onClick={() => loadRange(rangeFromDate, toDate)}
            className="min-h-11 px-2 text-[12px] font-medium text-text underline underline-offset-2 min-[900px]:min-h-8"
          >
            Retry
          </button>
        </div>
      )}
      {view === "AGENDA" && !loading && !error && events.length === 0 && (
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
      {!error && view === "WEEK" && (
        <div aria-busy={loading}>
          <div className="grid grid-cols-7 border-y border-rule">
            {weekDates.map((date) => {
              const dateValue = date.toString();
              const dayEvents = groupedEvents.get(dateValue) ?? [];
              const selected = selectedDate === dateValue;
              return (
                <button
                  key={dateValue}
                  type="button"
                  aria-label={`${displayDate(dateValue)}${dayEvents.length ? `, ${dayEvents.length} scheduled` : ", no schedules"}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedDate(dateValue)}
                  className={`flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-1 border-r border-rule px-0.5 py-2 text-[11px] last:border-r-0 min-[640px]:min-h-[76px] min-[640px]:text-[12px] ${selected ? "bg-raised text-text" : "text-muted hover:bg-raised/60"}`}
                >
                  <span>{WEEKDAYS[date.dayOfWeek - 1]}</span>
                  <span className="tabular-nums">{date.day}</span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-accent">{dayEvents.length}</span>
                  )}
                </button>
              );
            })}
          </div>
          <SelectedDayEvents date={selectedDate} events={selectedDayEvents} />
        </div>
      )}
      {!error && view === "MONTH" && (
        <div aria-busy={loading}>
          <div className="grid grid-cols-7 border-y border-rule" aria-label={monthLabel(month)}>
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2 text-center text-[11px] font-medium text-muted">
                {day}
              </div>
            ))}
            {monthDates.map((date) => {
              const dateValue = date.toString();
              const dayEvents = groupedEvents.get(dateValue) ?? [];
              const selected = selectedDate === dateValue;
              return (
                <button
                  key={dateValue}
                  type="button"
                  aria-label={`${displayDate(dateValue)}${dayEvents.length ? `, ${dayEvents.length} scheduled` : ", no schedules"}`}
                  aria-pressed={selected}
                  onClick={() => setSelectedDate(dateValue)}
                  className={`flex min-h-[58px] min-w-0 flex-col items-center justify-start gap-1 border-t border-rule px-0.5 py-2 text-[12px] min-[640px]:min-h-[76px] min-[640px]:items-start min-[640px]:px-2 ${!isInMonth(date, month) ? "text-faint" : "text-text"} ${selected ? "bg-raised" : "hover:bg-raised/60"}`}
                >
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full tabular-nums ${selected ? "bg-text text-ground" : ""}`}
                  >
                    {date.day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="max-w-full truncate text-[10px] text-accent min-[640px]:text-[11px]">
                      {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <SelectedDayEvents date={selectedDate} events={selectedDayEvents} />
        </div>
      )}
      {!error && view === "AGENDA" && events.length > 0 && (
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
