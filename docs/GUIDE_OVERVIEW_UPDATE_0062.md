# Update 0062 — A–Z User Guide Overview

The User Guide now begins with a concise ecosystem overview so users do not need to read every detailed section to understand EWU StudyHub.

## User-facing behavior
- The guide opens with an `A–Z Quick Overview`.
- A dynamic `Your Access` card tells the user whether they are Student, Seller or Admin and explains their available scope.
- Capability cards summarize what the user can do and why it is useful.
- Main workflow cards explain the core journeys (Student, Seller and Admin where applicable).
- Detailed feature sections remain available below and are collapsed by default.
- Search still works across detailed content and the overview.

## Admin control
Overview items are managed from `/admin/help`.

Each item supports:
- role scope
- item type (`intro`, `capability`, `workflow`, `access`, `next_step`)
- title
- summary
- benefit
- optional action and safe internal route
- required access
- locked-state message and CTA
- draft/published/archived state
- display order

Hard delete is intentionally avoided. Archive/restore is used instead.

## Database
Migration: `0044_guide_overview_and_access_map.sql`
Table: `public.guide_overview_items`

## Security
- Public users do not receive admin-scoped overview rows through the guide API.
- Action routes are validated as internal paths at the Admin server action layer.
- Guide visibility is not an authorization mechanism; actual server-side route/action authorization remains authoritative.
