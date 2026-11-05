import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/shared/lib/auth.config";

// A separate NextAuth instance built from the Edge-safe config only — never
// import "@/shared/lib/auth" here, it pulls in Prisma/bcrypt and blows past
// Vercel's Edge Function size limit (see WORKLOG).
const { auth } = NextAuth(authConfig);

const AUTH_PAGES = ["/login", "/register"];

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const { pathname } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/notes", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Everything except static assets, Next internals, and the Auth.js API
  // routes themselves (which must stay reachable to sign in at all) — the
  // root "/" is left out too (the `|$` alternative matches an empty
  // remainder, i.e. root), since it isn't a protected page yet.
  matcher: ["/((?!api/auth|api/cron/reminders|_next/static|_next/image|favicon.ico|$).*)"],
};
