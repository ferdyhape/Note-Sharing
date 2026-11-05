"use client";

import { useState, type FormEvent } from "react";
import { Temporal } from "@js-temporal/polyfill";
import { formatScheduleTime, localDateTimeToInstant } from "@/modules/scheduling/lib/schedule-time";
import type { ScheduleDTO } from "@/modules/scheduling/types";
import type { ReminderDTO, ReminderRecipientOption } from "@/modules/reminders/types";

type ReminderDraft = {
  triggerMode: "FIXED" | "SCHEDULE_RELATIVE";
  fixedTriggerAtLocal: string;
  scheduleId: string;
  minutesBefore: string;
  recipientUserIds: string[];
  enabled: boolean;
};

const INPUT_CLASS =
  "h-9 min-w-0 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent";
const ACTION_CLASS =
  "min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8";

function emptyDraft(timezone: string, recipients: ReminderRecipientOption[]): ReminderDraft {
  const nextHour = Temporal.Now.instant()
    .add({ hours: 1 })
    .toZonedDateTimeISO(timezone)
    .toPlainDateTime()
    .round({ smallestUnit: "minute", roundingMode: "ceil" });
  return {
    triggerMode: "FIXED",
    fixedTriggerAtLocal: nextHour.toString({ smallestUnit: "minute" }),
    scheduleId: "",
    minutesBefore: "15",
    recipientUserIds: recipients.map((recipient) => recipient.userId),
    enabled: true,
  };
}

function draftFromReminder(reminder: ReminderDTO, timezone: string): ReminderDraft {
  return {
    triggerMode: reminder.triggerMode,
    fixedTriggerAtLocal: reminder.fixedTriggerAt
      ? Temporal.Instant.from(reminder.fixedTriggerAt)
          .toZonedDateTimeISO(timezone)
          .toPlainDateTime()
          .toString({ smallestUnit: "minute" })
      : "",
    scheduleId: reminder.scheduleId ?? "",
    minutesBefore: String(Math.floor((reminder.offsetSeconds ?? 0) / 60)),
    recipientUserIds: reminder.recipients
      .filter((recipient) => recipient.enabled)
      .map((recipient) => recipient.userId),
    enabled: reminder.enabled,
  };
}

function reminderPayload(draft: ReminderDraft, timezone: string) {
  return draft.triggerMode === "FIXED"
    ? {
        triggerMode: draft.triggerMode,
        fixedTriggerAt: localDateTimeToInstant(draft.fixedTriggerAtLocal, timezone),
        recipientUserIds: draft.recipientUserIds,
        enabled: draft.enabled,
      }
    : {
        triggerMode: draft.triggerMode,
        scheduleId: draft.scheduleId,
        offsetSeconds: Number(draft.minutesBefore) * 60,
        recipientUserIds: draft.recipientUserIds,
        enabled: draft.enabled,
      };
}

function reminderSummary(reminder: ReminderDTO, schedules: ScheduleDTO[], timezone: string) {
  if (reminder.triggerMode === "FIXED" && reminder.fixedTriggerAt) {
    return `At ${formatScheduleTime(reminder.fixedTriggerAt, timezone)}`;
  }
  const schedule = schedules.find((item) => item.id === reminder.scheduleId);
  const minutes = Math.floor((reminder.offsetSeconds ?? 0) / 60);
  const timing = minutes === 0 ? "At schedule start" : `${minutes} min before`;
  return `${timing}${schedule?.startAtUtc ? ` · ${formatScheduleTime(schedule.startAtUtc, schedule.timezone)}` : " · Schedule unavailable"}`;
}

export function ReminderPanel({
  noteId,
  initialReminders,
  schedules,
  recipients,
  timezone,
  canEdit,
}: {
  noteId: string;
  initialReminders: ReminderDTO[];
  schedules: ScheduleDTO[];
  recipients: ReminderRecipientOption[];
  timezone: string;
  canEdit: boolean;
}) {
  const [reminders, setReminders] = useState(initialReminders);
  const [availableSchedules, setAvailableSchedules] = useState(schedules);
  const [draft, setDraft] = useState<ReminderDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timedSchedules = availableSchedules.filter(
    (schedule) => schedule.enabled && schedule.scheduleType === "TIMED",
  );

  async function startCreate() {
    setError(null);
    setEditingId(null);
    try {
      const response = await fetch(`/api/notes/${noteId}/schedules`);
      const result = await response.json();
      if (response.ok) setAvailableSchedules(result.data as ScheduleDTO[]);
    } catch {
      setError("Could not refresh this Note's schedules.");
    }
    setDraft(emptyDraft(timezone, recipients));
  }

  function startEdit(reminder: ReminderDTO) {
    setError(null);
    setEditingId(reminder.id);
    setDraft(draftFromReminder(reminder, timezone));
  }

  function cancelForm() {
    setDraft(null);
    setEditingId(null);
    setError(null);
  }

  async function persist(reminderId: string | null, payload: ReturnType<typeof reminderPayload>) {
    const response = await fetch(
      reminderId
        ? `/api/notes/${noteId}/reminders/${reminderId}`
        : `/api/notes/${noteId}/reminders`,
      {
        method: reminderId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? "Could not save reminder.");
    const saved = result.data as ReminderDTO;
    setReminders((current) =>
      reminderId
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current],
    );
  }

  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      await persist(editingId, reminderPayload(draft, timezone));
      cancelForm();
    } catch (cause) {
      setError(
        cause instanceof RangeError
          ? "That local time does not exist or is ambiguous in this timezone."
          : cause instanceof Error
            ? cause.message
            : "Could not save reminder.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(reminder: ReminderDTO) {
    setError(null);
    try {
      const nextDraft = { ...draftFromReminder(reminder, timezone), enabled: !reminder.enabled };
      await persist(reminder.id, reminderPayload(nextDraft, timezone));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update reminder.");
    }
  }

  async function deleteReminder(reminder: ReminderDTO) {
    if (!window.confirm("Delete this reminder?")) return;
    const response = await fetch(`/api/notes/${noteId}/reminders/${reminder.id}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error?.message ?? "Could not delete reminder.");
      return;
    }
    setReminders((current) => current.filter((item) => item.id !== reminder.id));
    if (editingId === reminder.id) cancelForm();
  }

  return (
    <section className="mt-8 border-t border-rule pt-5" aria-labelledby="reminder-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="reminder-heading"
          className="text-[13px] font-semibold tracking-wide text-muted uppercase"
        >
          Reminders
        </h2>
        {canEdit && !draft && recipients.length > 0 && (
          <button
            type="button"
            onClick={() => void startCreate()}
            className="min-h-11 px-2 text-[12px] font-medium text-accent hover:underline min-[900px]:min-h-8"
          >
            + Add reminder
          </button>
        )}
      </div>

      {reminders.length === 0 && !draft && (
        <p className="text-[13px] text-muted">No reminders yet.</p>
      )}
      {canEdit && recipients.length === 0 && !draft && (
        <p className="text-[13px] text-muted">Share this Note before adding reminder recipients.</p>
      )}

      {reminders.length > 0 && (
        <ul className="divide-y divide-rule">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex flex-col gap-2 py-3 min-[640px]:flex-row min-[640px]:items-start min-[640px]:justify-between"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text">
                  {reminderSummary(reminder, availableSchedules, timezone)}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  {reminder.triggerMode === "FIXED" ? "Fixed time" : "Schedule-linked"}
                  {` · ${reminder.recipients.filter((recipient) => recipient.enabled).length} recipient${reminder.recipients.filter((recipient) => recipient.enabled).length === 1 ? "" : "s"}`}
                  {!reminder.enabled && " · Disabled"}
                </p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-center gap-1">
                  <label className="flex min-h-11 items-center gap-2 px-2 text-[12px] text-muted min-[900px]:min-h-8">
                    <input
                      type="checkbox"
                      checked={reminder.enabled}
                      onChange={() => void toggleReminder(reminder)}
                      aria-label={`${reminder.enabled ? "Disable" : "Enable"} reminder`}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => startEdit(reminder)}
                    className={ACTION_CLASS}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteReminder(reminder)}
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
        <form
          onSubmit={(event) => void saveReminder(event)}
          className="mt-3 border-t border-rule pt-3"
        >
          <div className="grid gap-3 min-[640px]:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Trigger
              <select
                value={draft.triggerMode}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    triggerMode: event.target.value as ReminderDraft["triggerMode"],
                  })
                }
                className={INPUT_CLASS}
              >
                <option value="FIXED">Fixed time</option>
                <option value="SCHEDULE_RELATIVE" disabled={timedSchedules.length === 0}>
                  Before a timed schedule
                </option>
              </select>
            </label>

            {draft.triggerMode === "FIXED" ? (
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
                Date and time ({timezone})
                <input
                  required
                  type="datetime-local"
                  value={draft.fixedTriggerAtLocal}
                  onChange={(event) =>
                    setDraft({ ...draft, fixedTriggerAtLocal: event.target.value })
                  }
                  className={INPUT_CLASS}
                />
              </label>
            ) : (
              <>
                <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
                  Timed schedule
                  <select
                    required
                    value={draft.scheduleId}
                    onChange={(event) => setDraft({ ...draft, scheduleId: event.target.value })}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select a schedule</option>
                    {timedSchedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.startAtUtc
                          ? formatScheduleTime(schedule.startAtUtc, schedule.timezone)
                          : schedule.timezone}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
                  Minutes before start
                  <input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={draft.minutesBefore}
                    onChange={(event) => setDraft({ ...draft, minutesBefore: event.target.value })}
                    className={INPUT_CLASS}
                  />
                </label>
              </>
            )}

            <fieldset className="min-[640px]:col-span-2">
              <legend className="mb-1.5 text-[12px] font-medium text-muted">Recipients</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {recipients.map((recipient) => {
                  const selected = draft.recipientUserIds.includes(recipient.userId);
                  return (
                    <label
                      key={recipient.userId}
                      className="flex min-h-11 items-center gap-2 text-[13px] text-text"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setDraft({
                            ...draft,
                            recipientUserIds: selected
                              ? draft.recipientUserIds.filter(
                                  (userId) => userId !== recipient.userId,
                                )
                              : [...draft.recipientUserIds, recipient.userId],
                          })
                        }
                      />
                      {recipient.name ?? "Shared user"}
                      <span className="text-[12px] text-muted">{recipient.role.toLowerCase()}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {editingId && (
              <label className="flex min-h-11 items-center gap-2 text-[13px] text-text">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
                />
                Enabled
              </label>
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
              disabled={saving || draft.recipientUserIds.length === 0}
              className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:opacity-60 min-[900px]:min-h-8"
            >
              {saving ? "Saving…" : editingId ? "Save reminder" : "Add reminder"}
            </button>
            <button type="button" onClick={cancelForm} className={ACTION_CLASS}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {!draft && error && (
        <p role="alert" className="mt-3 text-[13px] text-negative">
          {error}
        </p>
      )}
    </section>
  );
}
