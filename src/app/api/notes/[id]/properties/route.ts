import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess, canEdit } from "@/shared/lib/note-access";
import { apiData, apiError } from "@/shared/lib/api-response";
import { createPropertySchema } from "@/shared/lib/validation/property";
import { slugify } from "@/shared/lib/slugify";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);

  const properties = await prisma.noteProperty.findMany({
    where: { noteId },
    orderBy: { position: "asc" },
    include: { values: true },
  });

  return apiData(properties);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const access = await getNoteAccess(noteId, auth.userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canEdit(access)) return apiError("forbidden", "Viewers cannot add properties.", 403);

  const body = await request.json().catch(() => null);
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  const { name, type, inputConfig, required } = parsed.data;

  const [{ _max }, baseSlug] = await Promise.all([
    prisma.noteProperty.aggregate({ where: { noteId }, _max: { position: true } }),
    Promise.resolve(slugify(name)),
  ]);

  // Stable slug per Note (04_Data_Model_and_ERD.md §4) — append a numeric
  // suffix on collision rather than erroring, since the property name is
  // the thing the user typed and a duplicate is a normal thing to want.
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.noteProperty.findUnique({ where: { noteId_slug: { noteId, slug } } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const property = await prisma.noteProperty.create({
    data: {
      noteId,
      name,
      slug,
      type,
      inputConfigJson: inputConfig,
      required,
      position: (_max.position ?? -1) + 1,
    },
  });

  return apiData(property, { status: 201 });
}
