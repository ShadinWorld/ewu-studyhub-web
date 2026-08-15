-- EWU StudyHub FAQ management
create table if not exists faqs (
  id uuid primary key default uuid_generate_v4(),
  category text not null default 'General',
  question text not null check (char_length(trim(question)) >= 5),
  answer text not null check (char_length(trim(answer)) >= 5),
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_faqs_public_order
  on faqs(is_published, sort_order, created_at desc);

alter table faqs enable row level security;

drop policy if exists "public can read published faqs" on faqs;
create policy "public can read published faqs"
  on faqs for select
  using (is_published = true or is_admin());

drop policy if exists "admins manage faqs" on faqs;
create policy "admins manage faqs"
  on faqs for all
  using (is_admin())
  with check (is_admin());

create or replace function touch_faq_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_faqs_updated_at on faqs;
create trigger trg_faqs_updated_at
before update on faqs
for each row execute function touch_faq_updated_at();

insert into faqs (category, question, answer, sort_order, is_published)
select * from (values
  ('Account', 'How do I create an EWU StudyHub account?', 'Choose Continue with Google. Your Google name, email and profile photo are imported automatically. A phone number is required before you can continue using the platform.', 10, true),
  ('Account', 'What if I forget my password?', 'EWU StudyHub uses Google sign-in, so you do not need a separate StudyHub password. Use Continue with Google and select your Google account.', 20, true),
  ('Resources', 'How can I find resources for my course?', 'Search by course code such as CSE303, course name, resource title or department. You can also browse departments and courses.', 30, true),
  ('Buying', 'How do I buy a paid resource?', 'Open the resource, continue to checkout, submit the required payment information, and wait for admin approval when manual payment is used.', 40, true),
  ('Selling', 'How can I become a seller?', 'Complete your account, submit your EWU email and student ID card for verification, then apply to become a seller from your dashboard.', 50, true),
  ('Selling', 'How much commission does EWU StudyHub take?', 'The default platform commission is configured by the admin. The current marketplace policy is shown in the seller and resource information.', 60, true),
  ('EWU Verification', 'Why do I need EWU verification?', 'Verification helps keep the marketplace limited to genuine EWU students and allows the admin team to review your EWU email and student ID card.', 70, true),
  ('Support', 'How can I contact the EWU StudyHub admin?', 'Use the Help button to choose a support category and open WhatsApp with a pre-filled message containing useful account and page context.', 80, true)
) as seed(category, question, answer, sort_order, is_published)
where not exists (select 1 from faqs);
