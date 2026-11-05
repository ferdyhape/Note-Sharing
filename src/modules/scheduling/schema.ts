import { z } from "zod";

const weekdaySchema = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);
const occurrenceKeySchema = z.iso
  .datetime({ offset: true })
  .refine((value) => value.endsWith("Z"), "Occurrence keys must be UTC instants.");

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

export const skipOccurrenceSchema = z
  .object({
    occurrenceKey: z.iso
      .datetime({ offset: true })
      .refine((value) => value.endsWith("Z"), "Occurrence keys must be UTC instants."),
  })
  .strict();

export const overrideOccurrenceSchema = z.discriminatedUnion("scheduleType", [
  z
    .object({
      occurrenceKey: occurrenceKeySchema,
      scheduleType: z.literal("TIMED"),
      startAtUtc: z.iso.datetime({ offset: true }),
      endAtUtc: z.iso.datetime({ offset: true }).nullable().optional(),
    })
    .strict()
    .superRefine((override, context) => {
      if (override.endAtUtc && new Date(override.startAtUtc) >= new Date(override.endAtUtc)) {
        context.addIssue({
          code: "custom",
          path: ["endAtUtc"],
          message: "End time must follow start time.",
        });
      }
    }),
  z
    .object({
      occurrenceKey: occurrenceKeySchema,
      scheduleType: z.literal("ALL_DAY"),
      startDate: z.iso.date(),
      endDate: z.iso.date().nullable().optional(),
    })
    .strict()
    .superRefine((override, context) => {
      if (override.endDate && override.startDate > override.endDate) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "End date must not precede start date.",
        });
      }
    }),
  z
    .object({
      occurrenceKey: occurrenceKeySchema,
      scheduleType: z.literal("RANGE"),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
    })
    .strict()
    .superRefine((override, context) => {
      if (override.startDate > override.endDate) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "End date must not precede start date.",
        });
      }
    }),
]);

export type RecurrenceInput = z.infer<typeof recurrenceInputSchema>;
export type SkipOccurrenceInput = z.infer<typeof skipOccurrenceSchema>;
export type OverrideOccurrenceInput = z.infer<typeof overrideOccurrenceSchema>;
