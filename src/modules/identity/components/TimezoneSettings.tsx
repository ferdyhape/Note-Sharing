"use client";

import { useState, type FormEvent } from "react";

const INPUT_CLASS =
  "h-10 w-full rounded-control border border-control bg-surface px-3 text-[14px] text-text outline-none focus-visible:border-accent";

const COMMON_TIMEZONES = [
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export function TimezoneSettings({
  initialTimezone,
  initialEffectiveTimezone,
}: {
  initialTimezone: string | null;
  initialEffectiveTimezone: string;
}) {
  const [timezone, setTimezone] = useState(initialTimezone ?? "");
  const [effectiveTimezone, setEffectiveTimezone] = useState(initialEffectiveTimezone);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(nextTimezone: string | null) {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/account/timezone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: nextTimezone }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Could not save timezone.");
        return;
      }
      setTimezone(body.data.timezone ?? "");
      setEffectiveTimezone(body.data.effectiveTimezone as string);
      setStatus("Saved");
    } catch {
      setError("Could not save timezone.");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(timezone.trim() || null);
  }

  return (
    <section className="border-t border-rule py-6" aria-labelledby="timezone-heading">
      <div className="grid gap-4 min-[900px]:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)] min-[900px]:gap-8">
        <div>
          <h2 id="timezone-heading" className="text-[16px] font-medium text-text">
            Timezone
          </h2>
          <p className="mt-1 text-[14px] text-muted">New schedule default</p>
        </div>
        <div className="rounded-card bg-raised p-4">
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="account-timezone"
              className="mb-2 block text-[14px] font-medium text-text"
            >
              IANA timezone
            </label>
            <input
              id="account-timezone"
              list="common-timezones"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder="Asia/Jakarta"
              className={INPUT_CLASS}
            />
            <datalist id="common-timezones">
              {COMMON_TIMEZONES.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            <p className="mt-2 text-[12px] text-muted">
              Effective timezone: <span className="font-medium text-text">{effectiveTimezone}</span>
            </p>
            {status && (
              <p role="status" className="mt-2 text-[13px] text-positive">
                {status}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-2 text-[13px] text-negative">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="min-h-11 rounded-control bg-text px-4 text-[13px] font-medium text-ground disabled:opacity-60 min-[900px]:min-h-9"
              >
                {saving ? "Saving…" : "Save timezone"}
              </button>
              <button
                type="button"
                disabled={saving || !timezone}
                onClick={() => void save(null)}
                className="min-h-11 rounded-control border border-control px-3 text-[13px] font-medium text-text hover:bg-surface disabled:opacity-60 min-[900px]:min-h-9"
              >
                Use default
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
