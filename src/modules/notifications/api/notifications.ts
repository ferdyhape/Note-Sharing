import { prisma } from "@/shared/lib/prisma";
import { requireUser } from "@/shared/lib/require-user";
import { apiData, apiError } from "@/shared/lib/api-response";
import {
  notificationListQuerySchema,
  notificationReadSchema,
} from "@/modules/notifications/schema";
import { getNotifications } from "@/modules/notifications/lib/get-notifications";
import { toNotificationDTO } from "@/modules/notifications/lib/notification-view";

type ItemRouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const parsed = notificationListQuerySchema.safeParse({
    filter: url.searchParams.get("filter") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid query.", 400);
  }

  if (parsed.data.cursor) {
    const cursor = await prisma.inAppNotification.findFirst({
      where: {
        id: parsed.data.cursor,
        userId: auth.userId,
        ...(parsed.data.filter === "unread" ? { readAt: null } : {}),
      },
      select: { id: true },
    });
    if (!cursor) return apiError("invalid_cursor", "Notification cursor is not available.", 400);
  }

  return apiData(await getNotifications(auth.userId, parsed.data));
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => null);
  const parsed = notificationReadSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }
  if (!parsed.data.read) {
    return apiError("invalid_input", "Bulk updates can only mark notifications as read.", 400);
  }

  const readAt = new Date();
  const result = await prisma.inAppNotification.updateMany({
    where: { userId: auth.userId, readAt: null },
    data: { readAt },
  });
  return apiData({ updatedCount: result.count, readAt: readAt.toISOString() });
}

export async function PATCH_ITEM(request: Request, { params }: ItemRouteParams) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = notificationReadSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("invalid_input", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  }

  const existing = await prisma.inAppNotification.findFirst({
    where: { id, userId: auth.userId },
    select: { id: true },
  });
  if (!existing) return apiError("not_found", "Notification not found.", 404);

  const notification = await prisma.inAppNotification.update({
    where: { id },
    data: { readAt: parsed.data.read ? new Date() : null },
    select: { id: true, type: true, payloadJson: true, readAt: true, createdAt: true },
  });
  return apiData(toNotificationDTO(notification));
}
