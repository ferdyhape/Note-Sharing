# Copilot instructions — Notula

This repo was built so far with Claude Code; these notes help GitHub Copilot and other assistants follow the same conventions. The Markdown files below are the active documentation. The legacy Word files under `docs/docx/` are not used; use their Markdown counterparts instead.

## Documentation index

Before implementation progress in a new task, read the active documents below for project context. Re-read the checklist and the newest worklog entry before choosing the next task, and revisit relevant docs/ADRs when a change touches their decisions. For follow-up work in the same session, previously read documents need not be reread unless they changed.

### Product and technical documentation

- [Documentation guide](../docs/md/00_README_Documentation_Guide.md)
- [Product requirements (PRD)](../docs/md/01_PRD.md)
- [Product architecture](../docs/md/02_Product_Architecture.md)
- [Technical architecture](../docs/md/03_Technical_Architecture.md)
- [Data model and ERD](../docs/md/04_Data_Model_and_ERD.md)
- [UX and interaction specification](../docs/md/05_UX_Interaction_Specification.md)
- [Development roadmap](../docs/md/06_Development_Roadmap.md)

### Engineering and project state

- [Coding standards](../docs/CODING_STANDARDS.md) — canonical source for structure, naming, APIs, validation, security and verification.
- [Build checklist](../docs/CHECKLIST.md) — current feature status; mark items complete only after verification.
- [Work log](../docs/WORKLOG.md) — dated implementation history; read the newest entry before starting.

### Architecture decision records

- [ADR index and authoring guide](../docs/adr/README.md)
- [ADR-0001: Note-centric model, no mandatory Collection](../docs/adr/0001-note-centric-no-mandatory-collection.md)
- [ADR-0002: Schedule, Reminder and Notification separation](../docs/adr/0002-schedule-reminder-notification-separation.md)
- [ADR-0003: Sharing and permission model](../docs/adr/0003-sharing-permission-model.md)
- [ADR-0004: Property value history](../docs/adr/0004-property-value-history.md)
- [ADR-0005: Explicit timezone, default Asia/Jakarta](../docs/adr/0005-timezone-handling.md)
- [ADR-0006: Expanded MVP scope](../docs/adr/0006-expanded-mvp-scope.md)
- [ADR-0007: Technology stack](../docs/adr/0007-technology-stack.md)
- [ADR-0008: Non-real-time shared editing](../docs/adr/0008-non-real-time-shared-editing.md)
- [ADR-0009: Authentication strategy](../docs/adr/0009-auth-strategy.md)
- [ADR-0010: DST policy for recurring schedules](../docs/adr/0010-dst-recurrence-policy.md)
- [ADR-0011: One-occurrence overrides for recurring schedules](../docs/adr/0011-recurring-occurrence-override.md)

## Before touching code

- `docs/CHECKLIST.md` and `docs/WORKLOG.md` are the source of truth for what's actually done — not what a commit message claims. Check them before assuming a feature is finished.
- A non-obvious product/architecture decision gets an ADR in `docs/adr/`, not just a code comment.

## Verification order (don't skip steps)

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`
4. A real browser smoke test for anything touching UI, auth, or middleware — run the dev server and click through the actual flow, not just a clean build. Two real bugs (an autosave race that silently dropped a title edit, a stale breadcrumb) made it past clean typecheck/lint/build before this step caught them.
5. Fix any real bug the smoke test finds, don't just note it.
6. Update `docs/CHECKLIST.md` / `docs/WORKLOG.md` to reflect only what was actually verified.

After a commit, `lint-staged`/husky auto-reformats staged files (eslint --fix + prettier) — re-run `npm run typecheck` once more before pushing.

## Secrets

- Dev and prod currently share one Neon database (see `ADR-0007`) — be careful with anything destructive.
- Every new local secret file needs its own `git check-ignore -v <file>` check before staging — the `.env*` pattern in `.gitignore` does not match names like `.neon.env` or `.vapid.env`, and it wrongly catches `.env.example` (which is meant to be tracked).
- Never print an actual secret value into a terminal, log, PR description, or chat. Remap env var names via redirection only (`sed ... > file`), never through a step that echoes the value.
- Neon's own dashboard naming is inverted from this project's: Neon's `DATABASE_URL_POOLED` → this project's `DATABASE_URL`; Neon's `DATABASE_URL` → this project's `DIRECT_URL`. Mis-mapping this breaks either the serverless runtime or `prisma migrate`.

## Test data

Any account/Note/property created while smoke-testing in the browser is throwaway — clean it up right after. A one-off Node script using the same `PrismaNeon` adapter pattern as `src/shared/lib/prisma.ts`, run from the project root with `.env` sourced, works well; delete the script after running it. Delete a test user's Notes before the User itself — `Note.ownerId` has no cascade-on-delete.

## Auth.js Edge/Node split (easy to regress)

`src/middleware.ts` must only import `src/shared/lib/auth.config.ts` (Edge-safe: providers + `jwt`/`session` callbacks, no Prisma adapter, no bcrypt). The full config in `src/shared/lib/auth.ts` (Prisma adapter + bcrypt) is Node-runtime only. Importing the full config into middleware previously bundled Prisma's engine + bcryptjs into the Edge Function and exceeded Vercel's 1 MB Hobby-plan limit (hit 1.39 MB). See `docs/CODING_STANDARDS.md` §12 and `docs/WORKLOG.md` for the full story.

## Git

- `main` is always deployable; never commit or push without being asked.
- Conventional Commits (`feat:`, `fix:`, `docs:`, …), scoped when useful.
- Review `git status` after staging, before committing, to catch stray files.

## Parallel work

If splitting work across multiple assistants/sessions: shared/contended state (package.json installs, the Prisma schema, shared zod validation modules, API routes a UI depends on) should land first and be verified; only then split independent, file-scope-isolated work (a self-contained UI component tree, a page) across parallel tracks. Re-run the full verification order on the _combined_ result afterward — each track's own clean build doesn't guarantee the merged tree is clean.
