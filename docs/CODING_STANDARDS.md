# Coding Standards

How code in this repository is written, structured and enforced, so the codebase stays consistent and maintainable as it grows. This complements the product/technical docs in `docs/docx` and `docs/md` — those describe what to build; this describes how to write it.

Stack: Next.js (TypeScript), Prisma, PostgreSQL (Neon), Upstash Redis, Vercel. See [ADR-0007](adr/0007-technology-stack.md).

## 1. Repository structure

Organize by **domain module**, not by file type. Modules mirror the boundaries in `02_Product_Architecture.md` §3: Notes, Properties, Integrations, Scheduling, Reminders, Notifications, Sharing, Export.

```
src/
  modules/
    notes/
      api/            # route handlers for this module
      components/     # UI components used only by this module
      lib/            # pure functions, module-specific logic
      types.ts
      schema.ts       # zod schemas for this module's inputs
    properties/
    scheduling/
    reminders/
    notifications/
    sharing/
    export/
  shared/
    components/       # cross-module UI (buttons, layout, design-token-driven primitives)
    lib/              # cross-module utilities (auth, db client, date/timezone helpers)
    design-tokens/     # generated token output (see Section 7)
  app/                # Next.js App Router pages, composing modules together
prisma/
  schema.prisma
  migrations/
docs/
  adr/                # one file per significant decision (see docs/adr/README.md)
  docx/, md/           # product/technical/UX docs
```

A module should be deletable by deleting its folder (plus its Prisma models and its one line of router wiring). Avoid a module reaching into another module's `lib/` internals — cross-module calls go through the other module's exported API only.

## 2. Naming conventions

| What | Convention | Example |
| --- | --- | --- |
| Variables, functions | `camelCase` | `getDueReminders` |
| React components, types, interfaces | `PascalCase` | `NotePropertyForm`, `ScheduleInput` |
| Files containing a component | `PascalCase.tsx` | `NotePropertyForm.tsx` |
| Other files (routes, utils, hooks) | `kebab-case.ts` | `get-due-reminders.ts` |
| Constants (module-level, immutable) | `UPPER_SNAKE_CASE` | `MAX_PROPERTIES_PER_NOTE` |
| Database tables/columns (Prisma) | `snake_case`, matching `04_Data_Model_and_ERD.md` exactly | `note_property_values` |
| React hooks | `useCamelCase`, prefixed `use` | `useReminderList` |

One name per concept, used the same way in the database column, the API field and the UI label. Don't rename a concept moving between layers (e.g. don't call it `note_id` in the DB and `noteID` in a DTO and `parentNote` in a prop) — translation layers between tiers of this kind are themselves a bug risk, not a style preference.

## 3. Formatting and linting

One shared config, not per-package overrides:

- **ESLint** (`@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) — `.eslintrc` at repo root.
- **Prettier** — `.prettierrc` at repo root; no conflicting rules duplicated in ESLint.
- **TypeScript strict mode** (`"strict": true` in `tsconfig.json`). No `any` — use `unknown` and narrow, or define the real type.
- Enforced via a pre-commit hook (`lint-staged` + `husky`) and again in CI. Formatting is never a manual review comment — if it's wrong, the hook blocks the commit.

## 4. Data validation

Every API route validates its input with a **zod** schema before touching Prisma. The zod schema is the single source of truth for "what does a valid request look like" — do not duplicate validation logic by hand in multiple places. Where a Prisma model and a zod schema describe the same entity, derive one from the other rather than maintaining both independently.

## 5. API conventions

- Route handlers under `src/modules/<module>/api/`, one file per resource/action.
- Response shape is consistent across all routes:
  ```ts
  // success
  { data: T }
  // error
  { error: { code: string; message: string } }
  ```
- Authorization check happens first in every handler, before any data is read — check access to the Note before resolving its properties, schedules, attachments or exports (see `03_Technical_Architecture.md` §7, IDOR prevention).
- Background/scheduled work (reminder due-scan) lives in its own route under `src/modules/reminders/api/cron/`, invoked only by Vercel Cron — never exposed as a normal user-facing endpoint.

## 6. Comments and documentation

- Comments explain **why**, never **what** — if removing the comment wouldn't confuse a future reader, don't write it.
- No commented-out code left in the codebase. Delete it; git history keeps it if ever needed.
- A non-obvious decision (not just "non-obvious code") gets an ADR in `docs/adr/`, not a long comment block. See `docs/adr/README.md` for when one is warranted.

## 7. Design tokens

Design tokens (colors, spacing, typography) are authored as DTCG-format JSON and compiled via Style Dictionary into `src/shared/design-tokens/`. Components reference generated CSS variables or TS constants — never hardcode a color or spacing value inline. Visual direction and token values are produced using the `design-taste-frontend` skill when UI work begins; this section only fixes *where tokens live and how they reach components*, not their values.

## 8. Testing

- **Unit tests** (Vitest): colocated next to the file under test, `*.test.ts`. Cover property type validation, recurrence parsing, reminder trigger calculation, permission checks.
- **E2E tests** (Playwright): under `tests/e2e/`, one file per user workflow (matches `06_Development_Roadmap.md` §3 acceptance criteria table — each row there should map to at least one E2E test).
- A bug fix includes a regression test reproducing it, added before the fix.

## 9. Commits and branches

- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`. Scope the module when useful: `feat(reminders): add fixed-time trigger mode`.
- `main` is always deployable. Feature work happens on short-lived branches, merged via PR even for a solo workflow — it gives CI a checkpoint before `main` and a reviewable diff for future-you.
- A migration-bearing commit states the migration in the message (`feat(properties): add value history table`), not just "db changes."

## 10. Environment and secrets

- `.env.example` lists every required variable with a placeholder value, kept in sync whenever a new one is added.
- Real secrets never committed — `.env` is gitignored. Vercel/Neon/Upstash credentials live in the platform's own environment variable settings, not in the repo.
- No secret or API key in client-side code or in a log line (see `03_Technical_Architecture.md` §7).

## 11. Migrations

- Every schema change is a Prisma migration, committed alongside the code that needs it — never a hand-edited production schema.
- A property-type or schedule-shape change that could break existing rows needs a migration *preview* path (per `04_Data_Model_and_ERD.md` §8) before it ships, not just a raw `ALTER`.
