# Technical Architecture
Logical system design and implementation guidance
Private project documentation • Draft v0.1 • 4 November 2026

## 1. Recommended logical architecture

Use a modular monolith for the first production version, with clear domain boundaries and background workers. This keeps deployment and development manageable while allowing later extraction of notification or export services if scale requires it.

| Layer | Responsibilities |
| --- | --- |
| Web client | Rich editor, property forms, calendar views, sharing UI, notification preferences. |
| Application API | Authentication, authorization, validation, domain commands and queries. |
| Domain modules | Notes, Properties, Integrations, Scheduling, Reminders, Sharing, Export. |
| Relational database | Transactional source of truth for users, notes, properties, schedules and permissions. |
| Object storage | Attachments and generated export files. |
| Queue / job runner | Reminder dispatch, recurring occurrence preparation, export jobs and retries. |
| Push delivery adapter | Web Push using VAPID and stored device subscriptions. |


## 2. Technology selection guidance

### Decided (4 November 2026)

| Concern | Decision | Why |
| --- | --- | --- |
| Frontend + Backend | Next.js (TypeScript), full-stack in one codebase | One language end to end; API routes avoid a separate backend service; mature PWA tooling (next-pwa / vite-plugin-pwa pattern). |
| Rich editor | TipTap/ProseMirror | Extensible schema, custom nodes, native React integration. |
| Database | PostgreSQL via Neon (serverless Postgres) | Relational integrity, JSONB for typed property configuration, scales to zero, no database server to operate. |
| ORM | Prisma | Type-safe queries matching the TypeScript codebase; migrations tooling comparable to Eloquent. |
| Queue / scheduling | Upstash Redis + Vercel Cron | Due-reminder scanning triggered on a schedule; Upstash gives idempotency/queue state without a persistent worker process. |
| Hosting | Vercel | Zero-config git-push deploy; scales to zero; no server to patch or maintain. |
| Push | Web Push API + Service Worker + VAPID (`web-push` npm package) | Browser push without requiring the page to remain open. |
| File storage | S3-compatible object storage (e.g. Cloudflare R2 or AWS S3) | Scalable attachment and export storage, decoupled from the app deployment. |
| Calendar recurrence | RRULE-compatible recurrence representation plus exception records | Established recurrence semantics. |

### Rationale

Chosen over a Laravel backend and over self-hosting on the existing VPS: the VPS already runs mail hosting, a control panel and multiple other sites on 1 vCPU / ~1GB RAM with little headroom, so adding a persistent server process there risks those existing services. A serverless stack adds zero load to that VPS, costs effectively nothing at this project's scale, and needs no server administration — the best match for a solo-maintained private project where development time is the scarcer resource. Self-hosting (Laravel or a Go backend) remains a valid later migration if resource needs change; it is not required now.


## 3. Logical data boundaries

- Notes module owns Note title, content and lifecycle.
- Properties module owns property schema and typed values.
- Integration module owns mappings between properties and capabilities.
- Scheduling module owns schedule records and recurrence semantics.
- Reminder module owns reminder rules, recipients and trigger instances.
- Notification module owns subscriptions, in-app notifications and delivery attempts.
- Sharing module owns access grants and authorization policy.
- Export module creates read-only projections and files.

## 4. Scheduling and recurrence

- Persist instants in UTC while retaining the IANA timezone used to interpret user-entered local times and recurring wall-clock rules.
- Floating (timezone-less) schedules are not supported; default to Asia/Jakarta when the user has not set a timezone.
- A Note may have multiple independent schedules; each is persisted and queried as a separate row, not merged into one.
- Represent all-day dates as date values or explicit all-day semantics, not as arbitrary midnight UTC timestamps.
- Represent date-only, timed and date-range modes explicitly to avoid ambiguous null combinations.
- Use RRULE-like recurrence rules with explicit DTSTART/timezone and exception records.
- Generate occurrences for requested calendar windows; do not permanently create an unbounded number of future rows.
- Materialize a bounded horizon of reminder trigger instances for efficient job processing.
- Per ADR-0010, skip occurrences in daylight-saving gaps without consuming RRULE `COUNT`; for overlaps, choose the earlier instant. Define behavior for edits to a recurring series before enabling occurrence-specific editing.
- Still decide whether a monthly rule on a missing date (for example, the 31st) skips that month or moves to its last day, and document the choice before implementing that behavior.

## 5. Reminder processing


| Stage | Behavior |
| --- | --- |
| Schedule calculation | Create trigger instances from fixed trigger time or schedule-relative offsets. |
| Due scan | Worker claims due trigger instances in bounded batches. |
| Eligibility | Check reminder enabled state, recipient, access, user preferences and device subscriptions. |
| Logical notification | Create a stable notification record with idempotency key. |
| Delivery | Persist in-app notification and attempt Web Push per eligible subscription. |
| Retry | Retry transient failures with backoff; disable/remove expired subscriptions when provider response indicates invalidity. |
| Audit | Record status, timestamps, error class and safe diagnostic metadata. |


## 6. Web Push considerations

- Push is opt-in and requires user permission and a valid service-worker subscription.
- Store each subscription per user and device/browser; allow users to revoke individual devices.
- Do not assume push delivery is guaranteed or immediate.
- Keep payloads privacy-conscious; avoid exposing sensitive Note content on lock screens by default.
- Handle expired subscriptions and endpoint changes.
- In-app notifications should continue to work when push is disabled or unsupported.

## 7. Security and privacy

- Enforce authorization server-side for every resource and every nested operation.
- Use tenant/owner scoping consistently; shared access is an explicit grant, not a public identifier.
- Prevent IDOR by checking access to Note before resolving properties, attachments, schedules or exports.
- Validate and sanitize rich content on input and output; define safe embed and link policies.
- Use signed, time-limited attachment and export URLs.
- Protect push subscription keys and avoid logging full endpoints or sensitive content unnecessarily.
- Rate-limit authentication, sharing invitations, export and push-subscription endpoints.
- Maintain audit events for sharing changes, deletion and notification operations.

## 8. Performance and reliability

- Paginate Note listings and use indexed search fields.
- Index owner_id, shared access lookup keys, schedule start/end and reminder due time.
- Use bounded calendar queries and recurrence expansion windows.
- Queue exports and large attachment operations.
- Use idempotency keys and transactional outbox or equivalent pattern for reliable event-to-job handoff.
- Monitor queue lag, due reminder backlog, push failures and export failures.

## 9. Deployment topology

Decided: fully serverless. Next.js deployed on Vercel (web + API routes, HTTPS included); Neon for PostgreSQL (scales to zero); Upstash Redis for queue/idempotency state; Vercel Cron triggers a scheduled API route that scans due reminders instead of a persistent worker process; S3-compatible storage (e.g. Cloudflare R2) for attachments and exports. No VPS, container host or always-on process is required or used for this project. The architecture does not require microservices for MVP.

## 10. Technical risks


| Risk | Mitigation |
| --- | --- |
| Timezone and recurrence edge cases | Explicit timezone model, recurrence test suite and documented semantics. |
| Duplicate reminders | Idempotency keys, unique constraints and retry-safe workers. |
| Property schema changes | Version definitions; validate migrations and warn before destructive changes. |
| Property integration drift | Explicit source-of-truth policy, sync status and idempotent reconciliation. |
| Permission leakage | Central authorization policies and cross-user security tests. |
| Push limitations | Opt-in UX, in-app fallback and transparent delivery status. |
| Export mismatch | Document format limitations and test representative rich content/property types. |
