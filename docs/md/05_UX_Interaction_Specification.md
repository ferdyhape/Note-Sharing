# UX & Interaction Specification
Primary navigation, editor behavior and key workflows
Private project documentation • Draft v0.1 • 4 November 2026

## 1. UX principles

- Writing first: creating a Note should not require configuring properties or schedules.
- Optionality: extensions are discoverable but never mandatory.
- Progressive disclosure: advanced configuration stays behind clear settings panels.
- Consistency: property types render consistently in editor, table, export and filters.
- Transparency: users understand when a property is connected to Calendar or Reminder.
- User control: sharing, recipients and push permission are explicit.

## 2. Proposed primary navigation


| Navigation item | Purpose |
| --- | --- |
| Dashboard | Recent Notes, today's schedule, upcoming reminders and quick create. |
| All Notes | Browse, search, filter and sort Notes. |
| Calendar | Month, week, day and agenda views of scheduled Notes. |
| Reminders | Upcoming, completed, disabled and failed reminder states. |
| Shared with me | Notes shared by other users. |
| Archive | Archived Notes. |
| Settings | Account, timezone, push devices, notification preferences and appearance. |


## 3. Note editor layout

- Title and rich content occupy the primary editing canvas.
- Custom Properties appear in a distinct metadata area, collapsible where useful.
- Schedule, Reminder, Sharing, Tags and Attachments are optional panels/actions.
- Autosave state is visible but non-intrusive.
- A Note with no properties or extensions remains a complete valid Note.
- The editor should support keyboard-first writing and common formatting shortcuts.

## 4. Custom property creation flow

- User chooses Add property.
- User enters a property name and selects a type.
- The UI reveals type-specific input configuration and validation.
- The UI previews the input control.
- The system may recommend compatible integrations.
- User explicitly enables an integration and configures its behavior.
- Property is saved and rendered in the Note metadata area.

## 5. Property editing and deletion

- Users can rename and reorder properties without changing the stable property ID.
- Users can edit options and validation rules.
- Changing type triggers a compatibility check and preview of affected values.
- Deleting a property displays its value count and connected integrations before confirmation.
- If a property feeds Calendar/Reminder, the UI explains what will happen to the linked records.

## 6. Calendar interactions


| Interaction | Expected behavior |
| --- | --- |
| Open calendar | Show authorized schedule occurrences for the selected range. |
| Click event | Open the related Note and show schedule details. |
| Create from date | Offer to create a Note with a schedule prefilled for that date. |
| Move event | Update schedule if user has permission; confirm recurring scope where needed. |
| Change view | Switch month/week/day/agenda without changing source data. |
| Property-sourced date | Show that event is linked to a property; editing behavior follows configured source-of-truth policy. |


## 7. Reminder and notification UX

- Reminder setup is separate from browser push permission.
- Users can choose reminder timing and recipients where sharing applies.
- Push opt-in is requested contextually, not on first page load without explanation.
- Settings show registered devices and allow revocation.
- In-app notifications remain available when push is disabled.
- Shared Note recipients are not automatically notified unless selected.

## 8. Sharing UX

- Default Note visibility is private.
- Owner shares with a user and selects Viewer or Editor.
- Owner can change or revoke access.
- Editor actions should be clearly distinguished from owner-only controls.
- Reminder recipient selection is independent from Note sharing.

## 9. Table and visualization UX

- Users select which Notes to include in a multi-note table.
- The table builds columns from the union of selected Notes' custom properties and selected system fields.
- Missing values display as blank or an em dash, not as errors.
- Users can choose visible columns, order, sort and filter.
- Board grouping is offered only for compatible property types.
- Calendar view uses schedule data or explicitly configured date integrations.

## 10. Export UX

- Export action offers current Note, selected Notes or current filtered result.
- User chooses format and optional fields.
- The UI previews the number of Notes and columns where practical.
- Explain that XLSX/CSV cannot preserve rich editor layout or embedded files fully.
- For structured backup, recommend JSON; for readable documents, recommend PDF/Markdown.

## 11. Accessibility and responsive behavior

- All core controls support keyboard focus and visible focus indicators.
- Color is never the only indicator of status.
- Forms provide labels, validation messages and accessible error states.
- Calendar offers an agenda/list alternative for screen readers and small screens.
- Editor and property panels adapt to mobile widths without hiding essential save or schedule controls.