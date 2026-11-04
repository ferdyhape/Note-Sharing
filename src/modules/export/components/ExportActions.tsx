import Link from "next/link";

type ExportFormat = "csv" | "xlsx" | "json";

function exportHref(
  format: ExportFormat,
  scope: "filtered" | "note",
  filters: { search?: string; property?: string; q?: string },
  noteId?: string,
) {
  const query = new URLSearchParams({ format, scope });
  if (noteId) query.set("noteId", noteId);
  if (filters.search) query.set("search", filters.search);
  if (filters.property) query.set("property", filters.property);
  if (filters.q) query.set("q", filters.q);
  return `/api/exports/notes?${query}`;
}

const LINK_CLASS =
  "flex min-h-11 items-center rounded-control px-2 text-[12px] font-medium text-text hover:bg-raised min-[900px]:min-h-8";

export function ExportActions({
  search,
  property,
  query,
  scope = "filtered",
  noteId,
}: {
  search: string;
  property: string;
  query: string;
  scope?: "filtered" | "note";
  noteId?: string;
}) {
  const filters = { search, property, q: query };
  return (
    <nav aria-label="Export current Notes" className="flex items-center gap-1">
      <span className="px-1 text-[12px] text-muted">Export</span>
      <Link href={exportHref("csv", scope, filters, noteId)} className={LINK_CLASS}>
        CSV
      </Link>
      <Link href={exportHref("xlsx", scope, filters, noteId)} className={LINK_CLASS}>
        XLSX
      </Link>
      <Link href={exportHref("json", scope, filters, noteId)} className={LINK_CLASS}>
        JSON
      </Link>
    </nav>
  );
}
