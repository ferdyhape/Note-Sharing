import { z } from "zod";

export const notificationReadSchema = z.object({ read: z.boolean() }).strict();
export const notificationListQuerySchema = z
  .object({
    filter: z.enum(["all", "unread"]).default("all"),
    cursor: z.string().min(1).optional(),
  })
  .strict();

export type NotificationReadInput = z.infer<typeof notificationReadSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
