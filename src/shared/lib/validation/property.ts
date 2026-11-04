import { z } from "zod";

// The ten MVP property types (01_PRD.md §7). DATE_TIME and URL_EMAIL each
// bundle a sub-mode in inputConfig rather than splitting into more enum
// values — see prisma/schema.prisma's PropertyType comment for why.
const optionSchema = z.object({
  value: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  color: z.string().max(30).optional(),
});

const inputConfigByType = {
  TEXT: z.object({
    multiline: z.boolean().optional(),
    maxLength: z.number().int().positive().optional(),
  }),
  NUMBER: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    precision: z.number().int().min(0).max(10).optional(),
    unit: z.string().max(20).optional(),
  }),
  BOOLEAN: z.object({}),
  SELECT: z.object({ options: z.array(optionSchema).min(1).max(50) }),
  MULTI_SELECT: z.object({
    options: z.array(optionSchema).min(1).max(50),
    maxSelections: z.number().int().positive().optional(),
  }),
  DATE_TIME: z.object({ mode: z.enum(["date", "time", "datetime"]) }),
  URL_EMAIL: z.object({ mode: z.enum(["url", "email"]) }),
  CURRENCY: z.object({
    currency: z.string().length(3), // ISO 4217, e.g. "IDR", "USD"
    precision: z.number().int().min(0).max(4).optional(),
  }),
  RELATION: z.object({ target: z.enum(["NOTE", "USER"]) }),
  ATTACHMENT: z.object({
    maxSizeBytes: z.number().int().positive().optional(),
    allowedTypes: z.array(z.string()).optional(),
  }),
} as const;

export type PropertyTypeKey = keyof typeof inputConfigByType;

const nameAndRequired = {
  name: z.string().min(1).max(100),
  required: z.boolean().optional().default(false),
};

// A discriminated union so inputConfig is validated against the shape its
// own `type` requires, not a generic bag of optional fields. Written out
// explicitly (not generated from inputConfigByType) because zod's
// discriminatedUnion needs its branches as literal types at the type level,
// not a value built from Object.entries/map.
export const createPropertySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("TEXT"), ...nameAndRequired, inputConfig: inputConfigByType.TEXT }),
  z.object({
    type: z.literal("NUMBER"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.NUMBER,
  }),
  z.object({
    type: z.literal("BOOLEAN"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.BOOLEAN,
  }),
  z.object({
    type: z.literal("SELECT"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.SELECT,
  }),
  z.object({
    type: z.literal("MULTI_SELECT"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.MULTI_SELECT,
  }),
  z.object({
    type: z.literal("DATE_TIME"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.DATE_TIME,
  }),
  z.object({
    type: z.literal("URL_EMAIL"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.URL_EMAIL,
  }),
  z.object({
    type: z.literal("CURRENCY"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.CURRENCY,
  }),
  z.object({
    type: z.literal("RELATION"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.RELATION,
  }),
  z.object({
    type: z.literal("ATTACHMENT"),
    ...nameAndRequired,
    inputConfig: inputConfigByType.ATTACHMENT,
  }),
]);

export const updatePropertySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  // Type changes need a compatibility check against existing values
  // (04_Data_Model_and_ERD.md §8) — not supported through this endpoint yet.
  inputConfig: z.record(z.string(), z.unknown()).optional(),
});

export function inputConfigSchemaFor(type: string) {
  return inputConfigByType[type as PropertyTypeKey];
}
