import type { NotificationType } from "@prisma/client";

export type NotificationDTO = {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  noteId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  notifications: NotificationDTO[];
  unreadCount: number;
  nextCursor: string | null;
};
