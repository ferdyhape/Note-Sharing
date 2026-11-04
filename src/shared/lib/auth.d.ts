import type { DefaultSession } from "next-auth";

// Augment the default session type — our jwt/session callbacks in auth.ts
// put the user's id on session.user, which the library's own type doesn't have.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
