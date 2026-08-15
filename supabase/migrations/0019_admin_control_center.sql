-- EWU StudyHub Admin Control Center support indexes.
-- No destructive schema changes; safe to run after existing migrations.
create index if not exists idx_audit_logs_created_at_desc
  on public.audit_logs(created_at desc);

create index if not exists idx_profiles_role_verification
  on public.profiles(role, student_id_verification_status, created_at desc);

create index if not exists idx_purchases_bkash_status_submitted
  on public.purchases(payment_method, status, payment_submitted_at desc);

create index if not exists idx_files_visibility_created_at
  on public.files(visibility, created_at desc);
