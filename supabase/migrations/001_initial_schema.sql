-- ============================================================================
-- onenight — initial schema
-- Israeli evening-dress rental marketplace.
-- Every user can both list dresses and rent from others (no role distinction).
-- Run order: 001_initial_schema.sql  →  002_rls_policies.sql
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (available by default on Supabase).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles — one per auth user.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  phone text,                        -- used as contact number when listing
  email text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- listings — one row per dress. Guests may list (owner_id null) but must
-- always supply an email + phone so renters can eventually be connected.
-- ----------------------------------------------------------------------------
create table public.listings (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete set null,  -- null if guest
  owner_name text not null,
  owner_email text not null,
  owner_phone text not null,          -- revealed to renter after availability confirmed
  -- dress details
  title text not null,
  description text,
  brand text,
  color text,
  size text not null,
  price_per_night numeric(10,2) not null,
  deposit numeric(10,2),
  condition text check (condition in ('new', 'like_new', 'good', 'fair')),
  style_tags text[],                  -- e.g. ["ערב", "חתונה", "קוקטייל"]
  location_city text,
  -- admin moderation
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  rejection_reason text,
  approved_at timestamptz,
  -- state
  is_available boolean default true,
  -- future payment hook (uncomment when payments are added):
  -- price_unlock_ils numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index listings_status_idx on public.listings (status);
create index listings_owner_idx on public.listings (owner_id);

-- ----------------------------------------------------------------------------
-- listing_images — multiple images per listing, one marked primary (cover).
-- ----------------------------------------------------------------------------
create table public.listing_images (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  storage_path text not null,
  url text not null,
  is_primary boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index listing_images_listing_idx on public.listing_images (listing_id);

-- ----------------------------------------------------------------------------
-- availability_requests — core interaction flow.
-- A renter asks if a dress is free; the lister responds within 24h.
-- On 'confirmed', the renter may see the lister's phone (listings.owner_phone).
-- ----------------------------------------------------------------------------
create table public.availability_requests (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  -- renter info
  renter_id uuid references public.profiles(id) on delete set null,
  renter_email text not null,         -- always collected, even from guests
  renter_name text not null,
  renter_phone text,
  -- flow status
  status text default 'pending' check (
    status in (
      'pending',       -- renter sent request, waiting for lister
      'confirmed',     -- lister said yes → contact details revealed to renter
      'declined',      -- lister said no
      'expired',       -- lister did not respond within 24h
      'cancelled'      -- renter cancelled before response
    )
  ),
  -- lister response
  lister_response_at timestamptz,
  lister_message text,                -- optional message from lister
  -- expiry logic
  expires_at timestamptz not null default (now() + interval '24 hours'),
  -- future payment hook (uncomment when payments are added):
  -- payment_status text default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  -- payment_intent_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index availability_requests_listing_idx on public.availability_requests (listing_id);
create index availability_requests_renter_idx on public.availability_requests (renter_id);
create index availability_requests_status_idx on public.availability_requests (status);
-- Used by the hourly expiry job (status = 'pending' and expires_at < now()).
create index availability_requests_expiry_idx on public.availability_requests (expires_at)
  where status = 'pending';

-- ----------------------------------------------------------------------------
-- favorites — supports logged-in users and guest sessions.
-- Exactly one of (user_id, guest_session_id) is normally set.
-- ----------------------------------------------------------------------------
create table public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  guest_session_id text,              -- client-generated UUID for guests
  listing_id uuid references public.listings(id) on delete cascade not null,
  created_at timestamptz default now(),
  constraint favorites_one_per_user unique nulls not distinct (listing_id, user_id, guest_session_id)
);

create index favorites_user_idx on public.favorites (user_id);
create index favorites_guest_idx on public.favorites (guest_session_id);

-- ----------------------------------------------------------------------------
-- reviews — rate the other party after a real interaction.
-- Tied to an availability_request so only genuine interactions can be reviewed.
-- ----------------------------------------------------------------------------
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references public.availability_requests(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  reviewee_id uuid references public.profiles(id) on delete cascade not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  constraint one_review_per_request_per_reviewer unique (request_id, reviewer_id)
);

create index reviews_reviewee_idx on public.reviews (reviewee_id);

-- Aggregate rating per user, surfaced on the reviewee's profile.
create view public.user_ratings as
select
  reviewee_id as user_id,
  round(avg(rating)::numeric, 1) as average_rating,
  count(*) as total_reviews
from public.reviews
group by reviewee_id;

-- ----------------------------------------------------------------------------
-- notifications — in-app + email notifications for key events.
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (
    type in (
      'availability_request_received',   -- lister: someone asked about your dress
      'availability_confirmed',          -- renter: lister said yes, here's the phone
      'availability_declined',           -- renter: lister said no
      'availability_expired',            -- renter: no response, try again?
      'listing_approved',                -- lister: your listing was approved
      'listing_rejected',                -- lister: your listing was rejected
      'review_received'                  -- user: someone left you a review
    )
  ),
  payload jsonb,                         -- e.g. { listing_id, request_id, message }
  is_read boolean default false,
  created_at timestamptz default now()
);

create index notifications_user_idx on public.notifications (user_id);

-- ----------------------------------------------------------------------------
-- updated_at maintenance — keep updated_at fresh on row updates.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger availability_requests_set_updated_at
  before update on public.availability_requests
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Storage bucket: listing-images (public, image MIME types, 10MB limit).
-- Folder convention:  listing-images/{listing_id}/{image_id}.webp
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
