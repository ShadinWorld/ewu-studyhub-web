-- Adds a semester field to files (e.g. 'Spring', 'Summer', 'Fall', paired with the
-- existing `year` integer column) and speeds up the pending-seller-request lookup.

alter table files add column if not exists semester text;

create index if not exists idx_profiles_student_id_status
  on profiles(student_id_verification_status)
  where student_id_verification_status = 'pending';
