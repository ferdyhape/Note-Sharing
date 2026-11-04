# Development Roadmap
Phases, priorities, milestones and acceptance criteria
Private project documentation • Draft v0.1 • 4 November 2026

## 1. Delivery strategy

Build a usable vertical slice early, then expand. Keep a modular monolith and defer advanced abstractions until a real workflow needs them.

| Phase | Focus | Deliverables |
| --- | --- | --- |
| 0. Discovery & foundation | Finalize decisions and engineering foundation | PRD review, UX wireframes, repo setup, environments, auth/data model baseline. |
| 1. Notes foundation | Core writing experience | Auth, private Notes, rich editor, autosave, listing, search, archive. |
| 2. Dynamic properties | Flexible Note metadata | Per-Note property definitions, core input types, validation, property values, basic table projection. |
| 3. Scheduling & Calendar | Time-aware Notes | Date/all-day, timed, range schedules, month/week/day/agenda calendar, timezone behavior. |
| 4. Reminder & push | Reliable reminders | Reminder rules, recipient preferences, in-app notifications, service worker, Web Push, worker and delivery logs. |
| 5. Sharing & export | Multi-user workflows | Owner/Editor/Viewer, shared Notes, XLSX/CSV/JSON export, authorization tests. |
| 6. Advanced capabilities | Power and polish | Recurring exceptions, relation properties, board/gallery, PDF/Markdown export, analytics, formula/rollup. |


## 2. MVP priority recommendation


| Priority | Features |
| --- | --- |
| P0 | Authentication, private Note CRUD, rich editor, autosave, basic custom properties, date/time schedule, calendar, simple reminders, push opt-in, access isolation. |
| P1 | Basic sharing roles, multi-device push subscriptions, table projection, XLSX/CSV/JSON export, tags, attachments. |
| P2 | Recurring exceptions, Relation property, Board/Gallery, advanced filters, formula/rollup, analytics, PDF/Markdown export. |


## 3. Acceptance criteria by workflow


| Workflow | Acceptance criteria |
| --- | --- |
| Create Note | A signed-in user can create a Note with title and content; it persists and is visible only to its owner unless shared. |
| Edit Note | Edits save reliably; user receives a clear saved/saving/error state. |
| Add custom property | User can create a property with a supported type, configure it, enter a value and see validation errors. |
| Property integration | A compatible property produces a recommendation; no integration activates until user confirms. |
| Calendar | A scheduled Note appears in the correct date/time range for the configured timezone. |
| Recurring | A recurring schedule displays expected occurrences in a bounded calendar range and respects exceptions. |
| Reminder | A due reminder creates one logical notification even if the worker retries. |
| Push opt-in | A user can subscribe a browser/device, revoke it and continue using in-app notifications. |
| Sharing | Viewer cannot edit; Editor can perform allowed edits; revoked users lose access. |
| Export | Export includes selected authorized Notes and custom property columns; missing values are handled consistently. |


## 4. Test strategy

- Unit tests for property type validation, recurrence parsing, reminder trigger calculation and permission policies.
- Integration tests for property-to-calendar mapping, reminder scheduling and notification idempotency.
- Authorization tests across owner, editor, viewer and unrelated user.
- Timezone tests for local time, UTC conversion, daylight-saving transitions and all-day dates.
- Export tests for mixed property schemas, empty values, rich content and relation fields.
- End-to-end tests for create Note → add property → connect Calendar → configure reminder → receive in-app/push notification.

## 5. Release readiness checklist

- No cross-user data leakage in Notes, properties, calendar, reminders, attachments or exports.
- Reminder processing is retry-safe and observable.
- Push permission is optional and revocable.
- Timezone and recurring behavior are documented and tested.
- Export limitations are communicated in the UI.
- Backups, migrations and restore procedures are tested.
- Core flows are usable on desktop and mobile web.

## 6. Dependencies and risks


| Dependency / risk | Impact | Response |
| --- | --- | --- |
| Rich editor document schema | Affects persistence, export and future editor compatibility. | Choose editor schema early; version stored documents. |
| Property type evolution | Affects values, filters, exports and integrations. | Stable property IDs and explicit type migrations. |
| Recurrence complexity | Can create calendar/reminder edge cases. | Limit initial supported rules; expand with tests. |
| Browser push support | Varies by browser/platform and permission. | In-app fallback and transparent capability checks. |
| Shared editing concurrency | Potential overwrites and permission complexity. | Defer real-time co-editing; use conflict/version handling initially. |
| Scope expansion | May delay usable MVP. | Protect P0 scope and place advanced features in later phases. |
