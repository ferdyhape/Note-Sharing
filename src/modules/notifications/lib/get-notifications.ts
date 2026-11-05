import { prisma } from "@/shared/lib/prisma";
import { toNotificationDTO } from "@/modules/notifications/lib/notification-view";
import type { NotificationPage } from "@/modules/notifications/types";

const PAGE_SIZE = 25;

export async function getNotifications(
  userId: string,
  { filter, cursor }: { filter: "all" | "unread"; cursor?: string },
): Promise<NotificationPage> {
  const where = {
    userId,
    ...(filter === "unread" ? { readAt: null } : {}),
  };
  const [records, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, type: true, payloadJson: true, readAt: true, createdAt: true },
    }),
    prisma.inAppNotification.count({ where: { userId, readAt: null } }),
  ]);

  const hasMore = records.length > PAGE_SIZE;
  const pageRecords = hasMore ? records.slice(0, PAGE_SIZE) : records;
  return {
    notifications: pageRecords.map(toNotificationDTO),
    unreadCount,
    nextCursor: hasMore ? (pageRecords.at(-1)?.id ?? null) : null,
  };
}
