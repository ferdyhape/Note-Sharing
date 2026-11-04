import Link from "next/link";

type ExportFormat = "csv" | "xlsx" | "json" | "markdown" | "pdf";

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
const MENU_LINK_CLASS =
  "flex min-h-10 items-center rounded-control px-3 text-[13px] text-text hover:bg-raised";

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
    <details className="relative">
      <summary
        aria-label="Export current Notes"
        className={`${LINK_CLASS} cursor-pointer list-none`}
      >
        Export
      </summary>
      <nav
        aria-label="Export formats"
        className="absolute right-0 top-full z-20 mt-1 flex min-w-36 flex-col rounded-card border border-border bg-surface p-1"
      >
        {(["csv", "xlsx", "json", "markdown", "pdf"] as const).map((format) => (
          <Link
            key={format}
            href={exportHref(format, scope, filters, noteId)}
            className={MENU_LINK_CLASS}
          >
            {format === "xlsx" ? "Excel workbook" : format.toUpperCase()}
          </Link>
        ))}
      </nav>
    </details>
  );
}
