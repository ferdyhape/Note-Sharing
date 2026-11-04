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
| Working name | Personal Notes & Scheduling Workspace |
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
| Share Notes with Owner, Editor and Viewer permissions. | Real-time multiplayer editing in MVP unless separately prioritized. |
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
| FR-008 | Schedule | A Note can have no schedule, a date/all-day schedule, a timed schedule or a date range. | Must |
| FR-009 | Recurring | A schedule can recur using common recurrence patterns and exceptions. | Should |
| FR-010 | Calendar | Calendar displays scheduled Notes and supports month, week, day and agenda views. | Must |
| FR-011 | Reminder | A schedule can have one or more reminder triggers; reminders may also be configured independently where supported. | Must |
| FR-012 | Recipients | Reminder recipients are explicit; each recipient can control their notification preferences. | Must |
| FR-013 | Push | Users can opt in/out of browser push per account/device subscription. | Must |
| FR-014 | In-app | The app maintains an in-app notification center independent of browser push. | Should |
| FR-015 | Sharing | A Note can be private or shared with explicit Owner/Editor/Viewer access. | Must |
| FR-016 | Isolation | Users cannot access Notes or property values without authorization. | Must |
| FR-017 | Views | Users can view selected Notes in a table/list and other supported visualizations. | Should |
| FR-018 | Export | Users can export one Note, selected Notes or filtered results to supported formats. | Must |
| FR-019 | Search | Users can search Note titles and content; property filtering can be added in stages. | Should |
| FR-020 | Auditability | The system records notification delivery attempts and important sharing changes. | Should |


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

Advanced types such as Formula, Rating, User, Rollup and richer attachment behavior are candidates for later phases. The exact MVP type list should be confirmed during technical design.

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

## 10. Sharing and permissions


| Capability | Owner | Editor | Viewer |
| --- | --- | --- | --- |
| Read Note | Yes | Yes | Yes |
| Edit content | Yes | Yes | No |
| Edit custom properties | Yes | Yes* | No |
| Edit schedule/reminders | Yes | Configurable policy* | No |
| Manage sharing | Yes | No by default | No |
| Delete Note | Yes | No | No |

*The exact permission boundary for Editor actions should be configurable or finalized before implementation. Reminder recipients and push preferences remain user-specific.

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

Recommended MVP: authentication, private Notes, rich editor, per-Note custom properties with core types, date/time scheduling, month/week/day/agenda calendar, simple reminders, opt-in browser push, basic sharing (Owner/Editor/Viewer), table export to XLSX/CSV and JSON backup.
Defer advanced formula/rollup, real-time collaborative editing, extensive analytics, complex recurrence exceptions, advanced permissions and broad file management until core workflows are validated.

## 14. Open questions and assumptions

- Final product name and visual identity are undecided.
- Whether shared Note editing must be real-time is not yet decided; assume standard persisted edits for MVP.
- Whether a Note may have multiple independent schedules is a product decision to confirm; architecture should not prohibit it.
- Exact custom property types for MVP require prioritization.
- Exact semantics for time-only properties and floating schedules require UX and technical validation.
- Whether reminders can exist without a Schedule should be explicitly specified; recommended: yes, via fixed trigger time.
- Push delivery depends on browser permissions, service-worker support, device state and platform behavior; it cannot be guaranteed.

## 15. Success measures

- Users can create and retrieve Notes with minimal friction.
- Users can add a custom property and enter a validated value without developer intervention.
- A configured property integration produces the expected calendar/reminder behavior.
- A reminder is not duplicated when jobs retry.
- Shared Note access respects the configured role.
- Users can export selected Notes and understand any format-specific limitations.