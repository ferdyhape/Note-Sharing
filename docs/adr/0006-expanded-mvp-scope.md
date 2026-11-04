# ADR-0006: Expanded MVP scope

Status: Accepted
Date: 2026-11-04

## Context

The original MVP recommendation deferred recurring schedules, limited the custom property type set, and pushed independent (schedule-less) reminders and property-based filtering to P1/P2, in order to keep the first release as small as possible.

## Decision

Recurring schedules, all ten custom property types (Text, Number, Boolean, Select, Multi-select, Date/Time/DateTime, URL/Email, Currency, Relation, Attachment), independent fixed-time reminders, and property-based filtering are pulled forward into MVP (P0).

## Consequences

- This is a deliberately wider MVP than a minimal vertical slice. It increases implementation and testing surface before the first usable release: more timezone/DST edge cases, more reminder trigger modes to make idempotent, broader property-type validation.
- Tracked explicitly as a risk in `06_Development_Roadmap` §6 ("Scope expansion"), with the mitigation of building thin vertical slices per capability inside Phases 2–4 rather than polishing any one capability early.
- Phase 2 (Dynamic properties) and Phase 3 (Scheduling & Calendar) absorb most of the added scope; Phase 6 keeps only the genuinely advanced refinements (recurrence exceptions, board/gallery, formula/rollup, analytics).

## References

01_PRD §13, §14 · 06_Development_Roadmap §1, §2, §6
