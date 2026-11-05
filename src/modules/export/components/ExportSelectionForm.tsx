"use client";

import { useState, type ChangeEvent } from "react";

const CONTROL_CLASS =
  "h-9 rounded-control border border-control bg-surface px-3 text-[12px] text-text outline-none focus-visible:border-accent";

export function ExportSelectionForm({
  notes,
  search,
  property,
  query,
}: {
  notes: Array<{ id: string; title: string }>;
  search: string;
  property: string;
  query: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function updateSelection(event: ChangeEvent<HTMLFormElement>) {
    setSelectedIds(new FormData(event.currentTarget).getAll("noteIds").map(String));
  }

  return (
    <details className="mb-4 border-y border-rule py-2">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-medium text-text [&::-webkit-details-marker]:hidden">
        <span>Select Notes to export</span>
        <span className="text-[12px] font-normal text-muted">{notes.length} available</span>
      </summary>
      <form
        action="/api/exports/notes"
        method="get"
        onChange={updateSelection}
        className="mt-3 space-y-3"
      >
        <input type="hidden" name="scope" value="selected" />
        {search && <input type="hidden" name="search" value={search} />}
        {property && <input type="hidden" name="property" value={property} />}
        {query && <input type="hidden" name="q" value={query} />}
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
            Format
            <select name="format" defaultValue="csv" className={CONTROL_CLASS}>
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={selectedIds.length === 0}
            className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8"
          >
            {`Export selected${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
          </button>
        </div>
        <fieldset>
          <legend className="mb-1 text-[12px] text-muted">Choose up to 100 Notes</legend>
          <ul className="max-h-60 divide-y divide-rule overflow-y-auto">
            {notes.map((note) => {
              const selected = selectedIds.includes(note.id);
              return (
                <li key={note.id}>
                  <label className="flex min-h-11 items-center gap-3 text-[13px] text-text">
                    <input
                      type="checkbox"
                      name="noteIds"
                      value={note.id}
                      disabled={!selected && selectedIds.length >= 100}
                      aria-label={note.title}
                    />
                    <span className="truncate">{note.title}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </form>
    </details>
  );
}
