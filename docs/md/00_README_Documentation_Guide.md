# Documentation Package Guide
How to use and maintain this product documentation
Product name: **Notula** • Private project documentation • Draft v0.1 • 4 November 2026

## Package contents


| File | Use it for |
| --- | --- |
| 01_PRD.docx | Product scope, requirements, goals and open questions. |
| 02_Product_Architecture.docx | Product modules, domain boundaries and integration behavior. |
| 03_Technical_Architecture.docx | Logical system design, infrastructure and engineering risks. |
| 04_Data_Model_and_ERD.docx | Conceptual ERD, entities, fields and relationships. |
| 05_UX_Interaction_Specification.docx | User experience and interaction rules. |
| 06_Development_Roadmap.docx | Phases, priorities, acceptance criteria and test strategy. |
| CODING_STANDARDS.md | Repo-wide conventions: structure, naming, formatting, testing, commits. |
| adr/ | One file per significant decision — why, not just what. |
| CHECKLIST.md | Ordered, checkable build task list, grouped by roadmap phase. |
| WORKLOG.md | Dated narrative log of work actually done, newest first. |


## How to read the package

- Start with the PRD to validate what the product should do.
- Use Product Architecture to confirm boundaries between Notes, Properties, Schedule, Reminder and Notification.
- Use UX Specification to design screens and workflows.
- Use Data Model and Technical Architecture before committing to migrations or implementation.
- Use the Roadmap to turn the agreed scope into development tasks.
- Use CHECKLIST.md and WORKLOG.md during actual implementation: check items off as they're verified done, and add a dated entry to WORKLOG.md for each work session describing what was done and why. See 01_PRD.md §16.

## Important status note

This is a first-pass draft (v0.1), not a final implementation contract. It records the decisions established during brainstorming and marks unresolved areas as open. Review open questions before freezing the database schema or starting production implementation.

## Current agreed product decisions

- Note is the central, free-form document.
- No mandatory Collection model in the core product.
- Custom Properties are optional and dynamic per Note.
- Custom Property definitions, values and integrations are separate concepts.
- Property Integration uses a hybrid recommendation plus explicit user activation model.
- Schedule, Reminder and Notification are distinct capabilities.
- The product supports private and shared Notes.
- Push notifications are opt-in and device-specific.
- Calendar visualizes scheduled Notes and explicitly integrated date properties.
- The product should support useful visualization and export of heterogeneous Notes.
- A Note may have multiple independent schedules, each with recurring rules; included in MVP.
- All ten supported custom property types are included in MVP, with value change history.
- Reminders can exist without a Schedule (fixed trigger time); included in MVP.
- Editor can edit a shared Note's content, properties, schedules and reminders; cannot manage sharing or delete it.
- Reminder recipients must already hold Note access (Viewer/Editor) granted via sharing.
- Floating (timezone-less) schedules are not supported; default timezone is Asia/Jakarta.
- Shared Note editing is not real-time; standard persisted saves for MVP.
- Property-based filtering is included in MVP.
- Auth supports email+password and Google OAuth.
- Relation property can target another Note or a User, not Note-to-Note only.
- Attachment is one of the ten MVP custom property types, distinct from Note-level attachments.
- Technology stack: Next.js (TypeScript), Prisma, PostgreSQL via Neon, Redis/cron via Upstash, hosted on Vercel (see ADR-0007).