import type { NotificationType, Prisma } from "@prisma/client";
import { z } from "zod";
import type { NotificationDTO } from "@/modules/notifications/types";

type NotificationRecord = {
  id: string;
  type: NotificationType;
  payloadJson: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

function payloadText(payload: Prisma.JsonValue, key: string, limit: number) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : null;
}

const DEFAULT_TITLES: Record<NotificationType, string> = {
  REMINDER: "Reminder",
  SHARE_INVITE: "Note invitation",
  SHARE_REVOKED: "Note access updated",
};

export function toNotificationDTO(notification: NotificationRecord): NotificationDTO {
  const rawNoteId = payloadText(notification.payloadJson, "noteId", 64);
  const noteId = rawNoteId && z.cuid().safeParse(rawNoteId).success ? rawNoteId : null;

  return {
    id: notification.id,
    type: notification.type,
    title: payloadText(notification.payloadJson, "title", 120) ?? DEFAULT_TITLES[notification.type],
    message:
      payloadText(notification.payloadJson, "message", 500) ??
      payloadText(notification.payloadJson, "body", 500),
    noteId,
    readAt: notification.readAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}
