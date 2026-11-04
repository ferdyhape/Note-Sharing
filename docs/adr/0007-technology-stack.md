# ADR-0007: Technology stack — serverless Next.js, not Laravel or self-hosted VPS

Status: Accepted
Date: 2026-11-04

## Context

Three real candidates were evaluated:

1. **Laravel + Inertia + Vue/React**, self-hosted.
2. **React + Go**, self-hosted on the existing VPS.
3. **Next.js (TypeScript) full-stack**, deployed serverless.

This is a solo-maintained, private project. The one available VPS (`hapeworld@103.150.100.52`) was inspected directly: 1 vCPU, ~1GB RAM, already running mail hosting (Postfix/Dovecot/Rspamd), a control panel (aaPanel), MariaDB, Redis, and over 20 other sites/side-projects, leaving very little free headroom (~300MB available after clearing two stale processes). Adding a persistent server process for this new project risks degrading those existing, actively-used services (notably mail).

Go would have the smallest runtime footprint of the three options and could fit the VPS's constraints, but would require writing substantially more boilerplate by hand (routing, ORM-equivalent, auth, validation) for a domain that is already data-model-heavy (dynamic per-Note properties, schedules, reminders, sharing). For a solo developer, development time is the scarcer resource, not server RAM.

## Decision

- **Frontend + backend:** Next.js (TypeScript), single codebase, API routes instead of a separate backend service.
- **Database:** PostgreSQL via Neon (serverless, scales to zero).
- **ORM:** Prisma.
- **Queue / scheduling:** Upstash Redis for queue/idempotency state; Vercel Cron triggers a scheduled API route that scans due reminders (no persistent worker process).
- **Hosting:** Vercel.
- **Push:** Web Push API + Service Worker + VAPID, via the `web-push` npm package.
- **File storage:** S3-compatible object storage (e.g. Cloudflare R2), decoupled from the app deployment.

## Consequences

- Zero load added to the existing VPS; existing mail and other hosted sites are unaffected.
- Effectively $0 infrastructure cost at this project's scale (free tiers of Vercel, Neon, Upstash).
- No server to provision, patch or maintain; deploy is `git push`.
- One language (TypeScript) across the entire stack.
- Trade-off: the reminder "worker" is a scheduled function invocation (Vercel Cron), not a long-running process. This is acceptable at personal scale but should be revisited if reminder volume or timing precision requirements grow significantly.
- Self-hosting (Laravel or Go, on a new dedicated VPS or the existing one once headroom allows) remains a valid future migration — not required now, and not blocked by this decision.

## References

03_Technical_Architecture §2, §9 · VPS inspection performed 2026-11-04 (hapeworld@103.150.100.52)
