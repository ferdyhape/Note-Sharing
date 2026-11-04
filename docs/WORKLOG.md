# Notula — Work Log

Dated, narrative record of what was done and why. `CHECKLIST.md` is the current state (done/not done); this file is the history of how it got there. Newest entry on top.

## 2026-11-04

- Converted all 7 initialization `.docx` documents to readable Markdown (`docs/md/`).
- Reviewed the full documentation package; identified 7 unresolved/ambiguous items in the PRD (multi-schedule vs FR-008 wording, Editor permission boundary, reminder-recipient/sharing dependency, recurring priority mismatch with MVP recommendation, vague "where supported" language, search-filtering staging, missing property-history question).
- Ran a structured Q&A (12 questions) to resolve all open product decisions: multiple schedules per Note, Editor can edit shared Note's properties/schedules/reminders, reminder recipients must already hold Note access, recurring/all property types/independent reminders/property filtering pulled into MVP, property value history required, non-real-time shared editing, no floating schedules (default Asia/Jakarta), product name deferred at the time.
- Updated `01_PRD.md`, `02_Product_Architecture.md`, `03_Technical_Architecture.md`, `04_Data_Model_and_ERD.md`, `05_UX_Interaction_Specification.md`, `06_Development_Roadmap.md`, `00_README_Documentation_Guide.md` to reflect all 12 decisions.
- Researched mobile-first/PWA UX patterns and design-token tooling (DTCG format, three-tier token structure); agreed to apply actual visual design later via the `design-taste-frontend` skill, and to use the DTCG JSON format compiled through Style Dictionary for tokens.
- Compared backend/hosting stacks objectively (Laravel+Inertia, React+Go self-hosted, Next.js serverless). Inspected the existing VPS (`hapeworld@103.150.100.52`) directly over SSH: 1 vCPU, ~1GB RAM, already running mail hosting, aaPanel, MariaDB, Redis and 20+ other sites, with very little free headroom.
- Found and stopped two stale Claude Code remote CLI sessions on that VPS, freeing ~230MB RAM. Identified the VPS's `next-server` process as an unrelated personal portfolio site, and explained `multipathd`'s purpose (unused on this single-disk VPS, left running, not touched).
- Decided the technology stack: Next.js (TypeScript) on Vercel, PostgreSQL via Neon, Redis/cron via Upstash, Prisma ORM, Web Push via VAPID — not Laravel, not self-hosted Go, not the existing VPS (see ADR-0007).
- Wrote `docs/CODING_STANDARDS.md` and ADR-0001 through ADR-0008 covering: Note-centric model, Schedule/Reminder/Notification separation, sharing/permission model, property value history, timezone handling, expanded MVP scope, the technology stack, and non-real-time shared editing.
- Resolved remaining setup questions: auth strategy = email+password AND Google OAuth; reminder `note_id` is always set, `schedule_id` optional (closing the open item from ADR-0002); product name = **Notula**.
- Initialized the git repository and scaffolded the Next.js app (TypeScript, App Router, Tailwind, ESLint) at the repo root.
- Created this checklist and work log.

**Not yet done at end of this session:** `package.json` rename to `notula`, Prettier/Husky/lint-staged wiring, `.env.example`, Vercel/Neon/Upstash account creation, VAPID key generation, `prisma/schema.prisma`, design tokens, and the standalone UI reference screens (requested before any database wiring).
