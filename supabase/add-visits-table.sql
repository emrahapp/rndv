-- =====================================================================
-- Track each visit to /u/[slug] so the owner can see traffic + conversion
-- in /app/raporlar.
--   No PII stored — just business_id and timestamp.
-- =====================================================================

create table if not exists public.public_link_visits (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  visited_at  timestamptz not null default now()
);

create index if not exists public_link_visits_business_idx
  on public.public_link_visits(business_id, visited_at desc);

-- RLS: owner sees their own visit rows. Inserts happen via the service
-- role from the public booking page, so no anon/auth insert policy needed.
alter table public.public_link_visits enable row level security;

drop policy if exists "owner reads visits" on public.public_link_visits;
create policy "owner reads visits"
  on public.public_link_visits
  for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = public_link_visits.business_id
        and b.owner_user_id = auth.uid()
    )
  );
