"use client";

import { useState, type FormEvent } from "react";
import type { ScheduleType } from "@prisma/client";
import {
  formatScheduleDate,
  formatScheduleTime,
  instantToLocalDateTime,
  schedulePayloadFromDraft,
} from "@/modules/scheduling/lib/schedule-time";

type ScheduleDateFields = {
  startAtUtc: string | null;
  endAtUtc: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type ScheduleDTO = ScheduleDateFields & {
  id: string;
  noteId: string;
  scheduleType: ScheduleType;
  timezone: string;
  enabled: boolean;
  createdAt: string;
};

type ScheduleDraft = {
  scheduleType: ScheduleType;
  timezone: string;
  startDate: string;
  endDate: string;
  startAtLocal: string;
  endAtLocal: string;
};

const INPUT_CLASS =
  "h-9 min-w-0 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent";
const ACTION_CLASS =
  "min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8";

function emptyDraft(timezone: string): ScheduleDraft {
  return {
    scheduleType: "ALL_DAY",
    timezone,
    startDate: "",
    endDate: "",
    startAtLocal: "",
    endAtLocal: "",
  };
}

function draftFromSchedule(schedule: ScheduleDTO): ScheduleDraft {
  return {
    scheduleType: schedule.scheduleType,
    timezone: schedule.timezone,
    startDate: schedule.startDate?.slice(0, 10) ?? "",
    endDate: schedule.endDate?.slice(0, 10) ?? "",
    startAtLocal: schedule.startAtUtc
      ? instantToLocalDateTime(schedule.startAtUtc, schedule.timezone)
      : "",
    endAtLocal: schedule.endAtUtc
      ? instantToLocalDateTime(schedule.endAtUtc, schedule.timezone)
      : "",
  };
}

function scheduleSummary(schedule: ScheduleDTO) {
  if (schedule.scheduleType === "TIMED") {
    const start = schedule.startAtUtc
      ? formatScheduleTime(schedule.startAtUtc, schedule.timezone)
      : "—";
    const end = schedule.endAtUtc ? formatScheduleTime(schedule.endAtUtc, schedule.timezone) : null;
    return end ? `${start} – ${end}` : start;
  }

  const start = schedule.startDate ? formatScheduleDate(schedule.startDate) : "—";
  const end = schedule.endDate ? formatScheduleDate(schedule.endDate) : null;
  return end ? `${start} – ${end}` : start;
}

function ScheduleForm({
  initialDraft,
  editing,
  saving,
  error,
  onCancel,
  onSubmit,
  onDraftChange,
}: {
  initialDraft: ScheduleDraft;
  editing: boolean;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraftChange: (draft: ScheduleDraft) => void;
}) {
  const update = (fields: Partial<ScheduleDraft>) => onDraftChange({ ...initialDraft, ...fields });
  const dateOnly = initialDraft.scheduleType !== "TIMED";

  return (
    <form onSubmit={onSubmit} className="mt-3 border-t border-rule pt-3">
      <div className="grid gap-3 min-[640px]:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
          Schedule type
          <select
            value={initialDraft.scheduleType}
            onChange={(event) => update({ scheduleType: event.target.value as ScheduleType })}
            disabled={editing}
            className={INPUT_CLASS}
          >
            <option value="ALL_DAY">All day</option>
            <option value="TIMED">Timed</option>
            <option value="RANGE">Date range</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
          IANA timezone
          <input
            required
            value={initialDraft.timezone}
            onChange={(event) => update({ timezone: event.target.value })}
            placeholder="Asia/Jakarta"
            className={INPUT_CLASS}
          />
        </label>
        {dateOnly ? (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              {initialDraft.scheduleType === "RANGE" ? "Starts" : "Date"}
              <input
                required
                type="date"
                value={initialDraft.startDate}
                onChange={(event) => update({ startDate: event.target.value })}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              {initialDraft.scheduleType === "RANGE" ? "Ends" : "End date (optional)"}
              <input
                required={initialDraft.scheduleType === "RANGE"}
                type="date"
                value={initialDraft.endDate}
                onChange={(event) => update({ endDate: event.target.value })}
                className={INPUT_CLASS}
              />
            </label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Starts
              <input
                required
                type="datetime-local"
                value={initialDraft.startAtLocal}
                onChange={(event) => update({ startAtLocal: event.target.value })}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Ends (optional)
              <input
                type="datetime-local"
                value={initialDraft.endAtLocal}
                onChange={(event) => update({ endAtLocal: event.target.value })}
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
          {saving ? "Saving…" : editing ? "Save schedule" : "Add schedule"}
        </button>
        <button type="button" onClick={onCancel} className={ACTION_CLASS}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SchedulePanel({
  noteId,
  initialSchedules,
  defaultTimezone,
  canEdit,
}: {
  noteId: string;
  initialSchedules: ScheduleDTO[];
  defaultTimezone: string;
  canEdit: boolean;
}) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setError(null);
    setEditingId(null);
    setDraft(emptyDraft(defaultTimezone));
  }

  function startEdit(schedule: ScheduleDTO) {
    setError(null);
    setEditingId(schedule.id);
    setDraft(draftFromSchedule(schedule));
  }

  function cancelForm() {
    setDraft(null);
    setEditingId(null);
    setError(null);
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    setSaving(true);

    try {
      const payload = schedulePayloadFromDraft(draft, editingId !== null);
      const response = await fetch(
        editingId
          ? `/api/notes/${noteId}/schedules/${editingId}`
          : `/api/notes/${noteId}/schedules`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Could not save schedule.");
        return;
      }

      const schedule = body.data as ScheduleDTO;
      setSchedules((current) =>
        editingId
          ? current.map((item) => (item.id === schedule.id ? schedule : item))
          : [schedule, ...current],
      );
      cancelForm();
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? "That local time does not exist or is ambiguous in this timezone."
          : "Could not save schedule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSchedule(schedule: ScheduleDTO) {
    setError(null);
    const response = await fetch(`/api/notes/${noteId}/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !schedule.enabled }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error?.message ?? "Could not update schedule.");
      return;
    }
    setSchedules((current) =>
      current.map((item) => (item.id === schedule.id ? (body.data as ScheduleDTO) : item)),
    );
  }

  async function deleteSchedule(schedule: ScheduleDTO) {
    if (!window.confirm("Delete this schedule?")) return;
    const response = await fetch(`/api/notes/${noteId}/schedules/${schedule.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.message ?? "Could not delete schedule.");
      return;
    }
    setSchedules((current) => current.filter((item) => item.id !== schedule.id));
    if (editingId === schedule.id) cancelForm();
  }

  return (
    <section className="mt-8 border-t border-rule pt-5" aria-labelledby="schedule-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="schedule-heading"
          className="text-[13px] font-semibold tracking-wide text-muted uppercase"
        >
          Schedule
        </h2>
        {canEdit && !draft && (
          <button
            type="button"
            onClick={startCreate}
            className="min-h-11 px-2 text-[12px] font-medium text-accent hover:underline min-[900px]:min-h-8"
          >
            + Add schedule
          </button>
        )}
      </div>

      {schedules.length === 0 && !draft && (
        <p className="text-[13px] text-muted">No schedules yet.</p>
      )}

      {schedules.length > 0 && (
        <ul className="divide-y divide-rule">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className="flex flex-col gap-2 py-3 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text">{scheduleSummary(schedule)}</p>
                <p className="mt-1 text-[12px] text-muted">
                  {schedule.scheduleType === "ALL_DAY"
                    ? "All day"
                    : schedule.scheduleType === "TIMED"
                      ? "Timed"
                      : "Date range"}
                  {" · "}
                  {schedule.timezone}
                  {!schedule.enabled && " · Disabled"}
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-1">
                  <label className="flex min-h-11 items-center gap-2 px-2 text-[12px] text-muted min-[900px]:min-h-8">
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={() => void toggleSchedule(schedule)}
                      aria-label={`${schedule.enabled ? "Disable" : "Enable"} schedule`}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => startEdit(schedule)}
                    className={ACTION_CLASS}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSchedule(schedule)}
                    className={`${ACTION_CLASS} text-negative`}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <ScheduleForm
          initialDraft={draft}
          editing={editingId !== null}
          saving={saving}
          error={error}
          onCancel={cancelForm}
          onSubmit={(event) => void saveSchedule(event)}
          onDraftChange={setDraft}
        />
      )}
      {!draft && error && (
        <p role="alert" className="mt-3 text-[13px] text-negative">
          {error}
        </p>
      )}
    </section>
  );
}
