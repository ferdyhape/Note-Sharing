# ADR-0008: Shared Note editing is not real-time

Status: Accepted
Date: 2026-11-04

## Context

It was undecided whether multiple people editing the same shared Note at once needs live, multi-cursor collaboration (as in Google Docs), or whether standard persisted saves are sufficient for MVP.

## Decision

No real-time co-editing for MVP. Shared Note editing uses standard persisted saves.

## Consequences

- No need for operational-transform or CRDT infrastructure in the editor for MVP.
- Conflict handling can start simple (last-write-wins, or a basic version/updated-at check) rather than a full collaborative-editing engine.
- Revisit only if real usage shows frequent concurrent-editing conflicts on shared Notes.

## References

01_PRD §3, §14 · 02_Product_Architecture §8
