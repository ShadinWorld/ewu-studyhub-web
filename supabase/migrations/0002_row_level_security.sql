-- ============================================================================
-- Row Level Security — deny by default, allow explicitly.
-- ============================================================================

alter table profiles enable row level security;
alter table files enable row level security;
alter table file_images enable row level security;
alter table file_tags enable row level security;
alter table purchases enable row level security;
alter table wallet_transactions enable row level security;
alter table payouts enable row level security;
alter table reviews enable row level security;
alter table review_votes enable row level security;
alter table reports enable row level security;
alter table wishlists enable row level security;
alter table recently_viewed enable row level security;
alter table notifications enable row level security;
alter table followers enable row level security;
alter table bundles enable row level security;
alter table bundle_files enable row level security;
alter table download_watermarks enable row level security;
alter table audit_logs enable row level security;

-- Helper: is the current user an admin/super_admin?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$ language sql security definer stable;

-- ---------------- profiles ----------------
create policy "profiles are publicly readable"
  on profiles for select using (true);

create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- ---------------- files ----------------
-- Anyone can see published files. Sellers see all their own (incl. drafts). Admins see all.
create policy "published files are public"
  on files for select using (
    visibility = 'published'
    or seller_id = auth.uid()
    or is_admin()
  );

create policy "sellers can insert own files"
  on files for insert with check (seller_id = auth.uid());

create policy "sellers can update own files"
  on files for update using (seller_id = auth.uid() or is_admin());

create policy "sellers can delete own draft files"
  on files for delete using (seller_id = auth.uid() and visibility = 'draft');

create policy "file_images follow parent file"
  on file_images for select using (
    exists (select 1 from files f where f.id = file_id and (f.visibility = 'published' or f.seller_id = auth.uid() or is_admin()))
  );

create policy "file_tags are public"
  on file_tags for select using (true);

-- ---------------- purchases ----------------
-- A buyer sees their own purchases; a seller sees purchases of their files; admins see all.
create policy "buyers see own purchases"
  on purchases for select using (
    buyer_id = auth.uid()
    or is_admin()
    or exists (select 1 from files f where f.id = purchases.file_id and f.seller_id = auth.uid())
  );

create policy "buyers create own purchases"
  on purchases for insert with check (buyer_id = auth.uid());

-- ---------------- wallet & payouts ----------------
create policy "users see own wallet transactions"
  on wallet_transactions for select using (profile_id = auth.uid() or is_admin());

create policy "users see own payouts"
  on payouts for select using (seller_id = auth.uid() or is_admin());

create policy "users request own payouts"
  on payouts for insert with check (seller_id = auth.uid());

-- ---------------- reviews ----------------
create policy "reviews are public"
  on reviews for select using (true);

create policy "verified buyers can review"
  on reviews for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from purchases p
      where p.file_id = reviews.file_id
        and p.buyer_id = auth.uid()
        and p.status = 'completed'
    )
  );

create policy "reviewers can update own review"
  on reviews for update using (reviewer_id = auth.uid());

create policy "review votes are public"
  on review_votes for select using (true);

create policy "users vote once"
  on review_votes for insert with check (voter_id = auth.uid());

-- ---------------- reports ----------------
create policy "reporters see own reports; admins see all"
  on reports for select using (reporter_id = auth.uid() or is_admin());

create policy "users can file reports"
  on reports for insert with check (reporter_id = auth.uid());

create policy "admins can update reports"
  on reports for update using (is_admin());

-- ---------------- wishlists / recently_viewed / notifications ----------------
create policy "users manage own wishlist"
  on wishlists for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "users manage own recently_viewed"
  on recently_viewed for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "users see own notifications"
  on notifications for select using (profile_id = auth.uid());

create policy "users update own notifications"
  on notifications for update using (profile_id = auth.uid());

-- ---------------- followers ----------------
create policy "followers are public"
  on followers for select using (true);

create policy "users manage own follows"
  on followers for insert with check (follower_id = auth.uid());

create policy "users remove own follows"
  on followers for delete using (follower_id = auth.uid());

-- ---------------- bundles ----------------
create policy "published bundles are public"
  on bundles for select using (visibility = 'published' or seller_id = auth.uid() or is_admin());

create policy "sellers manage own bundles"
  on bundles for insert with check (seller_id = auth.uid());

create policy "bundle_files follow parent bundle"
  on bundle_files for select using (
    exists (select 1 from bundles b where b.id = bundle_id and (b.visibility = 'published' or b.seller_id = auth.uid()))
  );

-- ---------------- watermarks & audit ----------------
create policy "buyers see own watermark record"
  on download_watermarks for select using (buyer_id = auth.uid() or is_admin());

create policy "admins see audit logs"
  on audit_logs for select using (is_admin());
