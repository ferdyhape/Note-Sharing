import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess, canEdit } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";

const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  contentJson: z.unknown().optional(),
  contentText: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const access = await getNoteAccess(id, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);

  const note = await prisma.note.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      title: true,
      contentJson: true,
      contentText: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
    },
  });

  return apiData({ ...note, accessLevel: access });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const access = await getNoteAccess(id, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot edit this Note.", 403);

  const body = await request.json().catch(() => null);
  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  if (Object.keys(parsed.data).length === 0) {
    return apiError("invalid_input", "No fields to update.", 400);
  }

  const note = await prisma.note.update({
    where: { id },
    // contentJson is arbitrary TipTap document JSON — validated as "has a shape",
    // not a fixed schema, so the zod→Prisma Json type gap is a deliberate cast.
    data: parsed.data as Prisma.NoteUpdateInput,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return apiData(note);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const access = await getNoteAccess(id, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  // Delete is Owner-only (01_PRD.md §10) — Editors can edit content but not delete.
  if (access !== "OWNER") return apiError("forbidden", "Only the owner can delete this Note.", 403);

  await prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });

  return apiData({ id });
}
