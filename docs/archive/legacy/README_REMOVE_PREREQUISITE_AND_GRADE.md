# EWU StudyHub — Feature Removal Update

Removed completely:
- Prerequisite Checker route and UI
- Grade Calculator route and UI
- Prerequisite and Grade Calculator cards from the Student Tools page
- Prerequisite and Grade Calculator cards from the homepage Student Tools row
- Admin prerequisite mapping UI and server actions
- `CoursePrerequisite` from `database.types.ts`
- `course_prerequisites` database table via migration `0022_remove_prerequisite_and_grade_calculator.sql`

Retained tools:
- Academic Calendar
- Final Exam Schedule
- Deadline Tracker
- Resource Request

Before deployment, run the new migration on Supabase if the `course_prerequisites` table currently exists.
