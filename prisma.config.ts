// Prisma 7 config: connection settings live here, not in schema.prisma.
// This file governs the CLI (migrate, db pull, studio) — it uses DIRECT_URL
// (a plain, non-pooled connection), since migrations need a direct connection.
// The app's own runtime PrismaClient (src/shared/lib/prisma.ts) is wired
// separately with the Neon serverless driver adapter against the pooled
// DATABASE_URL, since that's what Vercel's serverless functions need.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
