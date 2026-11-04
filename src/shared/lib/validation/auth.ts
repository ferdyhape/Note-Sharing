import { z } from "zod";

// Shared between POST /api/auth/register and the register page's own
// client-side validation — one set of rules, not duplicated by hand.
export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
