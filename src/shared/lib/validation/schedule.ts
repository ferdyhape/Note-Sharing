import { z } from "zod";

export const timezoneSchema = z
  .string()
  .min(1)
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }, "Expected a valid IANA timezone.");

const scheduleInputSchema = z
  .discriminatedUnion("scheduleType", [
    z.object({
      scheduleType: z.literal("ALL_DAY"),
      timezone: timezoneSchema.optional(),
      startDate: z.iso.date(),
      endDate: z.iso.date().optional(),
    }),
    z.object({
      scheduleType: z.literal("TIMED"),
      timezone: timezoneSchema.optional(),
      startAtUtc: z.iso.datetime({ offset: true }),
      endAtUtc: z.iso.datetime({ offset: true }).optional(),
    }),
    z.object({
      scheduleType: z.literal("RANGE"),
      timezone: timezoneSchema.optional(),
      startDate: z.iso.date(),
      endDate: z.iso.date(),
    }),
  ])
  .superRefine((schedule, context) => {
    if (
      schedule.scheduleType === "ALL_DAY" &&
      schedule.endDate &&
      schedule.startDate > schedule.endDate
    ) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must not precede start date.",
      });
    }
    if (schedule.scheduleType === "RANGE" && schedule.startDate > schedule.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date must not precede start date.",
      });
    }
    if (
      schedule.scheduleType === "TIMED" &&
      schedule.endAtUtc &&
      new Date(schedule.startAtUtc) >= new Date(schedule.endAtUtc)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endAtUtc"],
        message: "End time must follow start time.",
      });
    }
  });

export const createScheduleSchema = scheduleInputSchema;
export const updateScheduleSchema = z
  .object({
    scheduleType: z.enum(["ALL_DAY", "TIMED", "RANGE"]).optional(),
    timezone: timezoneSchema.optional(),
    startDate: z.iso.date().nullable().optional(),
    endDate: z.iso.date().nullable().optional(),
    startAtUtc: z.iso.datetime({ offset: true }).nullable().optional(),
    endAtUtc: z.iso.datetime({ offset: true }).nullable().optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, "At least one field is required.");

export type ScheduleInput = z.infer<typeof createScheduleSchema>;
export type SchedulePatch = z.infer<typeof updateScheduleSchema>;
