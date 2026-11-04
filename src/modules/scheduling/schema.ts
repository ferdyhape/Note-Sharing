import { z } from "zod";

const weekdaySchema = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);

export const recurrenceInputSchema = z
  .object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    interval: z.number().int().min(1).max(365).default(1),
    weekdays: z.array(weekdaySchema).max(7).optional(),
    monthDays: z.array(z.number().int().min(1).max(31)).max(31).optional(),
    count: z.number().int().min(1).max(1000).optional(),
    untilDate: z.iso.date().optional(),
  })
  .strict()
  .superRefine((rule, context) => {
    if (rule.count !== undefined && rule.untilDate !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["untilDate"],
        message: "Choose either an occurrence count or an end date, not both.",
      });
    }
    if (rule.weekdays && new Set(rule.weekdays).size !== rule.weekdays.length) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Weekdays must not contain duplicates.",
      });
    }
    if (rule.monthDays && new Set(rule.monthDays).size !== rule.monthDays.length) {
      context.addIssue({
        code: "custom",
        path: ["monthDays"],
        message: "Month days must not contain duplicates.",
      });
    }
    if (rule.frequency !== "WEEKLY" && rule.weekdays) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Weekday selection is only valid for weekly recurrence.",
      });
    }
    if (rule.frequency !== "MONTHLY" && rule.monthDays) {
      context.addIssue({
        code: "custom",
        path: ["monthDays"],
        message: "Month-day selection is only valid for monthly recurrence.",
      });
    }
    if (rule.frequency === "WEEKLY" && rule.weekdays?.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["weekdays"],
        message: "Select at least one weekday.",
      });
    }
    if (rule.frequency === "MONTHLY" && rule.monthDays?.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["monthDays"],
        message: "Select at least one day of the month.",
      });
    }
  });

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;
