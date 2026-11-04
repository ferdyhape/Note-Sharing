# Architecture Decision Records

Each file here records one significant decision: the context that forced it, what was decided, and the consequences. The PRD and Architecture docs describe *what* the product does; these records explain *why* and *when* a specific direction was chosen, so a later reader does not have to reconstruct the reasoning from chat history.

| ADR | Title |
| --- | --- |
| [0001](0001-note-centric-no-mandatory-collection.md) | Note-centric model, no mandatory Collection |
| [0002](0002-schedule-reminder-notification-separation.md) | Schedule, Reminder and Notification as independent domains |
| [0003](0003-sharing-permission-model.md) | Sharing and permission model |
| [0004](0004-property-value-history.md) | Custom property values retain change history |
| [0005](0005-timezone-handling.md) | Explicit timezone required; default Asia/Jakarta |
| [0006](0006-expanded-mvp-scope.md) | Expanded MVP scope |
| [0007](0007-technology-stack.md) | Technology stack — serverless Next.js |
| [0008](0008-non-real-time-shared-editing.md) | Shared Note editing is not real-time |
| [0009](0009-auth-strategy.md) | Auth strategy — email+password and Google OAuth |

## Writing a new ADR

Add a new file `000N-short-title.md` using this template:

```markdown
# ADR-000N: Title

Status: Accepted | Superseded by ADR-000X | Deprecated
Date: YYYY-MM-DD

## Context
What forced this decision — the constraint, conflict or open question.

## Decision
What was decided, stated plainly.

## Consequences
What this implies for implementation, and any trade-off accepted.

## References
Related PRD/Architecture sections, other ADRs.
```

Write one when a decision is hard to reverse, affects more than one module, or someone could reasonably ask "why did we do it this way" months later. Do not write one for routine implementation details already covered by the coding standard.
