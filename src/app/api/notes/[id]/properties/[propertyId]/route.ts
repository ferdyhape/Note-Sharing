import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess, canEdit } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { updatePropertySchema } from "@/shared/lib/validation/property";

type RouteParams = { params: Promise<{ id: string; propertyId: string }> };

async function loadOwnedProperty(noteId: string, propertyId: string) {
  // Checked together so a propertyId from a different Note can't be
  // addressed through this Note's URL (IDOR, 03_Technical_Architecture.md §7).
  return prisma.noteProperty.findFirst({ where: { id: propertyId, noteId } });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, propertyId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot edit properties.", 403);

  const existing = await loadOwnedProperty(noteId, propertyId);
  if (!existing) return apiError("not_found", "Property not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  if (Object.keys(parsed.data).length === 0) {
    return apiError("invalid_input", "No fields to update.", 400);
  }

  const { inputConfig, ...rest } = parsed.data;
  const property = await prisma.noteProperty.update({
    where: { id: propertyId },
    // inputConfig's exact shape depends on the property's type (see
    // validation/property.ts); this endpoint doesn't re-derive that shape,
    // it trusts the caller sends a config matching the property's own type.
    data: {
      ...rest,
      ...(inputConfig ? { inputConfigJson: inputConfig as Prisma.InputJsonValue } : {}),
    },
  });

  return apiData(property);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, propertyId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot delete properties.", 403);

  const existing = await loadOwnedProperty(noteId, propertyId);
  if (!existing) return apiError("not_found", "Property not found.", 404);

  // Cascades to values, value history and integrations (prisma/schema.prisma).
  await prisma.noteProperty.delete({ where: { id: propertyId } });

  return apiData({ id: propertyId });
}
