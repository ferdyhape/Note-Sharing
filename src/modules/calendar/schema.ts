import { z } from "zod";
import { timezoneSchema } from "../../shared/lib/validation/schedule";

export const agendaQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    timezone: timezoneSchema.optional(),
  })
  .strict()
  .superRefine((query, context) => {
    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T00:00:00.000Z`);
    const dayCount = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

    if (dayCount < 1) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "End date must not precede start date.",
      });
    }
    if (dayCount > 62) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "Calendar windows are limited to 62 days.",
      });
    }
  });

export type AgendaQuery = z.infer<typeof agendaQuerySchema>;
