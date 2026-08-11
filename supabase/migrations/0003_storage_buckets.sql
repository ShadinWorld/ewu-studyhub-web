-- ============================================================================
-- Storage buckets
-- files-private     : original uploaded files (PDF/PPT/DOCX/ZIP) — never public
-- files-preview     : blurred/watermarked sample pages — public
-- thumbnails        : cover images — public
-- avatars           : profile photos — public
-- student-id-docs   : uploaded ID card images for verification — never public
-- ============================================================================

insert into storage.buckets (id, name, public) values
  ('files-private', 'files-private', false),
  ('files-preview', 'files-preview', true),
  ('thumbnails', 'thumbnails', true),
  ('avatars', 'avatars', true),
  ('student-id-docs', 'student-id-docs', false)
on conflict (id) do nothing;

-- files-private: only the owning seller and buyers with a completed purchase
-- (actual byte delivery happens through a signed URL generated server-side
-- in /api/files/[id]/download after verifying purchase — these policies are
-- a defense-in-depth backstop, not the primary access path)
create policy "seller reads own private files"
  on storage.objects for select
  using (bucket_id = 'files-private' and owner = auth.uid());

create policy "seller uploads own private files"
  on storage.objects for insert
  with check (bucket_id = 'files-private' and owner = auth.uid());

-- public buckets: readable by anyone, writable by owner only
create policy "public preview read"
  on storage.objects for select using (bucket_id = 'files-preview');
create policy "owner writes preview"
  on storage.objects for insert with check (bucket_id = 'files-preview' and owner = auth.uid());

create policy "public thumbnail read"
  on storage.objects for select using (bucket_id = 'thumbnails');
create policy "owner writes thumbnail"
  on storage.objects for insert with check (bucket_id = 'thumbnails' and owner = auth.uid());

create policy "public avatar read"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "owner writes avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and owner = auth.uid());

-- student-id-docs: private, only owner + admins (checked at app layer via service role)
create policy "owner reads own id doc"
  on storage.objects for select using (bucket_id = 'student-id-docs' and owner = auth.uid());
create policy "owner uploads own id doc"
  on storage.objects for insert with check (bucket_id = 'student-id-docs' and owner = auth.uid());
