# ADR-0011: One-occurrence overrides for recurring schedules

Status: Accepted
Date: 2026-11-04

## Context

The PRD calls for editing one occurrence, this-and-following occurrences, or an entire recurring series. The current schema stores exceptions by `occurrenceKey` with an `overrideJson`, but did not define override fields or how a moved occurrence keeps its identity. Broad series edits also need conflict rules for already-skipped or overridden instances.

## Decision

- The first override workflow edits one generated occurrence only.
- `occurrenceKey` always remains the original generated start and is the stable identity for that exception, even when the displayed occurrence moves to a different date/time.
- An override may change the start/end values only within the schedule's existing type (`TIMED`, `ALL_DAY`, or `RANGE`). It does not change the recurrence rule or timezone.
- A skip and an override cannot coexist for the same occurrence. Replacing an existing exception requires an explicit remove before creating the other kind.
- “This and following” and whole-series edits remain future scope; they are not silently approximated by a single-occurrence edit.

## Consequences

- The Calendar occurrence expander must apply overrides to generated occurrences and include moved overrides when their new time falls inside a requested bounded window.
- Deleting an override restores the original generated occurrence.
- Tests must cover identity preservation, moved-in/moved-out overrides, schedule-type validation, and DST-resolved timed values.

## References

01_PRD §9 · 03_Technical_Architecture §4 · ADR-0002 · ADR-0005 · ADR-0010
