# ADR-0010: DST policy for recurring schedules

Status: Accepted
Date: 2026-11-04

## Context

Recurring schedules preserve a local wall-clock time in an IANA timezone. At daylight-saving transitions, some local times do not exist and others occur twice. The system needs deterministic behavior for calendar expansion and reminder calculation.

## Decision

- Skip an occurrence whose local time falls in a daylight-saving gap. A skipped occurrence does not consume the RRULE `COUNT`.
- When a local time occurs twice during a daylight-saving overlap, choose the earlier instant.
- Keep the requested wall-clock time for all unambiguous occurrences.

## Consequences

- Occurrence expansion must resolve each RRULE wall time against the schedule's IANA timezone rather than relying on the server's local timezone.
- Tests must cover gap, overlap and ordinary local times, including count behavior when a gap is skipped.
- The occurrence key for persisted exceptions identifies the original scheduled occurrence; skipped gap times do not produce an occurrence to override.

## References

01_PRD §9 · 03_Technical_Architecture §4 · ADR-0005
