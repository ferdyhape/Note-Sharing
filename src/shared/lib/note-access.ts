import { prisma } from "@/shared/lib/prisma";

export type NoteAccessLevel = "OWNER" | "EDITOR" | "VIEWER" | null;

/**
 * Single place every Note-scoped route checks access through (03_Technical_Architecture.md
 * §7: check access to the Note before resolving anything nested under it).
 * Owner is notes.ownerId, never a NoteShare row (ADR-0003) — checked first.
 */
export async function getNoteAccess(noteId: string, userId: string): Promise<NoteAccessLevel> {
  const note = await prisma.note.findUnique({
    where: { id: noteId, deletedAt: null },
    select: {
      ownerId: true,
      shares: { where: { userId }, select: { role: true } },
    },
  });
  if (!note) return null;
  if (note.ownerId === userId) return "OWNER";
  return note.shares[0]?.role ?? null;
}

export function canEdit(level: NoteAccessLevel): boolean {
  return level === "OWNER" || level === "EDITOR";
}
