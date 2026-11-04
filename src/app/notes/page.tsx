import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { AppShell } from "@/shared/components/AppShell";
import { CreateNoteButton } from "@/shared/components/CreateNoteButton";

export default async function NotesPage() {
  const session = await auth();
  // Defense in depth — middleware already protects this route.
  if (!session?.user?.id) redirect("/login");

  const notes = await prisma.note.findMany({
    where: { ownerId: session.user.id, deletedAt: null, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  return (
    <AppShell active="notes">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[19px] font-semibold">All Notes</h1>
        <CreateNoteButton />
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted">
          No notes yet. Writing one starts with the button above — no setup needed first.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes/${note.id}`}
                className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3 hover:bg-raised"
              >
                <span className="text-sm font-medium">{note.title}</span>
                <span className="text-xs text-muted">
                  {note.updatedAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
