-- =====================================================================
-- Update `get_business_by_slug` to also expose avatar metadata so the
-- public booking page (/u/[slug]) can render the owner's avatar/logo.
--
-- Re-runnable.
-- =====================================================================

drop function if exists public.get_business_by_slug(text);

create function public.get_business_by_slug(p_slug text)
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
    b.id,
    b.ad_soyad,
    b.slug,
    b.calisma_saatleri,
    b.ogle_arasi,
    b.slot_dakika,
    b.kapali_gunler,
    coalesce(u.raw_user_meta_data->>'avatar_type', 'initial') as avatar_type,
    coalesce(u.raw_user_meta_data->>'avatar_color', 'green')  as avatar_color,
    u.raw_user_meta_data->>'avatar_icon' as avatar_icon,
    u.raw_user_meta_data->>'avatar_url'  as avatar_url
  from public.businesses b
  join auth.users u on u.id = b.owner_user_id
  where b.slug = p_slug;
$$;

grant execute on function public.get_business_by_slug(text) to anon, authenticated;
