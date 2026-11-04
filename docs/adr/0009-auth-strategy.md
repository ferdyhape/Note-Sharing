# ADR-0009: Auth strategy — email+password and Google OAuth

Status: Accepted
Date: 2026-11-04

## Context

`01_PRD.md` listed "Authentication & account" as a module but never specified the mechanism. This had to be settled before `users` schema and the first API routes could be written.

## Decision

Support both:
- Email + password (credentials-based).
- Google OAuth.

Implemented via Auth.js (NextAuth) given the Next.js stack decided in ADR-0007.

## Consequences

- `users` table needs a nullable `password_hash` (null for OAuth-only accounts) plus the standard Auth.js account/session tables for the OAuth provider link.
- Sign-up/sign-in UI must offer both paths.
- Password reset flow is required for the credentials path; no equivalent is needed for Google OAuth.

## References

01_PRD §5 · ADR-0007
