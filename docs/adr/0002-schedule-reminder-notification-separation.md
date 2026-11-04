# ADR-0002: Schedule, Reminder and Notification as independent domains

Status: Accepted
Date: 2026-11-04

## Context

Initial brainstorming treated "a Note with a time attached" as one concept. This conflated three different questions: when something happens (Schedule), when and who to notify about it (Reminder), and how that notification is actually delivered (Notification). Keeping them merged would prevent valid cases such as a calendar entry with no reminder, or a standalone reminder with no calendar entry.

## Decision

- Schedule, Reminder and Notification are modeled as separate domain entities (`note_schedules`, `reminders`, `notification_deliveries`).
- A Note may have multiple independent schedules; each is created, edited and removed separately (no single-schedule-per-Note constraint).
- A Reminder may exist independently of any Schedule, using a fixed trigger time (`trigger_mode = fixed`), with no `note_schedules` row required.

## Consequences

- `FR-008` allows "no schedule, or one or more independent schedules" rather than a single schedule per Note.
- The `reminders` table carries both `note_id` and `schedule_id`. **Resolved 2026-11-04:** `note_id` is always set (a reminder always belongs to a Note), and `schedule_id` is set only when the reminder is relative to a specific schedule. This keeps "all reminders for Note X" a direct query, with no join required, regardless of trigger mode.
- Calendar rendering must not assume every Note has at most one time range.

## References

01_PRD §9, §14 · 02_Product_Architecture §2, §8 · 04_Data_Model_and_ERD §6, §9
