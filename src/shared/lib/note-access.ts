import { prisma } from "@/shared/lib/prisma";
import type { NoteAccessLevel } from "./note-permissions";

export { canEdit } from "./note-permissions";
export type { NoteAccessLevel } from "./note-permissions";

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
