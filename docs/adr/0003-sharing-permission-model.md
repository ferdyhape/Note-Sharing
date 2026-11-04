# ADR-0003: Sharing and permission model

Status: Accepted
Date: 2026-11-04

## Context

The PRD left the Editor role's exact permission boundary unresolved (marked with `*` pending finalization), and did not specify whether a reminder recipient must already have access to the Note being shared.

## Decision

- Three roles: Owner, Editor, Viewer.
- Editor can edit a shared Note's content, custom properties, schedules and reminders.
- Editor cannot manage sharing (invite/revoke) or delete the Note — these remain Owner-only.
- Viewer is read-only on all Note data.
- A user can only be added as a Reminder recipient if they already hold Note access (Viewer or Editor) granted via sharing. Recipients cannot be added independently of the Note's share list.

## Consequences

- Authorization checks on property/schedule/reminder mutation endpoints must allow both Owner and Editor, not Owner-only.
- The reminder recipient picker UI is scoped to the Note's existing share list — it is not a free-form user search.
- `note_shares` is the single source of truth for "who can be a reminder recipient for this Note."

## References

01_PRD §10 · 02_Product_Architecture §8 · 05_UX_Interaction_Specification §7, §8
