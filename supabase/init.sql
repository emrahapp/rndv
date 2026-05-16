-- =====================================================================
-- rndv.click — full schema for a fresh Supabase project.
-- Run this ONCE in SQL Editor. Re-runnable / idempotent.
-- =====================================================================

create extension if not exists "uuid-ossp";

-- Reset (in case of re-run)
drop function if exists public.get_business_by_slug(text);
drop function if exists public.get_taken_slots(text);
drop table if exists public.payments cascade;
drop table if exists public.sms_log cascade;
drop table if exists public.public_link_visits cascade;
drop table if exists public.appointments cascade;
drop table if exists public.customers cascade;
drop table if exists public.otp_codes cascade;
drop table if exists public.businesses cascade;
drop type if exists appointment_status;

create type appointment_status as enum ('confirmed', 'cancelled', 'completed');

-- ─────────────────── businesses ───────────────────
create table public.businesses (
  id                  uuid primary key default uuid_generate_v4(),
  owner_user_id       uuid not null references auth.users(id) on delete cascade,
  ad_soyad            text not null,
  slug                text not null unique,
  telefon             text not null,
  email               text not null,
  calisma_saatleri    jsonb not null default '{
    "mon":["09:00","18:00"],
    "tue":["09:00","18:00"],
    "wed":["09:00","18:00"],
    "thu":["09:00","18:00"],
    "fri":["09:00","18:00"],
    "sat":["10:00","16:00"],
    "sun":null
  }'::jsonb,
  ogle_arasi          jsonb default '["12:30","13:30"]'::jsonb,
  slot_dakika         int not null default 30 check (slot_dakika in (15, 30, 45, 60)),
  kapali_gunler       date[] not null default '{}',

  -- pricing
  plan                text not null default 'free' check (plan in ('free','pro')),
  pro_until           timestamptz,
  sms_bundle_credits  int not null default 0,

  created_at          timestamptz not null default now(),
  unique (owner_user_id)
);
create index businesses_slug_idx on public.businesses(slug);

-- ─────────────────── customers ───────────────────
create table public.customers (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  ad_soyad        text not null,
  telefon         text not null,
  total_bookings  int not null default 0,
  last_booking_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (business_id, telefon)
);
create index customers_business_idx on public.customers(business_id);

-- ─────────────────── appointments ───────────────────
create table public.appointments (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  date            date not null,
  "time"          text not null check ("time" ~ '^[0-2][0-9]:[0-5][0-9]$'),
  status          appointment_status not null default 'confirmed',
  source          text not null default 'online' check (source in ('online','manual')),
  cancel_token    text not null unique default replace(uuid_generate_v4()::text, '-', ''),
  notes           text,
  reminder_sent   boolean not null default false,
  created_at      timestamptz not null default now()
);
create index appointments_business_date_idx
  on public.appointments(business_id, date);
create unique index appointments_no_double_book_idx
  on public.appointments(business_id, date, "time")
  where status <> 'cancelled';
create index appointments_reminder_pending_idx
  on public.appointments(date)
  where status = 'confirmed' and reminder_sent = false;

-- ─────────────────── otp_codes ───────────────────
create table public.otp_codes (
  id          uuid primary key default uuid_generate_v4(),
  telefon     text not null,
  kod_hash    text not null,
  amac        text not null check (amac in ('signup','booking','login')),
  expires_at  timestamptz not null,
  kullanildi  boolean not null default false,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index otp_telefon_idx on public.otp_codes(telefon, created_at desc);

-- ─────────────────── public_link_visits ───────────────────
create table public.public_link_visits (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  visited_at  timestamptz not null default now()
);
create index public_link_visits_business_idx
  on public.public_link_visits(business_id, visited_at desc);

-- ─────────────────── sms_log ───────────────────
create table public.sms_log (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  to_phone    text not null,
  tag         text,
  ok          boolean not null default true,
  sent_at     timestamptz not null default now()
);
create index sms_log_business_sent_idx
  on public.sms_log(business_id, sent_at desc);

-- ─────────────────── payments ───────────────────
create table public.payments (
  id                 uuid primary key default uuid_generate_v4(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  amount_kurus       int not null,
  product            text not null check (product in (
    'pro_subscription','sms_bundle_250','sms_bundle_600','sms_bundle_1500'
  )),
  status             text not null default 'pending' check (status in (
    'pending','succeeded','failed','cancelled'
  )),
  iyzico_token       text,
  iyzico_payment_id  text,
  raw_response       jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);
create index payments_business_created_idx
  on public.payments(business_id, created_at desc);
create index payments_iyzico_token_idx
  on public.payments(iyzico_token) where iyzico_token is not null;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.businesses          enable row level security;
alter table public.customers           enable row level security;
alter table public.appointments        enable row level security;
alter table public.otp_codes           enable row level security;
alter table public.public_link_visits  enable row level security;
alter table public.sms_log             enable row level security;
alter table public.payments            enable row level security;

-- businesses
create policy "owner reads business"   on public.businesses for select using (owner_user_id = auth.uid());
create policy "owner inserts business" on public.businesses for insert with check (owner_user_id = auth.uid());
create policy "owner updates business" on public.businesses for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "owner deletes business" on public.businesses for delete using (owner_user_id = auth.uid());

-- customers / appointments / visits / sms_log / payments — all gated through business ownership
create policy "owner manages customers" on public.customers for all
  using (exists (select 1 from public.businesses b
    where b.id = customers.business_id and b.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b
    where b.id = customers.business_id and b.owner_user_id = auth.uid()));

create policy "owner manages appointments" on public.appointments for all
  using (exists (select 1 from public.businesses b
    where b.id = appointments.business_id and b.owner_user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b
    where b.id = appointments.business_id and b.owner_user_id = auth.uid()));

create policy "owner reads visits" on public.public_link_visits for select
  using (exists (select 1 from public.businesses b
    where b.id = public_link_visits.business_id and b.owner_user_id = auth.uid()));

create policy "owner reads sms log" on public.sms_log for select
  using (exists (select 1 from public.businesses b
    where b.id = sms_log.business_id and b.owner_user_id = auth.uid()));

create policy "owner reads payments" on public.payments for select
  using (exists (select 1 from public.businesses b
    where b.id = payments.business_id and b.owner_user_id = auth.uid()));

-- otp_codes: service role only (no policy → no access for anon/authenticated)

-- =====================================================================
-- Public RPCs
-- =====================================================================

-- get_business_by_slug — includes avatar metadata from auth.users
create or replace function public.get_business_by_slug(p_slug text)
returns table (
  id uuid,
  ad_soyad text,
  slug text,
  calisma_saatleri jsonb,
  ogle_arasi jsonb,
  slot_dakika int,
  kapali_gunler date[],
  avatar_type text,
  avatar_color text,
  avatar_icon text,
  avatar_url text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    b.id, b.ad_soyad, b.slug, b.calisma_saatleri, b.ogle_arasi,
    b.slot_dakika, b.kapali_gunler,
    coalesce(u.raw_user_meta_data->>'avatar_type', 'initial') as avatar_type,
    coalesce(u.raw_user_meta_data->>'avatar_color', 'green')  as avatar_color,
    u.raw_user_meta_data->>'avatar_icon' as avatar_icon,
    u.raw_user_meta_data->>'avatar_url'  as avatar_url
  from public.businesses b
  join auth.users u on u.id = b.owner_user_id
  where b.slug = p_slug;
$$;
grant execute on function public.get_business_by_slug(text) to anon, authenticated;

-- get_taken_slots — anon-readable taken (date, time) pairs by slug
create or replace function public.get_taken_slots(p_slug text)
returns table (date date, "time" text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select a.date, a."time"
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  where b.slug = p_slug
    and a.status <> 'cancelled'
    and a.date >= current_date;
$$;
grant execute on function public.get_taken_slots(text) to anon, authenticated;
