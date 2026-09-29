# Update 0054 — Student Tool Management Expansion

## Scope

Expanded the Admin Student Academic Tool system so the tool directory and the data inside data-backed tools are managed separately.

## Admin behavior

- `Student Academic Tool Manager` now exposes a `Manage` action for every catalog entry.
- Built-in catalog entries are still removable/re-enableable from the Student Tools directory.
- Academic Calendar / Final Exam documents can be added/replaced and permanently deleted from the stored academic-document list; deletion also removes the private Storage object.
- Deadline Tracker already supports adding/deleting deadline records and remains linked from the Student Tool Manager.
- Resource Request opens the existing admin request-management workflow.
- Prerequisite Checker now has a dedicated Admin manager to add/remove course prerequisite mappings.
- Grade Calculator has a dedicated Admin management page documenting that it is a browser-only calculation tool with no persistent academic data to add/delete; availability remains controlled by the Student Tool Manager.
- Existing custom Student Tool links remain removable/deletable from the catalog.

## Database

- Added migration `0054_expand_student_academic_tool_management.sql`.
- No new table or RLS model is required; the migration registers the existing Grade Calculator and Prerequisite Checker routes in `student_tool_catalog`.

## Security

- Academic document deletion is admin-only through the existing `requireAdmin()` guard and the Admin-protected storage bucket.
- Prerequisite add/delete actions are admin-only and use the existing `course_prerequisites` Admin RLS policy.
- All management actions use the existing `record_user_activity()` audit path where applicable.

## Validation

- Run `npm run verify` and `npm run production-audit`.
- Full TypeScript/build still requires the dependency-complete local environment.
