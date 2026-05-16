-- =====================================================================
-- Add `reminder_sent` flag to appointments so the daily reminder cron
-- doesn't double-send. Re-runnable.
-- =====================================================================

alter table public.appointments
  add column if not exists reminder_sent boolean not null default false;

-- Quick lookup for the cron job
create index if not exists appointments_reminder_pending_idx
  on public.appointments(date)
  where status = 'confirmed' and reminder_sent = false;
