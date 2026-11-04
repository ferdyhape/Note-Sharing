import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { getNoteAccess } from "@/shared/lib/note-access";
import { AppShell } from "@/shared/components/AppShell";
import { NoteEditorClient } from "@/shared/components/NoteEditorClient";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const access = await getNoteAccess(id, session.user.id);
  if (!access) notFound();

  const note = await prisma.note.findUniqueOrThrow({
    where: { id },
    select: { id: true, title: true, contentJson: true },
  });

  return (
    <AppShell active="notes">
      <NoteEditorClient
        noteId={note.id}
        initialTitle={note.title}
        initialContentJson={note.contentJson as JSONContent}
        accessLevel={access}
      />
    </AppShell>
  );
}
