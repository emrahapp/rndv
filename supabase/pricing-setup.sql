-- =====================================================================
-- Pricing & subscription tables.
--   businesses gains: plan, pro_until, sms_bundle_credits
--   New tables:       sms_log (audit + quota count), payments (iyzico)
-- Re-runnable.
-- =====================================================================

-- ─── Add plan columns to businesses ───
alter table public.businesses
  add column if not exists plan text not null default 'free';

alter table public.businesses
  drop constraint if exists businesses_plan_check;
alter table public.businesses
  add constraint businesses_plan_check check (plan in ('free', 'pro'));

alter table public.businesses
  add column if not exists pro_until timestamptz;

alter table public.businesses
  add column if not exists sms_bundle_credits int not null default 0;

-- ─── sms_log: every business-side SMS we send ───
create table if not exists public.sms_log (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  to_phone    text not null,
  tag         text,
  ok          boolean not null default true,
  sent_at     timestamptz not null default now()
);

create index if not exists sms_log_business_sent_idx
  on public.sms_log(business_id, sent_at desc);

alter table public.sms_log enable row level security;

drop policy if exists "owner reads sms log" on public.sms_log;
create policy "owner reads sms log" on public.sms_log
  for select
  using (exists (
    select 1 from public.businesses b
    where b.id = sms_log.business_id and b.owner_user_id = auth.uid()
  ));

-- ─── payments: iyzico transactions ───
create table if not exists public.payments (
  id                 uuid primary key default uuid_generate_v4(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  amount_kurus       int not null,  -- amount in kuruş (1 TL = 100 kuruş)
  product            text not null,
  status             text not null default 'pending',
  iyzico_token       text,
  iyzico_payment_id  text,
  raw_response       jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

alter table public.payments
  drop constraint if exists payments_product_check;
alter table public.payments
  add constraint payments_product_check
  check (product in (
    'pro_subscription',
    'sms_bundle_250',
    'sms_bundle_600',
    'sms_bundle_1500'
  ));

alter table public.payments
  drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('pending', 'succeeded', 'failed', 'cancelled'));

create index if not exists payments_business_created_idx
  on public.payments(business_id, created_at desc);
create index if not exists payments_iyzico_token_idx
  on public.payments(iyzico_token)
  where iyzico_token is not null;

alter table public.payments enable row level security;

drop policy if exists "owner reads payments" on public.payments;
create policy "owner reads payments" on public.payments
  for select
  using (exists (
    select 1 from public.businesses b
    where b.id = payments.business_id and b.owner_user_id = auth.uid()
  ));
