-- EWU StudyHub: remove deprecated prerequisite and grade calculator features.
-- Grade Calculator was application-only, so no database object is required.
-- Prerequisite Checker is fully removed, including its backing table.

drop table if exists public.course_prerequisites;
