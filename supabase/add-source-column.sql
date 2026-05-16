-- =====================================================================
-- Add `source` column to appointments — distinguishes customer-booked
-- (online) vs panel-created (manual) appointments.
-- Run once. Re-runnable / idempotent.
-- =====================================================================

alter table public.appointments
  add column if not exists source text not null default 'online';

-- Ensure the check constraint exists exactly once.
alter table public.appointments
  drop constraint if exists appointments_source_check;
alter table public.appointments
  add constraint appointments_source_check
  check (source in ('online', 'manual'));
