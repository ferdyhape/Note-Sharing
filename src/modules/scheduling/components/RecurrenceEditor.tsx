"use client";

import { useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { ScheduleDTO, RecurrenceDTO } from "@/modules/scheduling/types";
import { formatScheduleDate } from "@/modules/scheduling/lib/schedule-time";

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";
type EndMode = "NEVER" | "COUNT" | "UNTIL";

type RecurrenceDraft = {
  frequency: Frequency;
  interval: string;
  weekdays: string[];
  monthDay: string;
  endMode: EndMode;
  count: string;
  untilDate: string;
};

const WEEKDAYS = [
  { value: "MO", label: "M", name: "Monday" },
  { value: "TU", label: "T", name: "Tuesday" },
  { value: "WE", label: "W", name: "Wednesday" },
  { value: "TH", label: "T", name: "Thursday" },
  { value: "FR", label: "F", name: "Friday" },
  { value: "SA", label: "S", name: "Saturday" },
  { value: "SU", label: "S", name: "Sunday" },
];

const INPUT_CLASS =
  "h-9 min-w-0 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent";
const ACTION_CLASS =
  "min-h-11 rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8";

function parseRule(rule: RecurrenceDTO): RecurrenceDraft {
  const options = Object.fromEntries(
    rule.rrule.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const count = options.COUNT ?? "";
  const untilDate = rule.untilDate?.slice(0, 10) ?? "";

  return {
    frequency: (options.FREQ as Frequency | undefined) ?? "WEEKLY",
    interval: options.INTERVAL ?? "1",
    weekdays: options.BYDAY?.split(",") ?? [],
    monthDay: options.BYMONTHDAY?.split(",")[0] ?? "",
    endMode: count ? "COUNT" : untilDate ? "UNTIL" : "NEVER",
    count,
    untilDate,
  };
}

function defaultDraft(schedule: ScheduleDTO): RecurrenceDraft {
  const startDate =
    schedule.scheduleType === "TIMED" && schedule.startAtUtc
      ? Temporal.Instant.from(schedule.startAtUtc)
          .toZonedDateTimeISO(schedule.timezone)
          .toPlainDate()
      : Temporal.PlainDate.from(
          schedule.startDate?.slice(0, 10) ?? Temporal.Now.plainDateISO().toString(),
        );
  const weekday = WEEKDAYS[startDate.dayOfWeek - 1].value;

  return {
    frequency: "WEEKLY",
    interval: "1",
    weekdays: [weekday],
    monthDay: "",
    endMode: "NEVER",
    count: "",
    untilDate: "",
  };
}

function recurrenceSummary(recurrence: RecurrenceDTO) {
  const options = Object.fromEntries(
    recurrence.rrule.split(";").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const frequency = options.FREQ ?? "CUSTOM";
  const interval = Number(options.INTERVAL ?? 1);
  const units = {
    DAILY: { one: "daily", many: "days" },
    WEEKLY: { one: "weekly", many: "weeks" },
    MONTHLY: { one: "monthly", many: "months" },
  }[frequency] ?? { one: "custom", many: "periods" };
  const frequencyLabel = interval === 1 ? units.one : `every ${interval} ${units.many}`;
  const weekdays = options.BYDAY
    ? ` on ${options.BYDAY.split(",")
        .map((day) => WEEKDAYS.find((item) => item.value === day)?.name ?? day)
        .join(", ")}`
    : "";
  const monthDays = options.BYMONTHDAY ? ` on day ${options.BYMONTHDAY}` : "";
  const end = options.COUNT
    ? ` · ${options.COUNT} occurrences`
    : recurrence.untilDate
      ? ` · Until ${formatScheduleDate(recurrence.untilDate)}`
      : "";

  return `Repeats ${frequencyLabel}${weekdays}${monthDays}${end}`;
}

export function RecurrenceEditor({
  noteId,
  schedule,
  canEdit,
  onChanged,
}: {
  noteId: string;
  schedule: ScheduleDTO;
  canEdit: boolean;
  onChanged: (recurrence: RecurrenceDTO | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RecurrenceDraft>(() =>
    schedule.recurrence ? parseRule(schedule.recurrence) : defaultDraft(schedule),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(fields: Partial<RecurrenceDraft>) {
    setDraft((current) => ({ ...current, ...fields }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const body = {
      frequency: draft.frequency,
      interval: Number(draft.interval),
      ...(draft.frequency === "WEEKLY" ? { weekdays: draft.weekdays } : {}),
      ...(draft.frequency === "MONTHLY" && draft.monthDay
        ? { monthDays: [Number(draft.monthDay)] }
        : {}),
      ...(draft.endMode === "COUNT" ? { count: Number(draft.count) } : {}),
      ...(draft.endMode === "UNTIL" ? { untilDate: draft.untilDate } : {}),
    };

    try {
      const response = await fetch(`/api/notes/${noteId}/schedules/${schedule.id}/recurrence`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Could not save recurrence.");
        return;
      }
      onChanged(result.data as RecurrenceDTO);
      setOpen(false);
    } catch {
      setError("Could not save recurrence.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Remove recurrence from this schedule?")) return;
    const response = await fetch(`/api/notes/${noteId}/schedules/${schedule.id}/recurrence`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error?.message ?? "Could not remove recurrence.");
      return;
    }
    onChanged(null);
    setOpen(false);
  }

  return (
    <div className="mt-2">
      {schedule.recurrence && (
        <p className="text-[12px] text-muted">{recurrenceSummary(schedule.recurrence)}</p>
      )}
      {canEdit && !open && (
        <div className="mt-1 flex gap-1">
          <button type="button" onClick={() => setOpen(true)} className={ACTION_CLASS}>
            {schedule.recurrence ? "Edit repeat" : "+ Repeat"}
          </button>
          {schedule.recurrence && (
            <button type="button" onClick={() => void remove()} className={ACTION_CLASS}>
              Remove repeat
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="mt-2 border-t border-rule pt-3">
          <div className="grid gap-3 min-[640px]:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Repeat
              <select
                value={draft.frequency}
                onChange={(event) => update({ frequency: event.target.value as Frequency })}
                className={INPUT_CLASS}
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Every
              <input
                type="number"
                min={1}
                max={365}
                value={draft.interval}
                onChange={(event) => update({ interval: event.target.value })}
                className={INPUT_CLASS}
              />
            </label>
            {draft.frequency === "WEEKLY" && (
              <fieldset className="min-[640px]:col-span-2">
                <legend className="mb-1.5 text-[12px] font-medium text-muted">On weekdays</legend>
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((day) => {
                    const selected = draft.weekdays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        aria-label={day.name}
                        title={day.name}
                        aria-pressed={selected}
                        onClick={() =>
                          update({
                            weekdays: selected
                              ? draft.weekdays.filter((value) => value !== day.value)
                              : [...draft.weekdays, day.value],
                          })
                        }
                        className={`min-h-11 min-w-11 rounded-control border px-3 text-[12px] font-medium min-[900px]:min-h-8 min-[900px]:min-w-8 ${selected ? "border-text bg-text text-ground" : "border-control text-text hover:bg-raised"}`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            {draft.frequency === "MONTHLY" && (
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
                Day of month
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={draft.monthDay}
                  onChange={(event) => update({ monthDay: event.target.value })}
                  placeholder="Same day as schedule start"
                  className={INPUT_CLASS}
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
              Ends
              <select
                value={draft.endMode}
                onChange={(event) => update({ endMode: event.target.value as EndMode })}
                className={INPUT_CLASS}
              >
                <option value="NEVER">Never</option>
                <option value="COUNT">After a number of occurrences</option>
                <option value="UNTIL">On a date</option>
              </select>
            </label>
            {draft.endMode === "COUNT" && (
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
                Occurrences
                <input
                  required
                  type="number"
                  min={1}
                  max={1000}
                  value={draft.count}
                  onChange={(event) => update({ count: event.target.value })}
                  className={INPUT_CLASS}
                />
              </label>
            )}
            {draft.endMode === "UNTIL" && (
              <label className="flex flex-col gap-1.5 text-[12px] font-medium text-muted">
                End date
                <input
                  required
                  type="date"
                  value={draft.untilDate}
                  onChange={(event) => update({ untilDate: event.target.value })}
                  className={INPUT_CLASS}
                />
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
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:opacity-60 min-[900px]:min-h-8"
            >
              {saving ? "Saving…" : "Save repeat"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={ACTION_CLASS}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
