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
- [ ] Standalone UI reference built for remaining core screens: Calendar, standalone Reminders list, Dashboard/All Notes
- [ ] UI reference reviewed and approved as the visual baseline before backend wiring

## Phase 1 — Notes foundation

- [ ] Auth (email+password + Google OAuth)
- [ ] Private Note CRUD
- [ ] Rich editor (TipTap) wired to Note content
- [ ] Autosave with visible save state
- [ ] Note listing, search, archive

## Phase 2 — Dynamic properties

- [ ] Property definitions CRUD (all ten types)
- [ ] Property values with validation
- [ ] Property value change history (`note_property_value_history`)
- [ ] Table projection view
- [ ] Property-based filtering

## Phase 3 — Scheduling & Calendar

- [ ] Schedule CRUD (date/all-day, timed, range), multiple schedules per Note
- [ ] Recurrence rules (RRULE) + exceptions
- [ ] Calendar views: month/week/day/agenda
- [ ] Timezone handling, default Asia/Jakarta

## Phase 4 — Reminder & push

- [ ] Reminder rules (schedule-linked and independent fixed-time)
- [ ] Recipient selection scoped to Note's share list
- [ ] In-app notification center
- [ ] Service worker + Web Push (VAPID)
- [ ] Reminder due-scan via Vercel Cron, idempotent delivery

## Phase 5 — Sharing & export

- [ ] Owner/Editor/Viewer roles and authorization checks
- [ ] Share invitation flow
- [ ] XLSX/CSV/JSON export
- [ ] Authorization/cross-user security tests

## Phase 6 — Advanced capabilities

- [ ] Recurring schedule exceptions UI
- [ ] Board/Gallery views
- [ ] PDF/Markdown export
- [ ] Analytics
- [ ] Formula/Rollup properties

---

**How to use this file:** check an item when it's actually done and verified, not when started. When a checklist item turns out to need a decision, stop and raise it instead of guessing — then record the decision as an ADR and come back to check the item off.
