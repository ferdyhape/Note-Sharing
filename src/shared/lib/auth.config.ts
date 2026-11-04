import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Edge-safe subset of the Auth.js config — middleware runs on the Edge
// runtime and only needs to decode the JWT session cookie, never Prisma or
// bcrypt. Pulling those into this file would bundle them into the
// middleware Edge Function (that's what blew past Vercel's 1 MB limit:
// see WORKLOG). The real Credentials authorize() lives in auth.ts, which
// only middleware.ts avoids importing.
export const authConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
} satisfies NextAuthConfig;
