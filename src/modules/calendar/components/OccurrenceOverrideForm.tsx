"use client";

import { useState, type FormEvent } from "react";
import type { ScheduleOccurrence } from "@/modules/scheduling/lib/occurrences";
import {
  instantToLocalDateTime,
  localDateTimeToInstant,
} from "@/modules/scheduling/lib/schedule-time";

const INPUT_CLASS =
  "h-9 min-w-0 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent";

export function OccurrenceOverrideForm({
  event,
  onSaved,
  onCancel,
}: {
  event: ScheduleOccurrence;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [startAtLocal, setStartAtLocal] = useState(
    event.startAtUtc ? instantToLocalDateTime(event.startAtUtc, event.timezone) : "",
  );
  const [endAtLocal, setEndAtLocal] = useState(
    event.endAtUtc ? instantToLocalDateTime(event.endAtUtc, event.timezone) : "",
  );
  const [startDate, setStartDate] = useState(event.startDate ?? "");
  const [endDate, setEndDate] = useState(event.endDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaving(true);
    setError(null);
    const body =
      event.scheduleType === "TIMED"
        ? {
            occurrenceKey: event.occurrenceKey,
            scheduleType: event.scheduleType,
            startAtUtc: localDateTimeToInstant(startAtLocal, event.timezone),
            endAtUtc: endAtLocal ? localDateTimeToInstant(endAtLocal, event.timezone) : null,
          }
        : {
            occurrenceKey: event.occurrenceKey,
            scheduleType: event.scheduleType,
            startDate,
            endDate: endDate || null,
          };

    try {
      const response = await fetch(
        `/api/notes/${event.noteId}/schedules/${event.scheduleId}/exceptions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Could not save this occurrence.");
        return;
      }
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? "That local time does not exist or is ambiguous in this timezone."
          : "Could not save this occurrence.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-2 border-t border-rule pt-3">
      <div className="grid gap-3 min-[640px]:grid-cols-2">
        {event.scheduleType === "TIMED" ? (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Starts in {event.timezone}
              <input
                required
                type="datetime-local"
                value={startAtLocal}
                onChange={(inputEvent) => setStartAtLocal(inputEvent.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Ends (optional)
              <input
                type="datetime-local"
                value={endAtLocal}
                onChange={(inputEvent) => setEndAtLocal(inputEvent.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              {event.scheduleType === "RANGE" ? "Starts" : "Date"}
              <input
                required
                type="date"
                value={startDate}
                onChange={(inputEvent) => setStartDate(inputEvent.target.value)}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              {event.scheduleType === "RANGE" ? "Ends" : "End date (optional)"}
              <input
                required={event.scheduleType === "RANGE"}
                type="date"
                value={endDate}
                onChange={(inputEvent) => setEndDate(inputEvent.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[13px] text-negative">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:opacity-60 min-[900px]:min-h-8"
        >
          {saving ? "Saving…" : "Save occurrence"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised min-[900px]:min-h-8"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
