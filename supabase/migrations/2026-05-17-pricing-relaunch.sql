-- Pricing relaunch — ₺499 single-tier → ₺199 with ₺99 launch promo.
-- Renames SMS bundle SKUs from old 250/600/1500 → new 100/300/1000 stack.
--
-- Run from Supabase SQL editor (Frankfurt project).
-- Safe to re-run: drops the old constraint before adding the new one.

alter table public.payments
  drop constraint if exists payments_product_check;

alter table public.payments
  add constraint payments_product_check
  check (product in (
    'pro_subscription',
    'sms_bundle_100',
    'sms_bundle_300',
    'sms_bundle_1000'
  ));

-- No existing rows to back-fill in production yet (no real payments taken
-- before the relaunch). If launch goes live and we change SKU naming
-- again later, drop and recreate constraint with both old + new SKUs in
-- the IN-list during the transition.
