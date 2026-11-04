import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/shared/lib/prisma";
import { authConfig } from "@/shared/lib/auth.config";

// Full config, Node runtime only (API routes, Server Components) — the
// Prisma adapter and real Credentials authorize() belong here, not in
// auth.config.ts, so middleware's Edge bundle never pulls them in.
//
// Auth.js forces JWT sessions whenever a Credentials provider is present
// (database sessions aren't supported for it) — ADR-0009 decided both
// email+password and Google, so this applies even though Google alone
// could use database sessions.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    authConfig.providers[0],
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // No account, or an OAuth-only account with no password set (ADR-0009).
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
});
