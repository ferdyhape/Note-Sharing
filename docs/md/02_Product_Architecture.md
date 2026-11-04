# Product Architecture
Modules, responsibilities and integration boundaries
Private project documentation • Draft v0.1 • 4 November 2026

## 1. Architecture overview

The product is Note-centric. A Note is the primary user-owned content object. Optional capabilities enrich it without changing the fact that it remains a free-form document.

## 2. Core domain concepts


| Concept | Responsibility | Important boundary |
| --- | --- | --- |
| Note | Title, rich content, owner, lifecycle and core metadata. | Does not require schedule, properties, sharing or collection. |
| Custom Property | Per-Note metadata definition and value. | Not a physical database column; not a mandatory global schema. |
| Property Integration | Connects a property to a capability. | Connection is explicit and separately configured. |
| Schedule | Defines when a Note is scheduled. | Not the same thing as a reminder. |
| Reminder | Defines a trigger and recipient policy. | Not the same thing as push subscription. |
| Notification | Represents an in-app or external delivery. | Delivery channel can fail independently. |
| Sharing | Controls who can access a Note. | Does not automatically subscribe everyone to reminders. |


## 3. Module map


| Module | Owns | Consumes |
| --- | --- | --- |
| Identity & Access | Users, sessions, timezone, permissions | All user-facing modules |
| Notes | Note content, lifecycle, search metadata | Identity & Access, Attachments |
| Properties | Property definitions, values, validation | Notes, Integration Engine, Export |
| Integration Engine | Property-to-feature mappings and sync rules | Properties, Calendar, Reminder, Relation |
| Scheduling | Schedules, recurrence rules, exceptions, occurrences | Notes, Calendar, Reminder |
| Calendar | Calendar query and presentation models | Scheduling, Notes, authorized property integrations |
| Reminder Engine | Reminder rules, recipients, trigger instances | Scheduling, Identity & Access |
| Notification Delivery | In-app notifications, push subscriptions, delivery logs | Reminder Engine |
| Sharing | Note shares, role grants, access checks | Notes, Properties, Scheduling, Export |
| Export & Views | Projection, filtering, formatting, export jobs | Notes, Properties, Scheduling, Sharing |


## 4. Core interaction flows


### 4.1 Create a Note

- User creates a Note with title and rich content.
- System saves the Note under the authenticated owner.
- User may add custom properties, schedule, reminder, tags, attachments or sharing.
- Each optional capability is persisted in its own domain model.

### 4.2 Create a DateTime property and connect it to Calendar

- User creates a DateTime property on a Note.
- Property service validates and stores the definition.
- Integration Engine recommends Calendar integration.
- User explicitly enables Calendar integration and selects the intended semantics.
- Integration Engine creates or updates a linked schedule projection/source mapping.
- Calendar reads the authorized schedule projection; it does not infer all DateTime properties automatically.

### 4.3 Reminder delivery

- Reminder Engine calculates due trigger instances from fixed time or schedule-relative offsets.
- A background worker claims due instances using an idempotency key.
- Recipient preferences and access are checked.
- In-app notification is persisted; browser push is attempted for active subscriptions.
- Delivery outcomes are logged; retry policy handles transient errors without duplicate logical notifications.

### 4.4 Share a Note

- Owner grants a user Viewer or Editor access.
- Authorization service checks the grant on every request.
- Shared access does not automatically enable reminders or push.
- Reminder recipients are configured separately and can opt out of push.

## 5. Property integration design principles

- Integration is opt-in even when recommended.
- A property can remain useful without any integration.
- A property integration has a stable mapping to a target capability and a defined sync direction.
- Avoid hidden bidirectional synchronization unless conflict behavior is specified.
- For Calendar/Reminder, define whether the property is a source of truth or a display/reference field.
- Changing or deleting a property must surface consequences for linked schedules/reminders.
- Integration operations must be idempotent and auditable.

## 6. Presentation model


| View | Data source | Notes |
| --- | --- | --- |
| Document | One Note + properties + extensions | Primary editing experience. |
| Table | Selected authorized Notes projected into property columns | Union of available properties; absent values are blank. |
| List | Note summaries and selected metadata | Compact browsing. |
| Board | Notes grouped by a selected compatible property | Typically Select; avoid assuming every property is groupable. |
| Calendar | Schedule occurrences and explicitly integrated date properties | Range-bounded query; recurring occurrences generated as needed. |
| Gallery | Note cards with chosen preview fields/attachments | Optional later view. |
| Analytics | Typed property values and aggregated metrics | Later phase; requires aggregation semantics. |


## 7. Export projection

- Export selection is a query over authorized Notes, not a separate data store.
- For tabular formats, construct a union of selected property definitions and map each Note to a row.
- Preserve property type metadata in JSON export.
- For XLSX, consider separate sheets for Notes, property definitions and relation edges when needed.
- For rich content, export plain text/Markdown or a separate content field; do not promise lossless spreadsheet conversion.
- Apply the same access checks to export as to normal reads.

## 8. Architecture decisions to record


| Decision | Current direction | Status |
| --- | --- | --- |
| Product center | Note-centric, free-form | Agreed |
| Collection | Not part of core architecture | Agreed |
| Custom properties | Dynamic per Note | Agreed |
| Property integration | Hybrid recommendation + explicit activation | Agreed |
| Schedule and Reminder | Separate domain concepts | Agreed |
| Multi-user | Private and shared Notes | Agreed |
| Real-time co-editing | Not assumed for MVP | Open |
| Multiple schedules per Note | Architecture should allow; UX policy open | Open |
