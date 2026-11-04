# ADR-0005: Explicit timezone required; default Asia/Jakarta

Status: Accepted
Date: 2026-11-04

## Context

"Floating" (timezone-less) schedules — e.g. a wall-clock time with no associated timezone — create ambiguity for recurrence expansion and reminder trigger calculation, especially across daylight-saving transitions and when a user changes device/location.

## Decision

- Floating schedules are not supported.
- Every schedule stores an explicit IANA timezone identifier.
- When a user has not set a personal timezone, the system defaults to `Asia/Jakarta`.

## Consequences

- `note_schedules.timezone` is a required column, never null.
- Account settings must expose a timezone override so users outside WIB are not forced onto the default.
- The recurrence engine always resolves wall-clock rules against a concrete timezone, removing a class of ambiguous-date bugs (e.g. "9 AM" meaning different instants depending on viewer).

## References

01_PRD §9, §14 · 03_Technical_Architecture §4
