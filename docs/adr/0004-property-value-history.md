# ADR-0004: Custom property values retain change history

Status: Accepted
Date: 2026-11-04

## Context

`note_property_values` was originally modeled to hold only the current value. It was undecided whether prior values should be retrievable (e.g. for audit, undo, or reviewing what changed on a shared Note).

## Decision

Property values retain full change history. A new table, `note_property_value_history`, stores one row per superseded value, insert-only.

## Consequences

- Every write to `note_property_values` must also insert a row into `note_property_value_history` (application-level transaction or a database trigger).
- Storage grows proportional to edit frequency; a retention/pruning policy is **not yet decided** and should be revisited once real usage data exists.
- `FR-021` (new) makes this a Must-have requirement for MVP.

## References

01_PRD FR-021 · 04_Data_Model_and_ERD §3, §4, §6, §9
