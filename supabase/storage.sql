-- =====================================================================
-- rndv.click  —  Storage bucket setup for user-uploaded avatars
-- Run after schema.sql.
-- =====================================================================

-- Create the public "avatars" bucket (5 MB cap, common image MIME types).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,                                  -- 5 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =====================================================================
-- RLS for storage.objects on the "avatars" bucket
-- =====================================================================

drop policy if exists "Avatars: public read"   on storage.objects;
drop policy if exists "Avatars: owner upload"  on storage.objects;
drop policy if exists "Avatars: owner update"  on storage.objects;
drop policy if exists "Avatars: owner delete"  on storage.objects;

-- Anyone can read avatars (they're shown on the public booking page eventually)
create policy "Avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can only write/replace/delete inside their own folder.
-- We use {user_id}/avatar.{ext} as the path convention.
create policy "Avatars: owner upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars: owner update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars: owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
