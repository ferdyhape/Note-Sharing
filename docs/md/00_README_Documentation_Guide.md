# Documentation Package Guide
How to use and maintain this product documentation
Private project documentation • Draft v0.1 • 4 November 2026

## Package contents


| File | Use it for |
| --- | --- |
| 01_PRD.docx | Product scope, requirements, goals and open questions. |
| 02_Product_Architecture.docx | Product modules, domain boundaries and integration behavior. |
| 03_Technical_Architecture.docx | Logical system design, infrastructure and engineering risks. |
| 04_Data_Model_and_ERD.docx | Conceptual ERD, entities, fields and relationships. |
| 05_UX_Interaction_Specification.docx | User experience and interaction rules. |
| 06_Development_Roadmap.docx | Phases, priorities, acceptance criteria and test strategy. |


## How to read the package

- Start with the PRD to validate what the product should do.
- Use Product Architecture to confirm boundaries between Notes, Properties, Schedule, Reminder and Notification.
- Use UX Specification to design screens and workflows.
- Use Data Model and Technical Architecture before committing to migrations or implementation.
- Use the Roadmap to turn the agreed scope into development tasks.

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