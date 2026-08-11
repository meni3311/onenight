-- ============================================================================
-- onenight — Row Level Security policies
-- Run after 001_initial_schema.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Admin check helper.
-- SECURITY DEFINER so it can read profiles without tripping profiles' own RLS
-- (a plain subquery against profiles inside a profiles policy would recurse).
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer stable;

-- Lock down search_path for the definer function.
alter function public.is_admin() set search_path = public;

-- Enable RLS on every table.
alter table public.profiles              enable row level security;
alter table public.listings             enable row level security;
alter table public.listing_images       enable row level security;
alter table public.availability_requests enable row level security;
alter table public.favorites            enable row level security;
alter table public.reviews              enable row level security;
alter table public.notifications        enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
--   read: anyone (lister info shown on cards)
--   update: own profile, or admin (any)
-- ----------------------------------------------------------------------------
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ----------------------------------------------------------------------------
-- listings
--   read: approved listings to everyone; owner & admin see their own/all
--   insert: anyone (guest listings allowed)
--   update: owner or admin
--   delete: admin only
-- ----------------------------------------------------------------------------
create policy "listings_select_approved"
  on public.listings for select
  using (
    status = 'approved'
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "listings_insert_anyone"
  on public.listings for insert
  with check (true);

create policy "listings_update_owner_or_admin"
  on public.listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "listings_delete_admin"
  on public.listings for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- listing_images
--   read: anyone
--   insert/delete: owner of the parent listing, or admin
-- ----------------------------------------------------------------------------
create policy "listing_images_select_all"
  on public.listing_images for select
  using (true);

create policy "listing_images_insert_owner_or_admin"
  on public.listing_images for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "listing_images_delete_owner_or_admin"
  on public.listing_images for delete
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- availability_requests
--   read: renter (own), lister (requests on their listings), admin
--   insert: the renter themselves
--   update: lister (responds: status + lister_response_at + message), or admin
-- ----------------------------------------------------------------------------
create policy "availability_select_renter_lister_admin"
  on public.availability_requests for select
  using (
    renter_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

create policy "availability_insert_renter"
  on public.availability_requests for insert
  with check (renter_id = auth.uid());

create policy "availability_update_lister_or_admin"
  on public.availability_requests for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- favorites
--   users manage their own (user_id = auth.uid())
--   guests manage by guest_session_id (sent via request header / client value)
-- Guest access relies on a custom claim; for the anon/guest path the app sends
-- the session id and the policy matches it against the request setting.
-- ----------------------------------------------------------------------------
create policy "favorites_select_own"
  on public.favorites for select
  using (
    (user_id is not null and user_id = auth.uid())
    or (guest_session_id is not null
        and guest_session_id = current_setting('request.headers.x-guest-session', true))
  );

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (
    (user_id is not null and user_id = auth.uid())
    or (guest_session_id is not null
        and guest_session_id = current_setting('request.headers.x-guest-session', true))
  );

create policy "favorites_delete_own"
  on public.favorites for delete
  using (
    (user_id is not null and user_id = auth.uid())
    or (guest_session_id is not null
        and guest_session_id = current_setting('request.headers.x-guest-session', true))
  );

-- ----------------------------------------------------------------------------
-- reviews
--   read: anyone
--   insert: only as reviewer_id = self, only when linked request is 'confirmed',
--           and you cannot review yourself
--   no update / delete (omitting those policies blocks them under RLS)
-- ----------------------------------------------------------------------------
create policy "reviews_select_all"
  on public.reviews for select
  using (true);

create policy "reviews_insert_after_confirmed"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and reviewer_id <> reviewee_id
    and exists (
      select 1 from public.availability_requests r
      where r.id = request_id and r.status = 'confirmed'
    )
  );

-- ----------------------------------------------------------------------------
-- notifications
--   read: own only
--   update: own only (e.g. mark as read)
--   insert: server-side only (Edge Functions / triggers via service role,
--           which bypasses RLS). No insert policy = no client inserts.
-- ----------------------------------------------------------------------------
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage policies for the public 'listing-images' bucket.
-- Path convention: {listing_id}/{image_id}.webp — first folder = listing_id.
--   read: public (bucket is public; explicit select policy for the API path)
--   insert/delete: owner of that listing, or admin
-- ----------------------------------------------------------------------------
create policy "listing_images_storage_read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "listing_images_storage_insert_owner_or_admin"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and (
      public.is_admin()
      or exists (
        select 1 from public.listings l
        where l.id = ((storage.foldername(name))[1])::uuid
          and l.owner_id = auth.uid()
      )
    )
  );

create policy "listing_images_storage_delete_owner_or_admin"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and (
      public.is_admin()
      or exists (
        select 1 from public.listings l
        where l.id = ((storage.foldername(name))[1])::uuid
          and l.owner_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Hourly expiry job — expire stale pending requests.
-- Requires the pg_cron + pg_net extensions (enable in Dashboard → Database →
-- Extensions, or via the statements below if your project allows it).
-- Marks pending requests past their 24h window as 'expired' and notifies the
-- renter. The UPDATE runs as the job owner and bypasses RLS.
-- ============================================================================
create extension if not exists pg_cron;

create or replace function public.expire_stale_requests()
returns void as $$
  with expired as (
    update public.availability_requests
       set status = 'expired'
     where status = 'pending'
       and expires_at < now()
    returning id, listing_id, renter_id
  )
  insert into public.notifications (user_id, type, payload)
  select e.renter_id,
         'availability_expired',
         jsonb_build_object('request_id', e.id, 'listing_id', e.listing_id)
  from expired e
  where e.renter_id is not null;
$$ language sql security definer;

alter function public.expire_stale_requests() set search_path = public;

-- Schedule it to run every hour (idempotent: unschedule first if it exists).
select cron.unschedule('expire-stale-availability-requests')
where exists (
  select 1 from cron.job where jobname = 'expire-stale-availability-requests'
);

select cron.schedule(
  'expire-stale-availability-requests',
  '0 * * * *',
  $$select public.expire_stale_requests();$$
);
