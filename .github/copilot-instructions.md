# Copilot instructions — Notula

This repo was built so far with Claude Code; these notes exist so GitHub Copilot (or any other assistant) picks up the same conventions and doesn't relearn them the hard way. Read `docs/CODING_STANDARDS.md` first — it's the canonical source for naming, API shape, validation, commits, secrets, the Auth.js Edge/Node split, and the verification checklist. This file only adds operational habits that aren't "coding style" but matter just as much.

Product/technical context: `docs/md/` (PRD, architecture, data model, UX spec), `docs/adr/` (one file per significant decision — read before changing anything an ADR covers), `docs/CHECKLIST.md` (phase-by-phase task list), `docs/WORKLOG.md` (dated narrative log — read the tail before starting new work, it has the "why" behind recent changes and real bugs found/fixed).

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
