import { z } from "zod";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { apiData, apiError } from "@/shared/lib/api-response";

const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
});

const emptyDocument = { type: "doc", content: [] };

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const notes = await prisma.note.findMany({
    where: {
      ownerId: auth.userId,
      deletedAt: null,
      ...(status === "ARCHIVED" || status === "ACTIVE" ? { status } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
  });

  return apiData(notes);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const note = await prisma.note.create({
    data: {
      ownerId: auth.userId,
      title: parsed.data.title,
      contentJson: emptyDocument,
      contentText: "",
    },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
  });

  return apiData(note, { status: 201 });
}
