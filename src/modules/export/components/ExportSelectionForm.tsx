"use client";

import type { ReactNode } from "react";
import { useState, type ChangeEvent } from "react";

const CONTROL_CLASS =
  "h-9 rounded-control border border-control bg-surface px-3 text-[12px] text-text outline-none focus-visible:border-accent";

export function ExportSelectionForm({
  children,
  search,
  property,
  query,
}: {
  children: ReactNode;
  search: string;
  property: string;
  query: string;
}) {
  const [selectedCount, setSelectedCount] = useState(0);

  function updateSelection(event: ChangeEvent<HTMLFormElement>) {
    setSelectedCount(new FormData(event.currentTarget).getAll("noteIds").length);
  }

  return (
    <form action="/api/exports/notes" method="get" onChange={updateSelection} className="space-y-3">
      <input type="hidden" name="scope" value="selected" />
      {search && <input type="hidden" name="search" value={search} />}
      {property && <input type="hidden" name="property" value={property} />}
      {query && <input type="hidden" name="q" value={query} />}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-medium text-muted">
          Selected Notes format
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
          disabled={selectedCount === 0}
          className="min-h-11 rounded-control bg-text px-3 text-[12px] font-medium text-ground disabled:cursor-not-allowed disabled:opacity-60 min-[900px]:min-h-8"
        >
          {`Export selected${selectedCount ? ` (${selectedCount})` : ""}`}
        </button>
      </div>
      {children}
    </form>
  );
}
