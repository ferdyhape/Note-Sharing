# Notula — Build Checklist

Ordered, structured task list from foundation through MVP. Check items off as they're done; see `WORKLOG.md` for the dated narrative of what happened and why. Phases match `06_Development_Roadmap.md` §1.

## Phase 0 — Discovery & foundation

### Decisions (product/technical)

- [x] 12 core product decisions resolved (see `01_PRD.md` §14)
- [x] Reminder `note_id`/`schedule_id` rule decided (ADR-0002: `note_id` always set, `schedule_id` optional)
- [x] Technology stack decided — Next.js, Prisma, Neon, Upstash, Vercel (ADR-0007)
- [x] Auth strategy decided — email+password AND Google OAuth (ADR-0009)
- [x] Product name decided — **Notula**
- [x] Relation property scope confirmed in schema (`NotePropertyValue.relationNoteId`/`relationUserId`, Note-to-Note and User target)
- [x] Attachment-as-property vs Note-level attachment modeled distinctly in schema (`PropertyType.ATTACHMENT` vs `NoteAttachment` model)

### Documentation

- [x] PRD, Product Architecture, Technical Architecture, Data Model, UX Spec, Roadmap converted to readable Markdown (`docs/md/`)
- [x] `CODING_STANDARDS.md` written
- [x] ADR-0001 through ADR-0009 written (ADR-0009: auth strategy)
- [x] ADR-0002 and `04_Data_Model_and_ERD.md` updated to close the `note_id`/`schedule_id` open item

### Repo & environment

- [x] Git repository initialized
- [x] GitHub repo created and pushed (`github.com/ferdyhape/Note-Sharing`, remote `origin`)
- [x] Next.js (TypeScript, App Router, Tailwind, ESLint) scaffolded
- [x] `package.json` name set to `notula`
- [x] Prettier + Husky + lint-staged wired per `CODING_STANDARDS.md` §3
- [x] `.env.example` created
- [x] Vercel project created and linked (`notula`, auto-deploy from `main`)
- [x] Neon Postgres instance created (Singapore), `DATABASE_URL`/`DIRECT_URL` set in Vercel (All Environments)
- [x] Upstash Redis instance created (Singapore, eviction off), `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` set in Vercel
- [x] Google OAuth client created, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` set in Vercel
- [x] VAPID keys generated for Web Push (`.vapid.env`, gitignored; public key also needed client-side)
- [x] `prisma/schema.prisma` written from `04_Data_Model_and_ERD.md` (20 models, all ADR decisions encoded as schema comments)
- [x] First migration run against Neon (`prisma/migrations/20261104115346_init`)

### Design

- [x] Note detail screen (editor + properties + schedule + reminder + sharing) built standalone, 10 direction options compared, merged into `design/note-detail/final-notula.html` (dark/light toggle)
- [x] Design tokens drafted (DTCG JSON) extracted from `final-notula.html` (`src/shared/design-tokens/`)
- [x] `final-notula.html` approved as the visual baseline (icon-rail shell, row-based tidy layout, hemat accent, light/dark toggle)
- [ ] Remaining core screens (Calendar, standalone Reminders list, Dashboard/All Notes) designed just-in-time within the phase that builds them, not upfront

## Phase 1 — Notes foundation

- [x] Auth (email+password + Google OAuth) — end-to-end verified: register → auto sign-in → `/notes`; re-visiting `/login` while signed in redirects away; signed-out visits to `/notes` redirect to `/login` (`src/middleware.ts`)
  - [x] Auth.js wired (`src/shared/lib/auth.ts`): Credentials (bcrypt) + Google providers, Prisma adapter, JWT sessions, `trustHost` for Vercel
  - [x] `POST /api/auth/register` (email+password sign-up), validated via shared `src/shared/lib/validation/auth.ts`
  - [x] Sign-in / sign-up pages (`src/app/login`, `src/app/register`)
  - [ ] Google OAuth exercised end-to-end (local `.env` still has empty `GOOGLE_CLIENT_ID`/`SECRET` — only set in Vercel so far; credentials path is verified)
  - [x] `NEXTAUTH_SECRET`/`NEXTAUTH_URL` set in Vercel
- [x] Private Note CRUD — end-to-end verified: create → edit title+body → autosave → reload persists → shows in list
  - [x] `GET/POST /api/notes`, `GET/PATCH/DELETE /api/notes/[id]` — ownership + share-role checked before every read (`src/shared/lib/note-access.ts`), DELETE is owner-only, soft delete via `deletedAt`
  - [x] Note editor / list UI (`src/app/notes/page.tsx`, `src/app/notes/[id]/page.tsx`)
- [x] Rich editor (TipTap) wired to Note content (`src/shared/components/RichEditor.tsx`, StarterKit)
- [x] Autosave with visible save state (`NoteEditorClient.tsx` — debounced, accumulates pending field changes so a title edit followed quickly by a body edit doesn't drop the title; fixed a real bug here, see WORKLOG)
- [x] Note search, archive — server-side title/body search preserves table/property filters; Archive/Restore actions use the existing status API and `/archive` lists archived Notes
- [x] App shell UI (`src/shared/components/AppShell.tsx`, `ThemeToggle.tsx`) — icon rail (desktop) / top bar + bottom nav (mobile), ported from `final-notula.html`; verified in both dev and a real `next build && next start`, light and dark, desktop and mobile

## Phase 2 — Dynamic properties

- [x] Property definitions CRUD (all ten types) — `GET/POST /api/notes/[id]/properties`, `PATCH/DELETE /api/notes/[id]/properties/[propertyId]`; slug collision handled with a numeric suffix; `createPropertySchema` is a static zod discriminated union, one branch per type (`src/shared/lib/validation/property.ts`)
- [x] Property values with validation — `PUT /api/notes/[id]/properties/[propertyId]/value`, `validatePropertyValue()` maps each type to its typed column (`src/shared/lib/property-value.ts`); end-to-end verified in browser for TEXT, SELECT, BOOLEAN (debounced text/number saves, immediate select/checkbox saves, reload persists)
- [x] Property value change history (`note_property_value_history`) — superseded value written in the same `$transaction` as the upsert; `GET .../history`; verified in browser (editing a value then opening History shows the prior value with author + timestamp)
- [x] Table projection view — `/notes?view=table`, columns are the union of property names across the user's Notes, missing properties render as empty cells (01_PRD.md's table-view rule), verified in browser
- [x] Property-based filtering — `/notes?view=table&property=<name>&q=<substring>` (plain GET form, no JS), verified both a matching and a non-matching filter in browser
- [ ] Attachment property type stores metadata only (`valueJson`) — no file upload/object storage yet (known gap, not required for Phase 2)

## Phase 3 — Scheduling & Calendar

- [x] Schedule CRUD (date/all-day, timed, range), multiple schedules per Note — Note detail panel supports add/edit/enable/disable/delete; browser-verified across all three schedule types, including timezone display and persistence after reload
- [ ] Recurrence rules (RRULE) + exceptions — RRULE authoring/API, bounded expansion, SKIP and one-occurrence OVERRIDE are implemented; “this and following” and whole-series edits remain open
- [x] Calendar views: month/week/day/agenda — 14-day Agenda, Month, Week and Day views implemented; browser-verified, including responsive navigation
- [x] Timezone handling, default Asia/Jakarta — account override is editable in Settings; clearing it restores the Asia/Jakarta default for new schedules

## Phase 4 — Reminder & push

- [x] Reminder rules (schedule-linked and independent fixed-time) — Note-scoped create/edit/enable/disable/delete is implemented for fixed timestamps and enabled timed schedules
- [x] Recipient selection scoped to Note's share list — the picker only lists existing shares and the API rejects other user IDs
- [x] In-app notification center — user-scoped list, All/Unread filter, cursor paging, per-item and bulk read state
- [ ] Service worker + Web Push (VAPID) — Settings opt-in/device revoke, subscription API, VAPID sender and `public/sw.js` are implemented; end-to-end push remains unverified because the smoke-test browser denied notification permission
- [ ] Reminder due-scan via Vercel Cron, idempotent delivery — scanner and protected route are implemented/tested; production schedule is blocked on `CRON_SECRET` and a Vercel Pro/Enterprise plan for per-minute timing

## Phase 5 — Sharing & export

- [x] Owner/Editor/Viewer roles and authorization checks — edit and Owner-only share-management policies are explicit; Note share grant, role change and revoke are enforced server-side
- [x] Share invitation flow for registered accounts — Owner grants Viewer/Editor by email and the recipient receives an in-app notice; unregistered addresses must register first
- [x] XLSX/CSV/JSON export — current filtered active Notes, selected owned Notes (up to 100), or one accessible Note; JSON preserves rich content and metadata
- [ ] Authorization/cross-user security tests — role-policy tests and cross-user Notification/Reminder smoke checks exist; a full automated route matrix remains open

## Phase 6 — Advanced capabilities

- [x] Recurring schedule exceptions UI — Calendar supports Skip, Edit occurrence/override and Reset; edits are deliberately limited to one occurrence per ADR-0011
- [ ] Board/Gallery views
- [x] PDF/Markdown export — Markdown preserves supported TipTap formatting; PDF is paginated and readable, with unsupported glyphs replaced when using the built-in WinAnsi font
- [ ] Analytics
- [ ] Formula/Rollup properties

---

**How to use this file:** check an item when it's actually done and verified, not when started. When a checklist item turns out to need a decision, stop and raise it instead of guessing — then record the decision as an ADR and come back to check the item off.
