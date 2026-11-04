import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Runtime client for the app, separate from prisma.config.ts (which the CLI
// uses). Uses the Neon serverless driver adapter against the pooled
// DATABASE_URL, since Vercel's serverless functions can't hold a long-lived
// TCP connection the way `prisma migrate` can.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
