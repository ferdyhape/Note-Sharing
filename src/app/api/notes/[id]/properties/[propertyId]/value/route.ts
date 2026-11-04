import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess, canEdit } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { validatePropertyValue } from "@/shared/lib/property-value";

type RouteParams = { params: Promise<{ id: string; propertyId: string }> };

const setValueSchema = z.object({ value: z.unknown() });

export async function PUT(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, propertyId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot edit property values.", 403);

  const property = await prisma.noteProperty.findFirst({ where: { id: propertyId, noteId } });
  if (!property) return apiError("not_found", "Property not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = setValueSchema.safeParse(body);
  if (!parsed.success) return apiError("invalid_input", "Expected { value }.", 400);

  const result = validatePropertyValue(property.type, property.inputConfigJson, parsed.data.value);
  if (!result.ok) return apiError("invalid_input", result.message, 400);

  const existing = await prisma.notePropertyValue.findUnique({ where: { propertyId } });

  // Value history is insert-only (ADR-0004) — the superseded value is
  // written before the current one is overwritten, in one transaction so a
  // failure can't leave the two out of sync.
  const [updated] = await prisma.$transaction([
    prisma.notePropertyValue.upsert({
      where: { propertyId },
      create: {
        propertyId,
        ...result.columns,
      } as Prisma.NotePropertyValueUncheckedCreateInput,
      update: result.columns as Prisma.NotePropertyValueUncheckedUpdateInput,
    }),
    ...(existing
      ? [
          prisma.notePropertyValueHistory.create({
            data: {
              propertyId,
              valueJson: existing.valueJson ?? undefined,
              valueText: existing.valueText,
              valueNumber: existing.valueNumber,
              valueDate: existing.valueDate,
              changedById: auth.userId,
            },
          }),
        ]
      : []),
  ]);

  return apiData(updated);
}
