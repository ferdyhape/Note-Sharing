import { z } from "zod";

export const notificationReadSchema = z.object({ read: z.boolean() }).strict();
const pushKeySchema = z
  .string()
  .min(16)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);

export const pushSubscriptionSchema = z
  .object({
    endpoint: z
      .url()
      .refine((value) => value.startsWith("https://"), "Expected an HTTPS endpoint."),
    keys: z
      .object({
        p256dh: pushKeySchema,
        auth: pushKeySchema,
      })
      .strict(),
    userAgent: z.string().max(512).nullable().optional(),
  })
  .strict();

export const notificationListQuerySchema = z
  .object({
    filter: z.enum(["all", "unread"]).default("all"),
    cursor: z.string().min(1).optional(),
  })
  .strict();

export type NotificationReadInput = z.infer<typeof notificationReadSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
