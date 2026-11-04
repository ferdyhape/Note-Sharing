# Data Model & ERD
Conceptual entities, relationships and data dictionary
Private project documentation • Draft v0.1 • 4 November 2026

## 1. Modeling principles

- The Note is the primary content entity.
- A Note has no mandatory custom-property schema.
- Custom property definitions and values are separate.
- Schedule, Reminder and Notification are separate domains.
- Sharing grants access but does not automatically subscribe users to reminders.
- Use relational constraints for core ownership and relationships; use JSON for flexible configuration, not as a substitute for all relational data.

## 2. Conceptual ERD

USERS  | 1  |----< NOTES >----< NOTE_SHARES >---- USERS           |           |----< NOTE_PROPERTIES >----< NOTE_PROPERTY_VALUES           |             |           |             |----< PROPERTY_INTEGRATIONS           |           |----< NOTE_SCHEDULES >----< RECURRENCE_RULES           |             |           |             |----< SCHEDULE_EXCEPTIONS           |             |           |             |----< REMINDERS >----< REMINDER_RECIPIENTS >---- USERS           |           |----< NOTE_ATTACHMENTSUSERS ----< PUSH_SUBSCRIPTIONSUSERS ----< IN_APP_NOTIFICATIONSREMINDER_TRIGGER_INSTANCES ----< NOTIFICATION_DELIVERIES

## 3. Entity inventory


| Entity | Purpose | Key relationships |
| --- | --- | --- |
| users | Account and user preferences | Owns Notes; receives reminders; owns push subscriptions. |
| notes | Core document | Belongs to owner; has properties, schedules, shares and attachments. |
| note_properties | Per-Note property definitions | Belongs to Note; has values and integrations. |
| note_property_values | Current value for a property | Belongs to property and Note; typed/validated against definition. |
| note_property_value_history | Prior values of a property (change history) | Belongs to property; one row per superseded value. |
| property_integrations | Configured property-to-feature mapping | Belongs to property; references supported integration type and target configuration. |
| note_schedules | Date/time schedule | Belongs to Note; may have recurrence rules and reminders. |
| recurrence_rules | Recurring schedule definition | Belongs to schedule. |
| schedule_exceptions | Skipped or modified occurrences | Belongs to recurring schedule. |
| reminders | Reminder trigger configuration | Belongs to Note or schedule according to chosen policy. |
| reminder_recipients | Users who should receive a reminder | Belongs to reminder and user. |
| note_shares | Access grants | Connects Note to user with role. |
| push_subscriptions | Browser/device push endpoint and keys | Belongs to user. |
| in_app_notifications | Notification center records | Belongs to recipient user. |
| notification_deliveries | Channel delivery attempts | Belongs to logical notification and subscription/channel. |
| note_attachments | File metadata | Belongs to Note and uploader. |


## 4. Data dictionary (proposed)


| Table | Important fields | Notes |
| --- | --- | --- |
| users | id, name, email, password_hash (nullable for OAuth-only accounts), timezone, created_at | Timezone uses IANA identifier. Auth supports email+password and Google OAuth (ADR-0009); OAuth accounts/sessions use Auth.js's standard tables alongside this one. |
| notes | id, owner_id, title, content_json, content_text, status, created_at, updated_at, deleted_at | content_json stores editor document; content_text supports search/export. |
| note_properties | id, note_id, name, slug, type, input_config_json, validation_json, position, required, definition_version | Unique slug/name policy per Note should be decided. |
| note_property_values | id, property_id, value_json, value_text, value_number, value_date, updated_at | Typed columns or type-specific tables may be selected based on query needs. |
| note_property_value_history | id, property_id, value_json, value_text, value_number, value_date, changed_by, changed_at | Insert-only; one row written each time note_property_values changes. |
| property_integrations | id, property_id, integration_type, enabled, config_json, sync_direction, status | Examples: calendar_source, reminder_reference, relation. |
| note_schedules | id, note_id, schedule_type, start_at_utc, end_at_utc, start_date, end_date, timezone, source_property_id, enabled | Use explicit schedule_type to avoid ambiguous nullable fields. |
| recurrence_rules | id, schedule_id, rrule, timezone, starts_at, ends_at, until_date | RRULE-compatible representation; validate supported subset. |
| schedule_exceptions | id, schedule_id, occurrence_key, exception_type, override_json | Skip or override an occurrence. |
| reminders | id, note_id, schedule_id (nullable), trigger_mode, offset_seconds, fixed_trigger_at, enabled | `note_id` is always set. `schedule_id` is set only when `trigger_mode` is schedule-relative; null when the reminder is independent (fixed time). Decided 2026-11-04 (ADR-0002). |
| reminder_recipients | id, reminder_id, user_id, enabled, channel_preferences_json | User preference is independent of subscription availability. |
| note_shares | id, note_id, user_id, role, granted_by, created_at | Unique (note_id, user_id). |
| push_subscriptions | id, user_id, endpoint, p256dh, auth, user_agent, last_seen_at, revoked_at | Encrypt or protect sensitive subscription material. |
| in_app_notifications | id, user_id, type, payload_json, read_at, created_at | Avoid storing unnecessary sensitive Note content. |
| notification_deliveries | id, notification_id, channel, subscription_id, status, attempts, sent_at, error_code, idempotency_key | Unique idempotency key per logical delivery. |
| note_attachments | id, note_id, uploaded_by, storage_key, filename, mime_type, size_bytes | Use object storage; authorize every download. |


## 5. Custom property value storage options

Two viable approaches exist. A typed-value table with separate value columns improves filtering and indexing for common scalar types. A JSONB value column is simpler and flexible but may require expression indexes and stricter application validation. A hybrid approach is recommended: canonical JSON representation plus typed projections for frequently queried types.

## 6. Relationship cardinality


| Relationship | Cardinality | Rule |
| --- | --- | --- |
| User → Notes | 1 to many | Every Note has one owner. |
| Note → Properties | 1 to many | A Note may have zero or many custom properties. |
| Property → Values | 1 to 1 current value, 1 to many history | One current value in note_property_values; every prior value kept in note_property_value_history. |
| Property → Integrations | 1 to many | A property may connect to multiple supported features. |
| Note → Schedules | 1 to many | Decided: a Note may have multiple independent schedules, included in MVP. |
| Schedule → Recurrence | 1 to 0/1 | A schedule may be non-recurring or recurring. |
| Reminder → Recipients | 1 to many | Each recipient has independent enablement/preferences. |
| Note ↔ User via Shares | many to many | Access is granted by role. |
| User → Push Subscriptions | 1 to many | A user can register multiple devices. |


## 7. Constraints and indexes

- Foreign keys must enforce ownership and cascade/restrict behavior intentionally.
- Unique constraint on (note_id, property_slug) if slugs are unique within a Note.
- Unique constraint on (note_id, user_id) for shares.
- Index schedules by start/end range and enabled state.
- Index reminders by due trigger time and processing status.
- Index property type/value projections for supported filter operations.
- Use unique idempotency keys for notification delivery.
- Soft-delete behavior must be consistent across Notes and dependent records.

## 8. Data lifecycle and migration rules

- Changing a property name should not change its stable identifier.
- Changing a property type requires compatibility validation and possibly a migration preview.
- Deleting a property must warn about values, integrations, view configurations and export behavior.
- Deleting a Note should disable pending reminders and revoke access; retention policy should be defined.
- Removing a share must immediately revoke future access, including attachment and export URLs where feasible.
- Recurring schedule edits must update future occurrences and reminder instances without duplicating already-delivered notifications.

## 9. Open modeling decisions

### Resolved (4 November 2026)

- Property values need full change history — note_property_value_history added (Section 3–4).
- One Note can have multiple schedules in MVP.
- Reminders can exist without schedules (fixed trigger time), included in MVP.

### Still open

- Whether Relation supports only Note-to-Note initially or also Users/other entities.
- How property definitions are versioned when shared Note editors change the schema.
- Whether attachment properties are distinct from Note-level attachments. Decided 4 November 2026: yes — Attachment is included as one of the ten MVP custom property types (Section 4), distinct from `note_attachments` (Note-level files).
- Relation property target scope. Decided 4 November 2026: Relation can target another Note **or** a User, not Note-to-Note only.
- ~~Ownership rule for `reminders`~~ — resolved, see Section 4 and ADR-0002.