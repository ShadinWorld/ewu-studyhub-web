-- EWU StudyHub — Homepage Banner duration-based publishing
-- Lets admins publish immediately or schedule a start, then run a campaign
-- for a number of days without manually calculating an end date/time.

alter table public.announcements
  add column if not exists publish_mode text not null default 'exact_dates'
    check (publish_mode in ('exact_dates','duration')),
  add column if not exists duration_days integer
    check (duration_days is null or (duration_days between 1 and 365));

create index if not exists idx_announcements_publish_mode
  on public.announcements(publish_mode, duration_days);
