-- EWU StudyHub — A-Z guide overview, role capability map and guided actions
-- Admin-controlled overview content for the single General User Guide.

create table if not exists public.guide_overview_items (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  role_scope text not null default 'general' check (role_scope in ('general','student','seller','admin')),
  kind text not null default 'capability' check (kind in ('intro','capability','workflow','access','next_step')),
  title text not null check (char_length(trim(title)) >= 2),
  summary text not null check (char_length(trim(summary)) >= 5),
  benefit text,
  action_label text,
  action_href text,
  required_access text not null default 'none' check (required_access in ('none','verified_student','seller','admin')),
  locked_message text,
  locked_action_label text,
  locked_action_href text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guide_overview_public_order
  on public.guide_overview_items(status, role_scope, kind, sort_order, created_at desc);

alter table public.guide_overview_items enable row level security;

drop policy if exists "public can read published guide overview" on public.guide_overview_items;
create policy "public can read published guide overview"
  on public.guide_overview_items for select
  using ((status = 'published' and role_scope <> 'admin') or is_admin());

drop policy if exists "admins manage guide overview" on public.guide_overview_items;
create policy "admins manage guide overview"
  on public.guide_overview_items for all
  using (is_admin())
  with check (is_admin());

create or replace function public.set_guide_overview_item_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_guide_overview_item_updated_at on public.guide_overview_items;
create trigger trg_guide_overview_item_updated_at
before update on public.guide_overview_items
for each row execute function public.set_guide_overview_item_updated_at();

insert into public.guide_overview_items
(slug, role_scope, kind, title, summary, benefit, action_label, action_href, required_access, locked_message, locked_action_label, locked_action_href, status, sort_order)
values
('overview-intro','general','intro','EWU StudyHub এক নজরে','EWU StudyHub হলো একটি academic resource marketplace যেখানে Studentরা Resource খুঁজতে, Preview করতে, Purchase করতে, Download করতে, Save করতে এবং প্রয়োজন হলে Resource Request করতে পারে। Sellerরা নিজের academic Resource upload করে earning করতে পারে; Admin পুরো platform-এর moderation, payment, payout, storage ও support workflow পরিচালনা করে।','আপনি পুরো website-এ কী কী করতে পারবেন এবং কোন feature আপনার জন্য available তা দ্রুত বুঝে নিতে পারবেন।',null,null,'none',null,null,null,'published',10),
('overview-student-discover','student','capability','Resource খুঁজে ব্যবহার করা','Search, Course, Department এবং Filter ব্যবহার করে প্রয়োজনীয় Resource খুঁজে দেখুন এবং Preview করে suitability যাচাই করুন।','সময় বাঁচে এবং প্রয়োজনের সাথে মিলছে এমন Resource বেছে নেওয়া সহজ হয়।','Search করুন','/search','none',null,null,null,'published',20),
('overview-student-purchase','student','capability','Purchase ও Download','Paid Resource-এর price breakdown দেখে Purchase করুন এবং approval হলে protected View/Download access ব্যবহার করুন।','কেনার আগে খরচ পরিষ্কার থাকে এবং approved purchase পরে আবার খুঁজে পাওয়া সহজ হয়।','My Purchases','/purchases','verified_student','এই feature ব্যবহার করতে verified Student account প্রয়োজন হতে পারে।','Complete Profile','/account','published',30),
('overview-student-save-request','student','capability','Save ও Resource Request','ভালো Resource Save করে পরে ফিরে আসুন এবং প্রয়োজনীয় Resource না পেলে Request submit করুন।','আপনার প্রয়োজন track থাকে এবং marketplace-এ নতুন academic Resource-এর demand জানানো যায়।','Open Requests','/requests','verified_student','Resource Request ব্যবহার করতে verified Student account প্রয়োজন হতে পারে।','Open Account','/account','published',40),
('overview-student-notifications','student','capability','Notifications ও Support','Purchase, approval, request এবং অন্যান্য important status Notifications-এ দেখুন; সমস্যায় Support ব্যবহার করুন।','Pending কাজ ও গুরুত্বপূর্ণ update মিস হওয়ার সম্ভাবনা কমে।','Open Notifications','/notifications','none',null,null,null,'published',50),
('overview-student-flow','student','workflow','Student workflow','সাধারণ Student journey হলো: Search → Preview → Purchase → Approval → View/Download।','পুরো system-এর মূল flow এক নজরে বুঝতে পারবেন।',null,null,'none',null,null,null,'published',60),
('overview-seller-access','seller','access','Seller features','Seller হলে Student features-এর পাশাপাশি Resource Upload, Review status, Sales, Earnings, Wallet এবং Payout workflow ব্যবহার করা যায়।','নিজের academic Resource share করে earning করার সুযোগ পাওয়া যায় এবং seller activity track করা সহজ হয়।','Become a Seller','/dashboard/become-seller','seller','এই feature ব্যবহার করতে আগে Seller account/verification প্রয়োজন।','Become a Seller','/dashboard/become-seller','published',70),
('overview-seller-upload','seller','capability','Resource Upload','সঠিক file, course, title, description ও pricing information দিয়ে Resource Submit for review করুন। Submit-এর আগে selected file Preview করে verify করুন।','ভুল বা incomplete Resource submit হওয়ার risk কমে এবং buyer-এর জন্য তথ্য পরিষ্কার থাকে।','Upload Resource','/dashboard/upload','seller','Resource upload করতে আগে Seller হওয়া প্রয়োজন।','Become a Seller','/dashboard/become-seller','published',80),
('overview-seller-finance','seller','capability','Sales, Earnings ও Payout','Approved sale থেকে seller earning, wallet এবং payout status track করুন।','আপনার earning flow কোথায় আছে তা বুঝতে এবং payment setup ঠিক রাখতে সুবিধা হয়।','Open Sales','/dashboard/sales','seller','Sales ও earning দেখতে আগে Seller access প্রয়োজন।','Become a Seller','/dashboard/become-seller','published',90),
('overview-seller-flow','seller','workflow','Seller workflow','সাধারণ Seller journey হলো: Become Seller → Verification → Upload → Review → Publish → Sale → Earning → Payout।','একজন Seller হিসেবে পুরো lifecycle বুঝতে পারবেন।',null,null,'seller','Seller workflow দেখতে আগে Seller হতে হবে।','Become a Seller','/dashboard/become-seller','published',100),
('overview-admin-operations','admin','capability','Admin operations','Admin user Users, Sellers, Resources, Payments, Payouts, Reports, Notifications, Storage ও system settings পরিচালনা করতে পারে।','Platform-এর গুরুত্বপূর্ণ operational workflow এক জায়গা থেকে safely manage করা যায়।','Open Admin Panel','/admin','admin','এই section কেবল Admin account-এর জন্য।',null,null,'published',110),
('overview-admin-finance','admin','capability','Financial control','Purchase, platform fee, seller earning এবং payout chain authoritative records দিয়ে যাচাই করুন।','Duplicate বা incorrect financial action-এর risk কমে এবং buyer/seller records consistent থাকে।','Open Payments','/admin/payments','admin','Financial operations কেবল Admin account-এর জন্য।',null,null,'published',120),
('overview-admin-storage','admin','capability','Storage Health','Original, Preview, Thumbnail, growth, reclaimable orphan এবং preview traffic monitor করুন।','Storage pressure আগেভাগে বোঝা যায় এবং unnecessary object cleanup করা যায়।','Open Storage','/admin/storage','admin','Storage management কেবল Admin account-এর জন্য।',null,null,'published',130),
('overview-admin-flow','admin','workflow','Admin workflow','সাধারণ Admin journey হলো: Needs Attention → Review source record → Apply action → Verify result → Audit history।','Operational action নেওয়ার আগে source record ও result দুটোই যাচাই করার habit তৈরি হয়।',null,null,'admin','এই section কেবল Admin account-এর জন্য।',null,null,'published',140)
on conflict (slug) do update set
  role_scope=excluded.role_scope,
  kind=excluded.kind,
  title=excluded.title,
  summary=excluded.summary,
  benefit=excluded.benefit,
  action_label=excluded.action_label,
  action_href=excluded.action_href,
  required_access=excluded.required_access,
  locked_message=excluded.locked_message,
  locked_action_label=excluded.locked_action_label,
  locked_action_href=excluded.locked_action_href,
  status=excluded.status,
  sort_order=excluded.sort_order;
