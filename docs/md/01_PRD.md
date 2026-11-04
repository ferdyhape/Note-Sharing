# Product Requirements Document
Personal Notes & Scheduling Workspace
Private project documentation • Draft v0.1 • 4 November 2026

## Document control


| Field | Value |
| --- | --- |
| Status | Draft for product and technical review |
| Version | 0.1 |
| Date | 4 November 2026 |
| Product type | Multi-user web application |
| Product name | Notula |
| Primary concept | A note-centric workspace with flexible scheduling, reminders, dynamic properties, sharing, visualization and export. |


## 1. Executive summary

The product is a multi-user web application centered on free-form Notes. Users create rich-text documents and optionally enrich each Note with dynamic custom properties, schedules, reminders, tags, attachments and sharing permissions. Calendar is a time-based visualization of scheduled Notes; reminders are independently configured triggers; push notifications are an opt-in delivery channel.
The product is deliberately note-centric rather than database-centric. Notes do not require a Collection and do not share a mandatory custom-column schema. Each Note may have its own optional properties and integrations.

## 2. Product vision and principles

- Make capturing and writing information the simplest primary action.
- Keep every extension optional: a Note can remain a plain document.
- Allow each Note to define its own custom properties without a mandatory global schema.
- Keep property definitions, property values and integrations conceptually separate.
- Treat Schedule, Reminder and Notification as distinct capabilities.
- Support private and shared Notes with explicit permissions.
- Make information portable through useful export formats.
- Prefer progressive disclosure: powerful configuration should not burden ordinary note-taking.

## 3. Goals and non-goals


| Goals | Non-goals for initial release |
| --- | --- |
| Create, edit, search and organize rich Notes. | A full Notion-style database/Collection builder. |
| Attach optional dynamic custom properties to individual Notes. | Mandatory standardized columns across all Notes. |
| Schedule Notes by date/time, ranges and recurring rules. | Complex resource booking or enterprise workforce scheduling. |
| Configure reminders and opt-in browser push notifications. | Guaranteed delivery when browser/device/platform does not support push. |
| Share Notes with Owner, Editor and Viewer permissions. | Real-time multiplayer editing (decided: non-real-time, standard persisted save model for MVP). |
| Visualize and export Notes and their properties. | Perfect round-trip conversion of rich text into spreadsheet cells. |


## 4. Users and primary use cases


| User / role | Needs |
| --- | --- |
| Personal user | Capture ideas, maintain notes, schedule important information and receive reminders. |
| Note owner | Control Note content, properties, schedule, sharing and deletion. |
| Editor | Edit shared Note content and permitted properties/schedules. |
| Viewer | Read shared Note and permitted metadata without modifying it. |


## 5. Product scope and modules


| Module | Scope |
| --- | --- |
| Authentication & account | Registration, login, account settings, timezone and user preferences. |
| Notes | Rich-text title/content, autosave, search, archive, pin and note lifecycle. |
| Custom Properties | Per-Note property definitions, configurable input types, validation and values. |
| Property Integration | Hybrid recommendations plus explicit user-controlled connections to supported features. |
| Scheduling & Calendar | All-day/date, timed, date range, recurring rules, exceptions and calendar views. |
| Reminder | One or more reminders, offsets or fixed trigger times, recipients and enabled state. |
| Notifications | In-app notifications and opt-in browser push subscriptions per device. |
| Sharing | Private/shared Notes, invitations or access grants, Owner/Editor/Viewer permissions. |
| Visualization & Export | Table/list/board/calendar/gallery views where applicable; XLSX, CSV, JSON, PDF and Markdown. |
| Attachments & Tags | Optional file attachments and lightweight Note organization. |


## 6. Functional requirements


| ID | Area | Requirement | Priority |
| --- | --- | --- | --- |
| FR-001 | Notes | A user can create, view, edit, archive and delete a Note. | Must |
| FR-002 | Rich editor | The editor supports common formatting: headings, emphasis, lists, checklist, links, quote and code block. | Must |
| FR-003 | Autosave | The system persists edits and communicates save state to the user. | Must |
| FR-004 | Custom properties | A user can add, edit, reorder, hide and remove custom properties on an individual Note. | Must |
| FR-005 | Input configuration | Each property supports a data type, input configuration, validation and optional default value. | Must |
| FR-006 | Property values | Property values are stored separately from property definitions and validated against the definition. | Must |
| FR-007 | Property integration | The system recommends compatible integrations based on type; the user explicitly enables/configures them. | Must |
| FR-008 | Schedule | A Note can have no schedule, or one or more independent schedules, each date/all-day, timed or date range. | Must |
| FR-009 | Recurring | A schedule can recur using common recurrence patterns and exceptions. | Must |
| FR-010 | Calendar | Calendar displays scheduled Notes and supports month, week, day and agenda views. | Must |
| FR-011 | Reminder | A schedule can have one or more reminder triggers; reminders can also be configured independently of any schedule, using a fixed trigger time. | Must |
| FR-012 | Recipients | Reminder recipients are explicit; each recipient must already hold Note access (Owner/Editor/Viewer) granted via sharing, and can control their own notification preferences. | Must |
| FR-013 | Push | Users can opt in/out of browser push per account/device subscription. | Must |
| FR-014 | In-app | The app maintains an in-app notification center independent of browser push. | Should |
| FR-015 | Sharing | A Note can be private or shared with explicit Owner/Editor/Viewer access. | Must |
| FR-016 | Isolation | Users cannot access Notes or property values without authorization. | Must |
| FR-017 | Views | Users can view selected Notes in a table/list and other supported visualizations. | Should |
| FR-018 | Export | Users can export one Note, selected Notes or filtered results to supported formats. | Must |
| FR-019 | Search | Users can search Note titles and content, and filter Notes by custom property values. | Must |
| FR-020 | Auditability | The system records notification delivery attempts and important sharing changes. | Should |
| FR-021 | Property history | Property values retain change history; prior values remain retrievable. | Must |


## 7. Custom property requirements

Custom Properties are optional, dynamic metadata attached to an individual Note. They are not Collection columns and do not imply a global schema.

| Property type | Initial input behavior | Potential configuration |
| --- | --- | --- |
| Text | Single-line or multiline | Placeholder, max length, required |
| Number | Integer or decimal | Min/max, precision, unit |
| Boolean | Checkbox or toggle | Default value, label |
| Select | Single choice | Options, labels, colors, default |
| Multi-select | Multiple choices | Options, colors, max selections |
| Date / Time / DateTime | Native date/time input | Display format, timezone semantics, allowed range |
| URL / Email | Validated text input | Placeholder, validation |
| Currency | Amount with currency code | Currency, precision |
| Relation | Reference to another Note or supported entity | Cardinality, reciprocal display, allowed target |
| Attachment | File selection | Allowed types, size limits |

All ten property types listed above are included in MVP. Advanced types such as Formula, Rating, User and Rollup are candidates for later phases.

## 8. Property integration behavior

- Hybrid integration: the system suggests integrations based on property type, but does not silently activate them.
- A Date/DateTime property may be offered as a Calendar source and/or Reminder reference.
- A User property may be offered for assignment or reminder recipient selection, subject to permissions.
- A Relation property may link Notes and optionally show reciprocal relationships.
- A Number property may be used by later Formula/Analytics capabilities.
- Integration configuration must not collapse property data into schedule/reminder records.
- If a property value changes, dependent integrations must be updated safely and idempotently.
- If a property is deleted or its type changes, the user must be warned about dependent integrations and affected data.

## 9. Scheduling and reminder rules

- Unscheduled Notes do not appear on Calendar unless another explicit calendar source is configured.
- All-day/date-only entries appear in the all-day area.
- Timed entries occupy their start/end time range.
- Date ranges span the relevant calendar days.
- Recurring rules support daily, weekly, monthly and custom patterns, with an end condition where applicable.
- Users can edit one occurrence, this-and-following occurrences, or the entire series.
- Store timezone context and distinguish local wall-clock recurrence from absolute instants.
- Reminder triggers are generated from a schedule or configured fixed time; push is a delivery channel, not the reminder itself.
- A Note may have multiple independent schedules; each is created, edited and removed separately.
- Floating (timezone-less) schedules are not supported; every schedule stores an explicit timezone, defaulting to Asia/Jakarta when the user has not set one.

## 10. Sharing and permissions


| Capability | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| Read Note | Yes | Yes | Yes |
| Edit content | Yes | Yes | No |
| Edit custom properties | Yes | Yes | No |
| Edit schedule/reminders | Yes | Yes | No |
| Manage sharing | Yes | No by default | No |
| Delete Note | Yes | No | No |

Editor may edit a shared Note's content, custom properties, schedules and reminders, but cannot manage sharing or delete the Note. Reminder recipients must already hold Note access (Viewer or Editor) granted via sharing; push preferences remain user-specific.

## 11. Visualization and export

- Table view combines selected Notes and their available custom properties; missing properties render as empty cells.
- Calendar view is driven by explicit schedule or configured date-property integration.
- Board view can group Notes by a compatible Select property.
- Gallery/list views are presentation choices and must not duplicate underlying Note records.
- XLSX/CSV exports are tabular; rich content and attachments may be represented as plain-text summaries and links.
- JSON is suitable for structured backup/integration; Markdown is suitable for document portability; PDF is suitable for readable output.
- Export should support one Note, selected Notes and filtered selections, subject to access permissions.

## 12. Non-functional requirements


| Area | Requirement |
| --- | --- |
| Security | Enforce server-side authorization on every Note, property, schedule, reminder and attachment operation. |
| Privacy | Private Notes must not leak through search, exports, calendar queries or notification payloads. |
| Reliability | Background reminder processing must be retryable and idempotent. |
| Performance | Common Note reads and edits should feel responsive; calendar queries should be range-bounded. |
| Scalability | Notification delivery and recurring occurrence generation should be background-job based. |
| Accessibility | Keyboard navigation, semantic controls and readable contrast for core workflows. |
| Portability | Export formats should preserve as much structured information as each format supports. |
| Observability | Log scheduler runs, delivery attempts, failures and integration errors without exposing sensitive content unnecessarily. |


## 13. MVP recommendation

Recommended MVP: authentication, private and shared Notes (Owner/Editor/Viewer), rich editor, per-Note custom properties across all ten supported types with value change history, date/time scheduling including recurring rules and multiple independent schedules per Note, month/week/day/agenda calendar, reminders both schedule-linked and independent (fixed trigger time), opt-in browser push, property-based filtering, table export to XLSX/CSV and JSON backup.
Defer advanced formula/rollup, real-time collaborative editing, extensive analytics, complex recurrence exceptions beyond standard patterns, advanced permission customization and broad file management until core workflows are validated.
This is a wider MVP scope than a minimal slice: recurring schedules, the full property type set, independent reminders and property filtering were deliberately pulled forward from later phases. This raises implementation risk (timezone/DST edge cases, reminder idempotency across more trigger modes) and should be tracked explicitly in the Roadmap.

## 14. Open questions and assumptions

### Resolved (4 November 2026)

- Shared Note editing is not real-time; standard persisted edits for MVP.
- A Note may have multiple independent schedules.
- All ten custom property types (Section 7) are included in MVP, with value change history.
- Floating (timezone-less) schedules are not supported; default timezone is Asia/Jakarta.
- Reminders can exist without a Schedule, via a fixed trigger time; included in MVP.
- Editor can edit a shared Note's custom properties, schedules and reminders (Section 10).
- Reminder recipients must already hold Note access (Viewer/Editor) granted via sharing.
- Recurring schedules and property-based filtering are included in MVP, not deferred.

### Still open

- Visual identity (logo, color direction beyond the token system) is undecided — deferred to the `design-taste-frontend` skill when UI work begins.
- Push delivery depends on browser permissions, service-worker support, device state and platform behavior; it cannot be guaranteed.

## 15. Success measures

- Users can create and retrieve Notes with minimal friction.
- Users can add a custom property and enter a validated value without developer intervention.
- A configured property integration produces the expected calendar/reminder behavior.
- A reminder is not duplicated when jobs retry.
- Shared Note access respects the configured role.
- Users can export selected Notes and understand any format-specific limitations.

## 16. Build tracking

This PRD and its companion documents describe what to build and why. Day-to-day execution is tracked in two separate files, kept outside this document so they can change daily without re-issuing the PRD:

- `docs/CHECKLIST.md` — the ordered, checkable build task list, grouped by Roadmap phase. An item is checked only once actually done and verified, not when merely started.
- `docs/WORKLOG.md` — a dated, narrative log of work sessions: what was done, what was decided, and what was deliberately left for later. Newest entry first.

Every significant decision made during implementation (not just during this initial planning pass) gets an ADR under `docs/adr/`, following the same practice used to record the decisions in this PRD.