"use client";

import { useRef, useState, type FormEvent } from "react";
import type { PropertyType } from "@prisma/client";

type ValueFields = {
  valueJson: unknown;
  valueText: string | null;
  valueNumber: string | null;
  valueDate: string | null;
};

const EMPTY_VALUE: ValueFields = {
  valueJson: null,
  valueText: null,
  valueNumber: null,
  valueDate: null,
};

// 44px tap target on mobile, back to a compact 32px once a pointer is likely
// (min-[900px], matching the icon rail's own breakpoint) — same convention
// as SchedulePanel.tsx and ReminderPanel.tsx's ACTION_CLASS.
const ACTION_CLASS =
  "flex min-h-11 items-center rounded-control px-2 hover:bg-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8";

export type PropertyValueDTO = ValueFields & {
  id: string;
  propertyId: string;
  relationNoteId: string | null;
  relationUserId: string | null;
  updatedAt: string;
};

export type PropertyDTO = {
  id: string;
  noteId: string;
  name: string;
  slug: string;
  type: PropertyType;
  inputConfigJson: unknown;
  required: boolean;
  position: number;
  values: PropertyValueDTO[];
};

type HistoryEntryDTO = ValueFields & {
  id: string;
  changedAt: string;
  changedBy: { id: string; name: string | null } | null;
};

type OptionConfig = { value: string; label: string };

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "BOOLEAN", label: "Checkbox" },
  { value: "SELECT", label: "Select" },
  { value: "MULTI_SELECT", label: "Multi-select" },
  { value: "DATE_TIME", label: "Date / time" },
  { value: "URL_EMAIL", label: "URL / email" },
  { value: "CURRENCY", label: "Currency" },
  { value: "RELATION", label: "Relation" },
  { value: "ATTACHMENT", label: "Attachment" },
];

const VALUE_SAVE_DELAY_MS = 600;

const inputClass =
  "h-9 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent";

function slugifyOption(label: string) {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "option"
  );
}

function formatValue(type: PropertyType, v: ValueFields): string {
  switch (type) {
    case "BOOLEAN":
      return v.valueJson ? "Checked" : "Unchecked";
    case "MULTI_SELECT":
      return Array.isArray(v.valueJson) && v.valueJson.length > 0
        ? (v.valueJson as string[]).join(", ")
        : "(none)";
    case "NUMBER":
    case "CURRENCY":
      return v.valueNumber ?? "(none)";
    case "DATE_TIME":
      return v.valueDate ? new Date(v.valueDate).toLocaleString() : "(none)";
    case "ATTACHMENT":
      return v.valueJson ? "Metadata stored" : "(none)";
    default:
      return v.valueText ?? "(none)";
  }
}

function dateToInputValue(iso: string | null, mode: "date" | "time" | "datetime") {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  if (mode === "date") return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (mode === "time") return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inputValueToRaw(value: string, mode: "date" | "time" | "datetime") {
  // "time" alone isn't a format Date() can parse (ADR-0005 isn't in play here,
  // this is just JS Date parsing) — anchor it to an arbitrary fixed date.
  return mode === "time" ? `1970-01-01T${value}:00` : value;
}

function useValueSave(
  noteId: string,
  propertyId: string,
  onSaved: (value: PropertyValueDTO) => void,
) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function send(raw: unknown) {
    setStatus("saving");
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/notes/${noteId}/properties/${propertyId}/value`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: raw }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(body.error?.message ?? "Could not save.");
        return;
      }
      setStatus("saved");
      onSaved(body.data as PropertyValueDTO);
    } catch {
      setStatus("error");
      setErrorMessage("Could not save.");
    }
  }

  function saveNow(raw: unknown) {
    if (timer.current) clearTimeout(timer.current);
    void send(raw);
  }

  function saveDebounced(raw: unknown) {
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(() => void send(raw), VALUE_SAVE_DELAY_MS);
  }

  return { status, errorMessage, saveNow, saveDebounced };
}

function ValueStatus({ status, errorMessage }: { status: string; errorMessage: string | null }) {
  if (status === "error") {
    return <span className="text-[11px] text-negative">{errorMessage ?? "Could not save"}</span>;
  }
  if (status === "saving") return <span className="text-[11px] text-muted">Saving…</span>;
  return null;
}

function TextLikeValueEditor({
  noteId,
  propertyId,
  current,
  onSaved,
  inputType = "text",
  multiline = false,
  placeholder,
}: {
  noteId: string;
  propertyId: string;
  current: ValueFields;
  onSaved: (value: PropertyValueDTO) => void;
  inputType?: string;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(current.valueText ?? "");
  const { status, errorMessage, saveDebounced } = useValueSave(noteId, propertyId, onSaved);

  function handleChange(next: string) {
    setValue(next);
    saveDebounced(next);
  }

  return (
    <div className="flex items-center gap-2">
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          rows={3}
          className={`${inputClass} h-auto w-full resize-y py-2`}
        />
      ) : (
        <input
          type={inputType}
          value={value}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          className={`${inputClass} w-full max-w-sm`}
        />
      )}
      <ValueStatus status={status} errorMessage={errorMessage} />
    </div>
  );
}

function NumberValueEditor({
  noteId,
  propertyId,
  current,
  onSaved,
  suffix,
}: {
  noteId: string;
  propertyId: string;
  current: ValueFields;
  onSaved: (value: PropertyValueDTO) => void;
  suffix?: string;
}) {
  const [value, setValue] = useState(current.valueNumber ?? "");
  const { status, errorMessage, saveDebounced } = useValueSave(noteId, propertyId, onSaved);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && !Number.isNaN(n)) saveDebounced(n);
        }}
        className={`${inputClass} w-40`}
      />
      {suffix && <span className="text-[12px] text-muted">{suffix}</span>}
      <ValueStatus status={status} errorMessage={errorMessage} />
    </div>
  );
}

function BooleanValueEditor({
  noteId,
  propertyId,
  current,
  onSaved,
}: {
  noteId: string;
  propertyId: string;
  current: ValueFields;
  onSaved: (value: PropertyValueDTO) => void;
}) {
  const [checked, setChecked] = useState(Boolean(current.valueJson));
  const { status, errorMessage, saveNow } = useValueSave(noteId, propertyId, onSaved);

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          setChecked(e.target.checked);
          saveNow(e.target.checked);
        }}
      />
      <ValueStatus status={status} errorMessage={errorMessage} />
    </div>
  );
}

function SelectValueEditor({
  noteId,
  propertyId,
  current,
  onSaved,
  options,
}: {
  noteId: string;
  propertyId: string;
  current: ValueFields;
  onSaved: (value: PropertyValueDTO) => void;
  options: OptionConfig[];
}) {
  const [value, setValue] = useState(current.valueText ?? "");
  const { status, errorMessage, saveNow } = useValueSave(noteId, propertyId, onSaved);

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          saveNow(e.target.value);
        }}
        className={inputClass}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ValueStatus status={status} errorMessage={errorMessage} />
    </div>
  );
}

function MultiSelectValueEditor({
  noteId,
  propertyId,
  current,
  onSaved,
  options,
}: {
  noteId: string;
  propertyId: string;
  current: ValueFields;
  onSaved: (value: PropertyValueDTO) => void;
  options: OptionConfig[];
}) {
  const [selected, setSelected] = useState<string[]>(
    Array.isArray(current.valueJson) ? (current.valueJson as string[]) : [],
  );
  const { status, errorMessage, saveNow } = useValueSave(noteId, propertyId, onSaved);

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    setSelected(next);
    saveNow(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12px] ${
            selected.includes(o.value)
              ? "border-accent bg-accent/10 text-accent"
              : "border-control text-muted"
          }`}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={selected.includes(o.value)}
            onChange={() => toggle(o.value)}
          />
          {o.label}
        </label>
      ))}
      <ValueStatus status={status} errorMessage={errorMessage} />
    </div>
  );
}

function DateTimeValueEditor({
  noteId,
  propertyId,
  current,
  onSaved,
  mode,
}: {
  noteId: string;
  propertyId: string;
  current: ValueFields;
  onSaved: (value: PropertyValueDTO) => void;
  mode: "date" | "time" | "datetime";
}) {
  const [value, setValue] = useState(dateToInputValue(current.valueDate, mode));
  const { status, errorMessage, saveNow } = useValueSave(noteId, propertyId, onSaved);
  const inputType = mode === "date" ? "date" : mode === "time" ? "time" : "datetime-local";

  return (
    <div className="flex items-center gap-2">
      <input
        type={inputType}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value) saveNow(inputValueToRaw(e.target.value, mode));
        }}
        className={inputClass}
      />
      <ValueStatus status={status} errorMessage={errorMessage} />
    </div>
  );
}

function AttachmentValueEditor({ current }: { current: ValueFields }) {
  return (
    <p className="text-[12px] text-muted">
      {current.valueJson ? "Metadata stored." : "No file."} File upload is not built yet.
    </p>
  );
}

function PropertyValueEditor({
  noteId,
  property,
  canEdit,
  onSaved,
}: {
  noteId: string;
  property: PropertyDTO;
  canEdit: boolean;
  onSaved: (value: PropertyValueDTO) => void;
}) {
  const current: ValueFields = property.values[0] ?? EMPTY_VALUE;
  const config = (property.inputConfigJson ?? {}) as Record<string, unknown>;

  if (!canEdit) {
    return <p className="text-[13px] text-text">{formatValue(property.type, current)}</p>;
  }

  switch (property.type) {
    case "TEXT":
      return (
        <TextLikeValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          multiline={Boolean(config.multiline)}
        />
      );
    case "NUMBER":
      return (
        <NumberValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
        />
      );
    case "CURRENCY":
      return (
        <NumberValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          suffix={typeof config.currency === "string" ? config.currency : undefined}
        />
      );
    case "BOOLEAN":
      return (
        <BooleanValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
        />
      );
    case "SELECT":
      return (
        <SelectValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          options={(config.options as OptionConfig[] | undefined) ?? []}
        />
      );
    case "MULTI_SELECT":
      return (
        <MultiSelectValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          options={(config.options as OptionConfig[] | undefined) ?? []}
        />
      );
    case "DATE_TIME":
      return (
        <DateTimeValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          mode={(config.mode as "date" | "time" | "datetime" | undefined) ?? "date"}
        />
      );
    case "URL_EMAIL":
      return (
        <TextLikeValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          inputType={config.mode === "email" ? "email" : "url"}
          placeholder={config.mode === "email" ? "name@example.com" : "https://"}
        />
      );
    case "RELATION":
      return (
        <TextLikeValueEditor
          noteId={noteId}
          propertyId={property.id}
          current={current}
          onSaved={onSaved}
          placeholder={config.target === "USER" ? "User id" : "Note id"}
        />
      );
    case "ATTACHMENT":
      return <AttachmentValueEditor current={current} />;
    default:
      return null;
  }
}

function PropertyRow({
  noteId,
  property,
  canEdit,
  onDeleted,
  onValueSaved,
}: {
  noteId: string;
  property: PropertyDTO;
  canEdit: boolean;
  onDeleted: () => void;
  onValueSaved: (value: PropertyValueDTO) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntryDTO[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${property.name}"? This also deletes its value history.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/notes/${noteId}/properties/${property.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted();
    } else {
      setDeleting(false);
    }
  }

  async function toggleHistory() {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    setShowHistory(true);
    if (history === null) {
      setHistoryLoading(true);
      const res = await fetch(`/api/notes/${noteId}/properties/${property.id}/history`);
      const body = await res.json();
      setHistory(res.ok ? (body.data as HistoryEntryDTO[]) : []);
      setHistoryLoading(false);
    }
  }

  const typeLabel = PROPERTY_TYPES.find((t) => t.value === property.type)?.label ?? property.type;

  return (
    <li className="rounded-card border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[13px] font-medium">{property.name}</span>
          <span className="shrink-0 rounded-full bg-pill-neutral-bg px-2 py-0.5 font-mono text-[10px] text-pill-neutral-ink">
            {typeLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
          <button type="button" onClick={() => void toggleHistory()} className={ACTION_CLASS}>
            History
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className={`${ACTION_CLASS} hover:text-negative`}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="mt-2">
        <PropertyValueEditor
          noteId={noteId}
          property={property}
          canEdit={canEdit}
          onSaved={onValueSaved}
        />
      </div>

      {showHistory && (
        <div className="mt-2 border-t border-rule pt-2">
          {historyLoading && <p className="text-[12px] text-muted">Loading…</p>}
          {!historyLoading && history?.length === 0 && (
            <p className="text-[12px] text-muted">No changes yet.</p>
          )}
          {!historyLoading && history && history.length > 0 && (
            <ul className="flex flex-col gap-1">
              {history.map((entry) => (
                <li key={entry.id} className="text-[12px] text-muted">
                  <span className="text-text">{formatValue(property.type, entry)}</span> —{" "}
                  {entry.changedBy?.name ?? "Unknown"}, {new Date(entry.changedAt).toLocaleString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function AddPropertyForm({
  noteId,
  onCreated,
  onCancel,
}: {
  noteId: string;
  onCreated: (property: PropertyDTO) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("TEXT");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [multiline, setMultiline] = useState(false);
  const [maxLength, setMaxLength] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [options, setOptions] = useState<string[]>(["Option 1"]);
  const [maxSelections, setMaxSelections] = useState("");
  const [dateMode, setDateMode] = useState<"date" | "time" | "datetime">("date");
  const [urlMode, setUrlMode] = useState<"url" | "email">("url");
  const [currency, setCurrency] = useState("USD");
  const [relationTarget, setRelationTarget] = useState<"NOTE" | "USER">("NOTE");

  function buildInputConfig(): Record<string, unknown> {
    switch (type) {
      case "TEXT":
        return { multiline, ...(maxLength ? { maxLength: Number(maxLength) } : {}) };
      case "NUMBER":
        return {
          ...(min ? { min: Number(min) } : {}),
          ...(max ? { max: Number(max) } : {}),
        };
      case "SELECT":
      case "MULTI_SELECT": {
        const opts = options
          .map((label) => label.trim())
          .filter(Boolean)
          .map((label) => ({ value: slugifyOption(label), label }));
        return type === "MULTI_SELECT"
          ? { options: opts, ...(maxSelections ? { maxSelections: Number(maxSelections) } : {}) }
          : { options: opts };
      }
      case "DATE_TIME":
        return { mode: dateMode };
      case "URL_EMAIL":
        return { mode: urlMode };
      case "CURRENCY":
        return { currency: currency.toUpperCase() };
      case "RELATION":
        return { target: relationTarget };
      case "BOOLEAN":
      case "ATTACHMENT":
      default:
        return {};
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if ((type === "SELECT" || type === "MULTI_SELECT") && options.every((o) => !o.trim())) {
      setError("Add at least one option.");
      return;
    }
    if (type === "CURRENCY" && currency.trim().length !== 3) {
      setError("Currency must be a 3-letter code.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/notes/${noteId}/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, inputConfig: buildInputConfig() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error?.message ?? "Could not create property.");
        setSubmitting(false);
        return;
      }
      onCreated({ ...(body.data as PropertyDTO), values: [] });
    } catch {
      setError("Could not create property.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-3 flex flex-col gap-3 rounded-card border border-border bg-raised p-3.5"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] text-muted" htmlFor="property-name">
          Name
        </label>
        <input
          id="property-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] text-muted" htmlFor="property-type">
          Type
        </label>
        <select
          id="property-type"
          value={type}
          onChange={(e) => setType(e.target.value as PropertyType)}
          className={inputClass}
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {type === "TEXT" && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-1.5 text-[13px]">
            <input
              type="checkbox"
              checked={multiline}
              onChange={(e) => setMultiline(e.target.checked)}
            />
            Multi-line
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-muted">
            Max length
            <input
              type="number"
              min={1}
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value)}
              className={`${inputClass} w-28`}
            />
          </label>
        </div>
      )}

      {type === "NUMBER" && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1.5 text-[12px] text-muted">
            Min
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className={`${inputClass} w-28`}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] text-muted">
            Max
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              className={`${inputClass} w-28`}
            />
          </label>
        </div>
      )}

      {(type === "SELECT" || type === "MULTI_SELECT") && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-muted">Options</span>
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={(e) =>
                  setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                }
                className={inputClass}
              />
              {options.length > 1 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                  className="text-[12px] text-muted hover:text-negative"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, `Option ${prev.length + 1}`])}
            className="self-start text-[12px] text-accent hover:underline"
          >
            + Add option
          </button>
          {type === "MULTI_SELECT" && (
            <label className="flex flex-col gap-1.5 text-[12px] text-muted">
              Max selections
              <input
                type="number"
                min={1}
                value={maxSelections}
                onChange={(e) => setMaxSelections(e.target.value)}
                className={`${inputClass} w-28`}
              />
            </label>
          )}
        </div>
      )}

      {type === "DATE_TIME" && (
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">
          Mode
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value as typeof dateMode)}
            className={inputClass}
          >
            <option value="date">Date only</option>
            <option value="time">Time only</option>
            <option value="datetime">Date and time</option>
          </select>
        </label>
      )}

      {type === "URL_EMAIL" && (
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">
          Mode
          <select
            value={urlMode}
            onChange={(e) => setUrlMode(e.target.value as typeof urlMode)}
            className={inputClass}
          >
            <option value="url">URL</option>
            <option value="email">Email</option>
          </select>
        </label>
      )}

      {type === "CURRENCY" && (
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">
          Currency code (ISO 4217)
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            className={`${inputClass} w-24 uppercase`}
          />
        </label>
      )}

      {type === "RELATION" && (
        <label className="flex flex-col gap-1.5 text-[12px] text-muted">
          Relates to
          <select
            value={relationTarget}
            onChange={(e) => setRelationTarget(e.target.value as typeof relationTarget)}
            className={inputClass}
          >
            <option value="NOTE">Another note</option>
            <option value="USER">A user</option>
          </select>
        </label>
      )}

      {type === "ATTACHMENT" && (
        <p className="text-[12px] text-muted">
          File upload is not built yet — this stores metadata only.
        </p>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-negative">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-8 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add property"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PropertiesPanel({
  noteId,
  initialProperties,
  canEdit,
}: {
  noteId: string;
  initialProperties: PropertyDTO[];
  canEdit: boolean;
}) {
  const [properties, setProperties] = useState(initialProperties);
  const [adding, setAdding] = useState(false);

  function handleCreated(property: PropertyDTO) {
    setProperties((prev) => [...prev, property]);
    setAdding(false);
  }

  function handleDeleted(propertyId: string) {
    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
  }

  function handleValueSaved(propertyId: string, value: PropertyValueDTO) {
    setProperties((prev) => prev.map((p) => (p.id === propertyId ? { ...p, values: [value] } : p)));
  }

  return (
    <section className="mt-8 border-t border-rule pt-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">Properties</h2>
        {canEdit && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="min-h-11 px-2 text-[12px] font-medium text-accent hover:underline min-[900px]:min-h-8"
          >
            + Add property
          </button>
        )}
      </div>

      {properties.length === 0 && !adding && (
        <p className="text-[13px] text-muted">No properties yet.</p>
      )}

      {properties.length > 0 && (
        <ul className="flex flex-col gap-2">
          {properties.map((property) => (
            <PropertyRow
              key={property.id}
              noteId={noteId}
              property={property}
              canEdit={canEdit}
              onDeleted={() => handleDeleted(property.id)}
              onValueSaved={(value) => handleValueSaved(property.id, value)}
            />
          ))}
        </ul>
      )}

      {adding && (
        <AddPropertyForm
          noteId={noteId}
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
        />
      )}
    </section>
  );
}
