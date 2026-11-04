# ADR-0001: Note-centric model, no mandatory Collection

Status: Accepted
Date: 2026-11-04

## Context

Early brainstorming considered a Notion-style Collection/database builder, where Notes would share a fixed set of columns. This conflicts with the goal of keeping ordinary note-taking frictionless: a Note should never be forced into a predefined schema before it can be created.

## Decision

- The Note is the primary, free-form content entity. It never requires a Collection.
- Custom Properties are optional, dynamic metadata defined per individual Note, not shared columns across a Collection.
- Property definitions and property values are modeled as separate concepts (definition vs. stored value).

## Consequences

- Schema must support per-Note property definitions (`note_properties`) rather than one fixed global schema.
- UI must treat the property panel as fully optional — a Note with zero properties remains valid and complete.
- A future Collection-like feature (if ever added) would be a separate, additive capability, not a retrofit of this model.

## References

01_PRD §2, §7 · 02_Product_Architecture §2, §8 · 04_Data_Model_and_ERD §1
