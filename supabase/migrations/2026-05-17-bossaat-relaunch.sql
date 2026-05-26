-- =====================================================================
-- Bossaat relaunch — wipe all test/pilot data for fresh start.
--
-- Run from Supabase SQL editor (Frankfurt project), in this order:
--   1. This file (wipes app data)
--   2. Then: Authentication > Users tab — delete remaining auth users
--      manually (Supabase doesn't let SQL touch auth.users from the editor)
--   3. Then: Storage > avatars bucket — delete any uploaded files
--
-- Tables wiped CASCADE so any FK-linked rows also clear themselves.
-- =====================================================================

truncate table public.appointments restart identity cascade;
truncate table public.customers     restart identity cascade;
truncate table public.payments      restart identity cascade;
truncate table public.otp_codes     restart identity cascade;
truncate table public.sms_log       restart identity cascade;
truncate table public.businesses    restart identity cascade;
