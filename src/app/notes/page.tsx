import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/shared/components/AppShell";
import { CreateNoteButton } from "@/shared/components/CreateNoteButton";
import { formatPropertyValue } from "@/shared/lib/property-value";
import { matchesNoteSearch } from "@/modules/notes/lib/search";
import { NoteStatusButton } from "@/modules/notes/components/NoteStatusButton";

type SearchParams = { view?: string; property?: string; q?: string; search?: string };

export default async function NotesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  // Defense in depth — middleware already protects this route.
  if (!session?.user?.id) redirect("/login");

  const { view, property: filterProperty, q: filterQuery, search } = await searchParams;
  const isTableView = view === "table";
  const searchQuery = search?.trim() ?? "";

  const notes = await prisma.note.findMany({
    where: { ownerId: session.user.id, deletedAt: null, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: { properties: { orderBy: { position: "asc" }, include: { values: true } } },
  });

  // Table view's columns are the union of property names across the user's
  // Notes (01_PRD.md §"Table view combines selected Notes and their
  // available custom properties; missing properties render as empty cells").
  const columnOrder: string[] = [];
  const columnType = new Map<string, string>();
  for (const note of notes) {
    for (const prop of note.properties) {
      if (!columnType.has(prop.name)) {
        columnOrder.push(prop.name);
        columnType.set(prop.name, prop.type);
      }
    }
  }

  const query = (filterQuery ?? "").trim().toLowerCase();
  const propertyFilteredNotes = filterProperty
    ? notes.filter((note) => {
        const prop = note.properties.find((p) => p.name === filterProperty);
        if (!prop) return false;
        if (!query) return true;
        return formatPropertyValue(prop.type, prop.values[0]).toLowerCase().includes(query);
      })
    : notes;
  const filteredNotes = propertyFilteredNotes.filter((note) =>
    matchesNoteSearch(note, searchQuery),
  );
  const clearSearchParams = new URLSearchParams();
  if (isTableView) clearSearchParams.set("view", "table");
  if (filterProperty) clearSearchParams.set("property", filterProperty);
  if (filterQuery) clearSearchParams.set("q", filterQuery);
  const clearSearchHref = clearSearchParams.size ? `/notes?${clearSearchParams}` : "/notes";

  return (
    <AppShell active="notes">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-[19px] font-semibold">All Notes</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/notes"
            className={`rounded-card border border-border px-3 py-1.5 text-xs font-medium ${!isTableView ? "bg-raised" : "bg-surface"}`}
          >
            List
          </Link>
          <Link
            href="/notes?view=table"
            className={`rounded-card border border-border px-3 py-1.5 text-xs font-medium ${isTableView ? "bg-raised" : "bg-surface"}`}
          >
            Table
          </Link>
          <CreateNoteButton />
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        {isTableView && <input type="hidden" name="view" value="table" />}
        {filterProperty && <input type="hidden" name="property" value={filterProperty} />}
        {filterQuery && <input type="hidden" name="q" value={filterQuery} />}
        <label className="sr-only" htmlFor="note-search">
          Search Notes
        </label>
        <input
          id="note-search"
          type="search"
          name="search"
          defaultValue={searchQuery}
          placeholder="Search title and content…"
          className="h-9 min-w-0 flex-1 rounded-control border border-control bg-surface px-3 text-[13px] text-text outline-none focus-visible:border-accent min-[640px]:max-w-md"
        />
        <button
          type="submit"
          className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised min-[900px]:min-h-8"
        >
          Search
        </button>
        {searchQuery && (
          <Link href={clearSearchHref} className="px-2 text-[12px] text-muted underline">
            Clear search
          </Link>
        )}
      </form>

      {columnOrder.length > 0 && (
        <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
          {isTableView && <input type="hidden" name="view" value="table" />}
          {searchQuery && <input type="hidden" name="search" value={searchQuery} />}
          <select
            name="property"
            defaultValue={filterProperty ?? ""}
            className="rounded-card border border-border bg-surface px-2 py-1.5 text-xs"
          >
            <option value="">Filter by property…</option>
            {columnOrder.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="q"
            defaultValue={filterQuery ?? ""}
            placeholder="Value contains…"
            className="rounded-card border border-border bg-surface px-2 py-1.5 text-xs"
          />
          <button
            type="submit"
            className="rounded-card border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-raised"
          >
            Apply
          </button>
          {filterProperty && (
            <Link
              href={searchQuery ? clearSearchHref : isTableView ? "/notes?view=table" : "/notes"}
              className="text-xs text-muted underline"
            >
              Clear
            </Link>
          )}
        </form>
      )}

      {filteredNotes.length === 0 ? (
        <p className="text-sm text-muted">
          {searchQuery || filterProperty ? (
            "No Notes match this search or filter."
          ) : (
            <>
              No active Notes.{" "}
              <Link href="/archive" className="underline">
                Open Archive
              </Link>
              .
            </>
          )}
        </p>
      ) : isTableView ? (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Title</th>
                {columnOrder.map((name) => (
                  <th key={name} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    {name}
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((note) => (
                <tr key={note.id} className="border-b border-border last:border-0 hover:bg-raised">
                  <td className="whitespace-nowrap px-3 py-2">
                    <Link href={`/notes/${note.id}`} className="font-medium hover:underline">
                      {note.title}
                    </Link>
                  </td>
                  {columnOrder.map((name) => {
                    const prop = note.properties.find((p) => p.name === name);
                    return (
                      <td key={name} className="whitespace-nowrap px-3 py-2 text-muted">
                        {prop ? formatPropertyValue(prop.type, prop.values[0]) : ""}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-1 text-right">
                    <NoteStatusButton noteId={note.id} status="ACTIVE" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredNotes.map((note) => (
            <li
              key={note.id}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-2"
            >
              <Link
                href={`/notes/${note.id}`}
                className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 py-2 hover:underline"
              >
                <span className="truncate text-sm font-medium">{note.title}</span>
                <span className="text-xs text-muted">
                  {note.updatedAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
              <NoteStatusButton noteId={note.id} status="ACTIVE" />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
