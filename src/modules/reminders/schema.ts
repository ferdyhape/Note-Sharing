import { z } from "zod";

const recipientUserIdsSchema = z
  .array(z.string().min(1))
  .min(1, "Select at least one shared Note recipient.")
  .refine((userIds) => new Set(userIds).size === userIds.length, "Recipients must be unique.");

const reminderFields = {
  recipientUserIds: recipientUserIdsSchema,
  enabled: z.boolean().optional(),
};

export const reminderRuleSchema = z.discriminatedUnion("triggerMode", [
  z
    .object({
      triggerMode: z.literal("FIXED"),
      fixedTriggerAt: z.iso.datetime({ offset: true }),
      ...reminderFields,
    })
    .strict(),
  z
    .object({
      triggerMode: z.literal("SCHEDULE_RELATIVE"),
      scheduleId: z.string().min(1),
      offsetSeconds: z.number().int().min(0),
      ...reminderFields,
    })
    .strict(),
]);

export type ReminderRuleInput = z.infer<typeof reminderRuleSchema>;
