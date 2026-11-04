import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";

type RouteParams = { params: Promise<{ id: string; propertyId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, propertyId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);

  const property = await prisma.noteProperty.findFirst({ where: { id: propertyId, noteId } });
  if (!property) return apiError("not_found", "Property not found.", 404);

  const history = await prisma.notePropertyValueHistory.findMany({
    where: { propertyId },
    orderBy: { changedAt: "desc" },
    include: { changedBy: { select: { id: true, name: true } } },
  });

  return apiData(history);
}
