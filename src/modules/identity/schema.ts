import { z } from "zod";
import { timezoneSchema } from "../../shared/lib/validation/schedule";

export const updateTimezoneSchema = z.object({ timezone: timezoneSchema.nullable() }).strict();

export type UpdateTimezoneInput = z.infer<typeof updateTimezoneSchema>;
