-- ============================================================================
-- Storage bucket for dress listing photos.
--
-- Why a new bucket rather than the `listing-images` one in 001: that bucket
-- belongs to the raw-SQL `listings`/`profiles` schema, which the app does not
-- use. The live dress flow is NestJS + Prisma against the `Dress`/`DressImage`
-- tables, so its photos get their own bucket keyed by Dress.id.
--
-- Folder convention:  dress-images/{dressId}/{uuid}.{ext}
-- Uploads go through the backend (POST /dresses/images) using the service-role
-- key, which bypasses RLS — so the insert policy below is a backstop for any
-- future direct-from-browser upload, not the primary gate.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dress-images',
  'dress-images',
  true,                                            -- public read for viewing
  10485760,                                        -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- Policies. Dropped first so this file is safe to re-run.
-- ----------------------------------------------------------------------------
drop policy if exists "dress_images_public_read"    on storage.objects;
drop policy if exists "dress_images_authed_insert"  on storage.objects;
drop policy if exists "dress_images_authed_update"  on storage.objects;
drop policy if exists "dress_images_authed_delete"  on storage.objects;

-- Public read: anyone can view a listing photo, signed in or not.
create policy "dress_images_public_read"
  on storage.objects for select
  using (bucket_id = 'dress-images');

-- Authenticated write. The backend's service-role key bypasses this entirely;
-- it constrains browser-side uploads if we ever add them.
create policy "dress_images_authed_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'dress-images');

create policy "dress_images_authed_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'dress-images')
  with check (bucket_id = 'dress-images');

create policy "dress_images_authed_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'dress-images');
