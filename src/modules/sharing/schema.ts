import { z } from "zod";

const shareRoleSchema = z.enum(["EDITOR", "VIEWER"]);

export const createShareSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    role: shareRoleSchema,
  })
  .strict();

export const updateShareSchema = z.object({ role: shareRoleSchema }).strict();

export type CreateShareInput = z.infer<typeof createShareSchema>;
export type UpdateShareInput = z.infer<typeof updateShareSchema>;
