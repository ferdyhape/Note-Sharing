import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { getNoteAccess } from "@/shared/lib/note-access";
import { canManageSharing } from "@/shared/lib/note-permissions";
import { apiData, apiError } from "@/shared/lib/api-response";
import { createShareSchema, updateShareSchema } from "@/modules/sharing/schema";

type CollectionRouteParams = { params: Promise<{ id: string }> };
type ItemRouteParams = { params: Promise<{ id: string; shareId: string }> };

const shareInclude = { user: { select: { id: true, name: true, email: true } } } as const;

async function requireOwner(noteId: string, userId: string) {
  const access = await getNoteAccess(noteId, userId);
  if (!access) return apiError("not_found", "Note not found.", 404);
  if (!canManageSharing(access)) {
    return apiError("forbidden", "Only the owner can manage sharing.", 403);
  }
  return null;
}

function uniqueConstraint(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function GET(_request: Request, { params }: CollectionRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const denial = await requireOwner(noteId, auth.userId);
  if (denial) return denial;

  const shares = await prisma.noteShare.findMany({
    where: { noteId },
    orderBy: { createdAt: "asc" },
    include: shareInclude,
  });
  return apiData(shares);
}

export async function POST(request: Request, { params }: CollectionRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId } = await params;

  const denial = await requireOwner(noteId, auth.userId);
  if (denial) return denial;

  const body = await request.json().catch(() => null);
  const parsed = createShareSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid share.", 400);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (!user) {
    return apiError(
      "account_not_found",
      "No registered account matches this email. They must register before sharing.",
      404,
    );
  }
  if (user.id === auth.userId) {
    return apiError("invalid_input", "You already own this Note.", 400);
  }

  try {
    const share = await prisma.$transaction(async (transaction) => {
      const created = await transaction.noteShare.create({
        data: { noteId, userId: user.id, role: parsed.data.role, grantedBy: auth.userId },
        include: shareInclude,
      });
      await transaction.inAppNotification.create({
        data: {
          userId: user.id,
          type: "SHARE_INVITE",
          payloadJson: {
            title: "A Note was shared with you",
            message: `You now have ${parsed.data.role.toLowerCase()} access to a shared Note.`,
            noteId,
          },
        },
      });
      return created;
    });
    return apiData(share, { status: 201 });
  } catch (error) {
    if (uniqueConstraint(error)) {
      return apiError("share_exists", "This user already has Note access.", 409);
    }
    throw error;
  }
}

export async function PATCH(request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, shareId } = await params;

  const denial = await requireOwner(noteId, auth.userId);
  if (denial) return denial;

  const existing = await prisma.noteShare.findFirst({
    where: { id: shareId, noteId },
    select: { userId: true },
  });
  if (!existing) return apiError("not_found", "Note share not found.", 404);

  const body = await request.json().catch(() => null);
  const parsed = updateShareSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid role.", 400);
  }

  const share = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.noteShare.update({
      where: { id: shareId },
      data: { role: parsed.data.role },
      include: shareInclude,
    });
    await transaction.inAppNotification.create({
      data: {
        userId: existing.userId,
        type: "SHARE_INVITE",
        payloadJson: {
          title: "Note access changed",
          message: `Your role is now ${parsed.data.role.toLowerCase()}.`,
          noteId,
        },
      },
    });
    return updated;
  });
  return apiData(share);
}

export async function DELETE(_request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id: noteId, shareId } = await params;

  const denial = await requireOwner(noteId, auth.userId);
  if (denial) return denial;

  const existing = await prisma.noteShare.findFirst({
    where: { id: shareId, noteId },
    select: { userId: true },
  });
  if (!existing) return apiError("not_found", "Note share not found.", 404);

  await prisma.$transaction(async (transaction) => {
    await transaction.reminderRecipient.deleteMany({
      where: { userId: existing.userId, reminder: { noteId } },
    });
    await transaction.noteShare.delete({ where: { id: shareId } });
    await transaction.inAppNotification.create({
      data: {
        userId: existing.userId,
        type: "SHARE_REVOKED",
        payloadJson: {
          title: "Note access updated",
          message: "Access to a shared Note was revoked.",
        },
      },
    });
  });
  return apiData({ id: shareId });
}
