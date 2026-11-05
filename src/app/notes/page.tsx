import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/shared/components/AppShell";
import { CreateNoteButton } from "@/shared/components/CreateNoteButton";
import { formatPropertyValue } from "@/shared/lib/property-value";
import { matchesNoteSearch } from "@/modules/notes/lib/search";
import { NoteStatusButton } from "@/modules/notes/components/NoteStatusButton";
import { ExportActions } from "@/modules/export/components/ExportActions";
import { ExportSelectionForm } from "@/modules/export/components/ExportSelectionForm";
import { boardGroupOptions } from "@/modules/notes/lib/board-groups";

type SearchParams = {
  view?: string;
  property?: string;
  q?: string;
  search?: string;
  groupBy?: string;
};

const NOTE_VIEWS = ["list", "table", "board", "gallery"] as const;

export default async function NotesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  // Defense in depth — middleware already protects this route.
  if (!session?.user?.id) redirect("/login");

  const { view, property: filterProperty, q: filterQuery, search, groupBy } = await searchParams;
  const isTableView = view === "table";
  const isBoardView = view === "board";
  const isGalleryView = view === "gallery";
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

  const boardPropertyOptions = new Map<string, Map<string, string>>();
  for (const note of notes) {
    for (const property of note.properties) {
      if (property.type !== "SELECT") continue;
      const options = boardGroupOptions(property.inputConfigJson);
      if (options.length === 0) continue;
      const values = boardPropertyOptions.get(property.name) ?? new Map<string, string>();
      for (const option of options) values.set(option.value, option.label);
      boardPropertyOptions.set(property.name, values);
    }
  }
  const boardPropertyNames = [...boardPropertyOptions.keys()];
  const selectedGroupBy = boardPropertyNames.includes(groupBy ?? "")
    ? groupBy!
    : (boardPropertyNames[0] ?? "");
  const boardOptions = [...(boardPropertyOptions.get(selectedGroupBy)?.entries() ?? [])].map(
    ([value, label]) => ({ value, label }),
  );

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
  const groupedNoteIds = new Set<string>();
  const boardGroups = boardOptions.map((option) => {
    const groupNotes = filteredNotes.filter((note) => {
      const value = note.properties.find(
        (property) => property.type === "SELECT" && property.name === selectedGroupBy,
      )?.values[0]?.valueText;
      if (value !== option.value) return false;
      groupedNoteIds.add(note.id);
      return true;
    });
    return { ...option, notes: groupNotes };
  });
  const boardUnassigned = filteredNotes.filter((note) => !groupedNoteIds.has(note.id));

  function notesViewHref(nextView: "list" | "table" | "board" | "gallery") {
    const params = new URLSearchParams();
    if (nextView !== "list") params.set("view", nextView);
    if (filterProperty) params.set("property", filterProperty);
    if (filterQuery) params.set("q", filterQuery);
    if (searchQuery) params.set("search", searchQuery);
    if (nextView === "board" && selectedGroupBy) params.set("groupBy", selectedGroupBy);
    return params.size ? `/notes?${params}` : "/notes";
  }

  const clearSearchParams = new URLSearchParams();
  if (view && view !== "list") clearSearchParams.set("view", view);
  if (filterProperty) clearSearchParams.set("property", filterProperty);
  if (filterQuery) clearSearchParams.set("q", filterQuery);
  if (isBoardView && selectedGroupBy) clearSearchParams.set("groupBy", selectedGroupBy);
  const clearSearchHref = clearSearchParams.size ? `/notes?${clearSearchParams}` : "/notes";

  return (
    <AppShell active="notes">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[19px] font-semibold">All Notes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Notes views" className="hidden items-center gap-2 min-[900px]:flex">
            {NOTE_VIEWS.map((nextView) => (
              <Link
                key={nextView}
                href={notesViewHref(nextView)}
                aria-current={
                  (nextView === "list" && !view) || nextView === view ? "page" : undefined
                }
                className={`rounded-card border border-border px-3 py-1.5 text-xs font-medium ${(nextView === "list" && !view) || nextView === view ? "bg-raised" : "bg-surface"}`}
              >
                {nextView[0]!.toUpperCase() + nextView.slice(1)}
              </Link>
            ))}
          </nav>
          <details className="relative min-[900px]:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-card border border-border bg-raised px-3 text-xs font-medium [&::-webkit-details-marker]:hidden">
              View: {view ?? "list"}
            </summary>
            <nav
              aria-label="Notes views"
              className="absolute right-0 top-full z-30 mt-1 flex min-w-36 flex-col rounded-card border border-border bg-surface p-1"
            >
              {NOTE_VIEWS.map((nextView) => (
                <Link
                  key={nextView}
                  href={notesViewHref(nextView)}
                  aria-current={
                    (nextView === "list" && !view) || nextView === view ? "page" : undefined
                  }
                  className="flex min-h-11 items-center rounded-control px-3 text-[13px] capitalize text-text hover:bg-raised"
                >
                  {nextView}
                </Link>
              ))}
            </nav>
          </details>
          <ExportActions
            search={searchQuery}
            property={filterProperty ?? ""}
            query={filterQuery ?? ""}
          />
          <CreateNoteButton />
        </div>
      </div>

      <form className="mb-4 flex flex-wrap items-center gap-2" method="get">
        {view && <input type="hidden" name="view" value={view} />}
        {isBoardView && selectedGroupBy && (
          <input type="hidden" name="groupBy" value={selectedGroupBy} />
        )}
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
        <details className="mb-4 border-b border-rule py-2">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-[12px] font-medium text-text [&::-webkit-details-marker]:hidden">
            <span>Filter by property</span>
            <span className="text-[12px] font-normal text-muted">
              {filterProperty ?? `${columnOrder.length} available`}
            </span>
          </summary>
          <form className="mt-2 flex flex-wrap items-center gap-2" method="get">
            {view && <input type="hidden" name="view" value={view} />}
            {isBoardView && selectedGroupBy && (
              <input type="hidden" name="groupBy" value={selectedGroupBy} />
            )}
            {searchQuery && <input type="hidden" name="search" value={searchQuery} />}
            <select
              name="property"
              defaultValue={filterProperty ?? ""}
              className="rounded-card border border-border bg-surface px-2 py-1.5 text-xs"
            >
              <option value="">All properties</option>
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
              <Link href={clearSearchHref} className="text-xs text-muted underline">
                Clear
              </Link>
            )}
          </form>
        </details>
      )}

      {filteredNotes.length > 0 && (
        <ExportSelectionForm
          notes={filteredNotes.map(({ id, title }) => ({ id, title }))}
          search={searchQuery}
          property={filterProperty ?? ""}
          query={filterQuery ?? ""}
        />
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
      ) : isBoardView ? (
        <>
          {boardPropertyNames.length === 0 ? (
            <p className="text-[13px] text-muted">Add a Select property before using Board view.</p>
          ) : (
            <>
              <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
                <input type="hidden" name="view" value="board" />
                {searchQuery && <input type="hidden" name="search" value={searchQuery} />}
                {filterProperty && <input type="hidden" name="property" value={filterProperty} />}
                {filterQuery && <input type="hidden" name="q" value={filterQuery} />}
                <label className="flex flex-col gap-1 text-[12px] font-medium text-muted">
                  Group by
                  <select
                    name="groupBy"
                    defaultValue={selectedGroupBy}
                    className="h-9 rounded-control border border-control bg-surface px-3 text-[13px] text-text"
                  >
                    {boardPropertyNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="min-h-11 rounded-control border border-control px-3 text-[12px] font-medium text-text hover:bg-raised min-[900px]:min-h-8"
                >
                  Apply
                </button>
              </form>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {boardGroups.map((group) => (
                  <section
                    key={group.value}
                    className="w-[240px] flex-none border-r border-rule pr-4"
                  >
                    <h2 className="mb-2 flex items-center justify-between text-[13px] font-medium">
                      {group.label}
                      <span className="text-[12px] text-muted">{group.notes.length}</span>
                    </h2>
                    <ul className="flex flex-col gap-2">
                      {group.notes.map((note) => (
                        <li key={note.id} className="rounded-card border border-border bg-surface">
                          <Link href={`/notes/${note.id}`} className="block p-3 hover:bg-raised">
                            <span className="block truncate text-[13px] font-medium">
                              {note.title}
                            </span>
                            {note.contentText && (
                              <p className="mt-2 line-clamp-3 text-[12px] text-muted">
                                {note.contentText}
                              </p>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {boardUnassigned.length > 0 && (
                  <section className="w-[240px] flex-none border-r border-rule pr-4">
                    <h2 className="mb-2 flex items-center justify-between text-[13px] font-medium">
                      No value
                      <span className="text-[12px] text-muted">{boardUnassigned.length}</span>
                    </h2>
                    <ul className="flex flex-col gap-2">
                      {boardUnassigned.map((note) => (
                        <li key={note.id} className="rounded-card border border-border bg-surface">
                          <Link href={`/notes/${note.id}`} className="block p-3 hover:bg-raised">
                            <span className="block truncate text-[13px] font-medium">
                              {note.title}
                            </span>
                            {note.contentText && (
                              <p className="mt-2 line-clamp-3 text-[12px] text-muted">
                                {note.contentText}
                              </p>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            </>
          )}
        </>
      ) : isGalleryView ? (
        <ul className="grid grid-cols-1 gap-3 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
          {filteredNotes.map((note) => (
            <li key={note.id} className="rounded-card border border-border bg-surface">
              {/* The whole card is the tap target, not just the title line —
                  a single line of text was a cramped target on a phone. */}
              <Link href={`/notes/${note.id}`} className="block p-4 hover:bg-raised">
                <span className="block truncate text-[14px] font-medium">{note.title}</span>
                {note.contentText && (
                  <p className="mt-3 line-clamp-5 text-[13px] text-muted">{note.contentText}</p>
                )}
                <p className="mt-3 text-[12px] text-muted">
                  Updated{" "}
                  {note.updatedAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
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
