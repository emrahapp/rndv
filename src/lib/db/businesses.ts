import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/business/slug";
import {
  coerceAvatarColor,
  coerceAvatarType,
  coerceSectorIcon,
} from "@/lib/auth/avatar-color";
import type { Business, PublicBusiness } from "@/lib/business/types";

type BusinessRow = {
  id: string;
  owner_user_id?: string;
  ad_soyad: string;
  slug: string;
  telefon: string;
  email: string;
  calisma_saatleri: Business["calisma_saatleri"];
  ogle_arasi: Business["ogle_arasi"];
  slot_dakika: Business["slot_dakika"];
  kapali_gunler: string[] | null;
};

function rowToBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ad_soyad: row.ad_soyad,
    slug: row.slug,
    telefon: row.telefon,
    email: row.email,
    calisma_saatleri: row.calisma_saatleri,
    ogle_arasi: row.ogle_arasi,
    slot_dakika: row.slot_dakika,
    kapali_gunler: row.kapali_gunler ?? [],
  };
}

type PublicBusinessRpcRow = Omit<BusinessRow, "telefon" | "email"> & {
  avatar_type: string | null;
  avatar_color: string | null;
  avatar_icon: string | null;
  avatar_url: string | null;
};

function rowToPublicBusiness(row: PublicBusinessRpcRow): PublicBusiness {
  return {
    id: row.id,
    ad_soyad: row.ad_soyad,
    slug: row.slug,
    calisma_saatleri: row.calisma_saatleri,
    ogle_arasi: row.ogle_arasi,
    slot_dakika: row.slot_dakika,
    kapali_gunler: row.kapali_gunler ?? [],
    avatarType: coerceAvatarType(row.avatar_type),
    avatarColor: coerceAvatarColor(row.avatar_color),
    avatarIcon: coerceSectorIcon(row.avatar_icon),
    avatarUrl: row.avatar_url,
  };
}

/** Returns the currently-authenticated owner's business (or null). */
export async function getCurrentBusiness(): Promise<Business | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToBusiness(data as BusinessRow);
}

/** Public lookup by slug via SECURITY DEFINER RPC (anon-callable). */
export async function getPublicBusinessBySlug(
  slug: string,
): Promise<PublicBusiness | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_business_by_slug", {
    p_slug: slug,
  });
  if (error) {
    console.error("[db] get_business_by_slug:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;
  return rowToPublicBusiness(data[0]);
}

/** Service-role lookup by slug — includes private fields (telefon, email).
 * Used server-side after booking OTP to notify the owner. */
export async function getBusinessForNotifyBySlug(
  slug: string,
): Promise<Business | null> {
  const svc = createAdminClient();
  const { data, error } = await svc
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToBusiness(data as BusinessRow);
}

/** Same as above, but by id. */
export async function getBusinessForNotifyById(
  id: string,
): Promise<Business | null> {
  const svc = createAdminClient();
  const { data, error } = await svc
    .from("businesses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToBusiness(data as BusinessRow);
}

/** Insert a new business (service role — bypasses RLS during signup). */
export async function createBusiness(input: {
  owner_user_id: string;
  ad_soyad: string;
  slug: string;
  telefon: string;
  email: string;
}): Promise<Business | null> {
  const svc = createAdminClient();
  const { data, error } = await svc
    .from("businesses")
    .insert({
      owner_user_id: input.owner_user_id,
      ad_soyad: input.ad_soyad,
      slug: input.slug,
      telefon: input.telefon,
      email: input.email,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("[db] createBusiness:", error?.message);
    return null;
  }
  return rowToBusiness(data as BusinessRow);
}

/** Patch the current owner's business — RLS enforces it's their own. */
export async function updateCurrentBusiness(
  patch: Partial<Omit<Business, "id">>,
): Promise<Business | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("owner_user_id", user.id)
    .select("*")
    .single();
  if (error || !data) {
    console.error("[db] updateCurrentBusiness:", error?.message);
    return null;
  }
  return rowToBusiness(data as BusinessRow);
}

/** Slug already in use? (service role to avoid RLS gating) */
export async function isSlugTaken(
  slug: string,
  excludingUserId?: string,
): Promise<boolean> {
  const svc = createAdminClient();
  let q = svc.from("businesses").select("id").eq("slug", slug);
  if (excludingUserId) q = q.neq("owner_user_id", excludingUserId);
  const { data } = await q.limit(1);
  return !!(data && data.length > 0);
}

/** Build a slug that doesn't collide with existing ones, by appending -2, -3, …
 *  Falls back to a random suffix after 50 attempts. */
export async function ensureUniqueSlug(
  base: string,
  excludingUserId?: string,
): Promise<string> {
  const cleaned = slugify(base) || `firma-${Date.now().toString(36).slice(-5)}`;
  let candidate = cleaned;
  let n = 1;
  while (await isSlugTaken(candidate, excludingUserId)) {
    n += 1;
    candidate = `${cleaned}-${n}`;
    if (n > 50) {
      return `${cleaned}-${Date.now().toString(36).slice(-5)}`;
    }
  }
  return candidate;
}
