import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { getNoteAccess } from "@/shared/lib/note-access";
import { AppShell } from "@/shared/components/AppShell";
import { NoteEditorClient } from "@/shared/components/NoteEditorClient";
import { PropertiesPanel, type PropertyDTO } from "@/shared/components/PropertiesPanel";
import { canEdit } from "@/shared/lib/note-access";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const access = await getNoteAccess(id, session.user.id);
  if (!access) notFound();

  const [note, properties] = await Promise.all([
    prisma.note.findUniqueOrThrow({
      where: { id },
      select: { id: true, title: true, contentJson: true },
    }),
    prisma.noteProperty.findMany({
      where: { noteId: id },
      orderBy: { position: "asc" },
      include: { values: true },
    }),
  ]);

  return (
    <AppShell active="notes">
      <NoteEditorClient
        noteId={note.id}
        initialTitle={note.title}
        initialContentJson={note.contentJson as JSONContent}
        accessLevel={access}
      />
      <PropertiesPanel
        noteId={note.id}
        // Dates/Decimals cross the server→client boundary as plain JSON, same
        // shape the /properties API returns after a mutation — keeps the two
        // data sources interchangeable on the client.
        initialProperties={JSON.parse(JSON.stringify(properties)) as PropertyDTO[]}
        canEdit={canEdit(access)}
      />
    </AppShell>
  );
}
