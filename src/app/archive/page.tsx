import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/shared/components/AppShell";
import { NoteStatusButton } from "@/modules/notes/components/NoteStatusButton";

export default async function ArchivePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const notes = await prisma.note.findMany({
    where: { ownerId: session.user.id, deletedAt: null, status: "ARCHIVED" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return (
    <AppShell active="archive">
      <h1 className="mb-5 text-[19px] font-semibold">Archive</h1>
      {notes.length === 0 ? (
        <p className="text-[13px] text-muted">No archived Notes.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
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
                  {note.updatedAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </span>
              </Link>
              <NoteStatusButton noteId={note.id} status="ARCHIVED" />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
