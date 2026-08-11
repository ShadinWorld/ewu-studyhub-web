-- ============================================================================
-- EWU StudyHub — Initial Database Schema
-- Postgres (Supabase). Normalized, RLS-ready, multi-university from day one.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm"; -- fast fuzzy text search

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('guest', 'student', 'verified_student', 'seller', 'admin', 'super_admin');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type file_visibility as enum ('draft', 'published', 'archived', 'rejected');
create type file_pricing_type as enum ('free', 'paid');
create type file_kind as enum ('pdf', 'ppt', 'docx', 'zip', 'image', 'other');
create type resource_category as enum (
  'notes', 'quiz_questions', 'mid_questions', 'final_questions',
  'assignment', 'lab_report', 'project', 'presentation_slide', 'research_report'
);
create type purchase_status as enum ('pending', 'completed', 'refunded', 'failed');
create type payout_status as enum ('pending', 'processing', 'completed', 'failed');
create type transaction_type as enum ('purchase', 'commission', 'payout', 'refund', 'wallet_topup');
create type report_reason as enum ('wrong_course', 'fake_file', 'duplicate', 'blank_pdf', 'copyright', 'spam', 'other');
create type report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
create type notification_type as enum (
  'upload_approved', 'upload_rejected', 'purchase_completed', 'payout_completed',
  'review_received', 'new_follower', 'trending_file', 'report_update'
);

-- ----------------------------------------------------------------------------
-- CORE: universities / departments / courses / teachers  (multi-university ready)
-- ----------------------------------------------------------------------------
create table universities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  short_name text not null unique,        -- e.g. 'EWU'
  domain text[] not null,                 -- allowed email domains for verification
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default uuid_generate_v4(),
  university_id uuid not null references universities(id) on delete cascade,
  name text not null,
  short_name text not null,               -- e.g. 'CSE'
  created_at timestamptz not null default now(),
  unique (university_id, short_name)
);

create table courses (
  id uuid primary key default uuid_generate_v4(),
  department_id uuid not null references departments(id) on delete cascade,
  course_code text not null,              -- e.g. 'CSE303'
  course_name text not null,
  created_at timestamptz not null default now(),
  unique (department_id, course_code)
);

create table teachers (
  id uuid primary key default uuid_generate_v4(),
  university_id uuid not null references universities(id) on delete cascade,
  full_name text not null,
  short_code text,                        -- e.g. initials used on course pages
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- USERS  (extends Supabase auth.users 1:1)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid references universities(id),
  department_id uuid references departments(id),
  full_name text not null,
  username text unique not null,
  avatar_url text,
  bio text,
  role user_role not null default 'student',
  semester text,
  batch text,
  student_id text,                        -- university roll/ID number
  university_email text,                  -- separate from auth email; verified via OTP
  university_email_verified boolean not null default false,
  student_id_verification_status verification_status not null default 'unverified',
  student_id_document_url text,           -- uploaded ID card image (private bucket)
  is_seller boolean not null default false,
  seller_bio text,
  wallet_balance_cents bigint not null default 0, -- cached balance; source of truth = wallet_transactions
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_university on profiles(university_id);
create index idx_profiles_role on profiles(role);

create table followers (
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- ----------------------------------------------------------------------------
-- TAGS / CATEGORIES (many-to-many)
-- ----------------------------------------------------------------------------
create table tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  slug text not null unique
);

-- ----------------------------------------------------------------------------
-- FILES (the core resource entity)
-- ----------------------------------------------------------------------------
create table files (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references profiles(id) on delete cascade,
  university_id uuid not null references universities(id),
  department_id uuid references departments(id),
  course_id uuid references courses(id),
  teacher_id uuid references teachers(id),

  title text not null,
  description text,
  category resource_category not null,
  file_kind file_kind not null,
  language text not null default 'bn',    -- 'bn' | 'en' | ...
  year integer,

  pricing_type file_pricing_type not null default 'free',
  price_cents integer not null default 0 check (price_cents >= 0),

  storage_path text not null,             -- private bucket path, original file
  preview_storage_path text,              -- public/blurred preview (sample pages / watermark)
  thumbnail_url text,
  file_size_bytes bigint,
  page_count integer,

  file_hash text,                         -- sha256 for duplicate detection
  ai_summary text,
  ai_keywords text[],
  ai_difficulty text,                     -- 'easy' | 'medium' | 'hard'
  ai_reading_time_minutes integer,

  visibility file_visibility not null default 'draft',
  rejection_reason text,

  views_count integer not null default 0,
  downloads_count integer not null default 0,
  average_rating numeric(2,1) not null default 0,
  reviews_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index idx_files_course on files(course_id);
create index idx_files_department on files(department_id);
create index idx_files_visibility on files(visibility);
create index idx_files_seller on files(seller_id);
create index idx_files_hash on files(file_hash);
create index idx_files_search on files using gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,''))
);
create index idx_files_title_trgm on files using gin (title gin_trgm_ops);

create table file_tags (
  file_id uuid not null references files(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (file_id, tag_id)
);

create table file_images (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid not null references files(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);

-- Bundles ("CSE303 Complete Pack")
create table bundles (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references profiles(id) on delete cascade,
  course_id uuid references courses(id),
  title text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  discount_percent numeric(4,1) not null default 0,
  visibility file_visibility not null default 'draft',
  created_at timestamptz not null default now()
);

create table bundle_files (
  bundle_id uuid not null references bundles(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  primary key (bundle_id, file_id)
);

-- ----------------------------------------------------------------------------
-- COMMERCE: purchases, wallet, transactions, payouts
-- ----------------------------------------------------------------------------
create table purchases (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references profiles(id) on delete cascade,
  file_id uuid references files(id) on delete set null,
  bundle_id uuid references bundles(id) on delete set null,
  amount_cents integer not null,
  commission_cents integer not null,      -- platform 20%
  seller_earning_cents integer not null,  -- seller 80%
  status purchase_status not null default 'pending',
  payment_method text,                    -- 'bkash' | 'nagad' | 'rocket' | 'card' | 'wallet'
  payment_reference text,                 -- gateway transaction id
  invoice_number text unique,
  created_at timestamptz not null default now(),
  check (file_id is not null or bundle_id is not null)
);
create index idx_purchases_buyer on purchases(buyer_id);
create index idx_purchases_file on purchases(file_id);

create table wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type transaction_type not null,
  amount_cents integer not null,          -- positive = credit, negative = debit
  related_purchase_id uuid references purchases(id),
  description text,
  created_at timestamptz not null default now()
);
create index idx_wallet_tx_profile on wallet_transactions(profile_id);

create table payouts (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status payout_status not null default 'pending',
  payment_method text,                    -- 'bkash' | 'nagad' | 'bank'
  payment_account_number text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Downloaded PDF watermark log (for traceability of leaks)
create table download_watermarks (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  watermark_text text not null,           -- "Name | ID | Date | TxnID"
  invisible_token text,                   -- steganographic / metadata token if applied
  downloaded_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- REVIEWS
-- ----------------------------------------------------------------------------
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid not null references files(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  purchase_id uuid references purchases(id), -- required for paid files -> verified purchase badge
  rating smallint not null check (rating between 1 and 5),
  comment text,
  helpful_votes integer not null default 0,
  created_at timestamptz not null default now(),
  unique (file_id, reviewer_id)
);

create table review_votes (
  review_id uuid not null references reviews(id) on delete cascade,
  voter_id uuid not null references profiles(id) on delete cascade,
  primary key (review_id, voter_id)
);

-- ----------------------------------------------------------------------------
-- REPORTS / TRUST / MODERATION
-- ----------------------------------------------------------------------------
create table reports (
  id uuid primary key default uuid_generate_v4(),
  file_id uuid not null references files(id) on delete cascade,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason report_reason not null,
  details text,
  status report_status not null default 'open',
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table badges (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,       -- 'verified_student','verified_seller','top_seller', etc.
  description text
);

create table profile_badges (
  profile_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,             -- 'file.approve', 'user.ban', etc.
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- BUYER FEATURES: wishlist, bookmarks, history, notifications
-- ----------------------------------------------------------------------------
create table wishlists (
  profile_id uuid not null references profiles(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, file_id)
);

create table recently_viewed (
  profile_id uuid not null references profiles(id) on delete cascade,
  file_id uuid not null references files(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (profile_id, file_id)
);

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_profile on notifications(profile_id, is_read);

-- ----------------------------------------------------------------------------
-- ANALYTICS (daily rollups; keep raw events lightweight)
-- ----------------------------------------------------------------------------
create table file_daily_stats (
  file_id uuid not null references files(id) on delete cascade,
  date date not null,
  views integer not null default 0,
  downloads integer not null default 0,
  sales integer not null default 0,
  revenue_cents integer not null default 0,
  primary key (file_id, date)
);

create table platform_daily_stats (
  date date primary key,
  new_users integer not null default 0,
  active_users integer not null default 0,
  total_sales integer not null default 0,
  total_revenue_cents integer not null default 0,
  total_commission_cents integer not null default 0
);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger trg_files_updated_at before update on files
  for each row execute function set_updated_at();
