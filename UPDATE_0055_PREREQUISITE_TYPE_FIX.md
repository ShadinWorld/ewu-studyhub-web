# EWU StudyHub — Update 0055: Prerequisite Checker Type/Schema Restoration

## Problem
Update 0075 re-enabled the Student Prerequisite Checker and added its admin management page, but the current migration history still had the backing `public.course_prerequisites` table removed by migration `0022_remove_prerequisite_and_grade_calculator.sql`.

This caused TypeScript to infer `never[]`/`never` for Supabase queries in:
- `src/app/admin/academic-tools/prerequisites/actions.ts`
- `src/app/admin/academic-tools/prerequisites/page.tsx`

## Fix
- Added migration `0055_restore_prerequisite_checker_data.sql`.
- Recreated `public.course_prerequisites` with the original primary key, foreign keys, index, and RLS policies.
- Added `CoursePrerequisite` to `src/types/database.types.ts`.
- Registered `course_prerequisites` in `Database.public.Tables`.

## Compatibility
Historical migration `0022` is not modified. Migration `0055` restores only the table required by the currently active Prerequisite Checker feature.
