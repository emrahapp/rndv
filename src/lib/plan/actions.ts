"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveProPriceKurus, SMS_BUNDLES } from "./config";

type Result<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Look up the currently-authenticated owner's business id. */
async function currentBusinessId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  return (biz?.id as string | undefined) ?? null;
}

/**
 * MOCK Pro upgrade. Simulates a successful payment — records a `payments`
 * row with status='succeeded' and flips the business to Pro for 30 days.
 *
 * Once iyzico is approved, this gets replaced with: create iyzico
 * CheckoutForm session → redirect → webhook → activate Pro.
 */
export async function mockPurchaseProAction(): Promise<Result> {
  const businessId = await currentBusinessId();
  if (!businessId) return { ok: false, error: "Oturum yok." };

  const svc = createAdminClient();
  // Charge whatever the current effective price is — launch promo (₺99)
  // or full (₺199). The payments row records the actual amount paid so
  // historical data stays accurate even when the promo flag flips.
  const { error: payErr } = await svc.from("payments").insert({
    business_id: businessId,
    amount_kurus: getActiveProPriceKurus(),
    product: "pro_subscription",
    status: "succeeded",
  });
  if (payErr) return { ok: false, error: payErr.message };

  const proUntil = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { error: upErr } = await svc
    .from("businesses")
    .update({ plan: "pro", pro_until: proUntil })
    .eq("id", businessId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** MOCK SMS bundle purchase. Adds credits + payment row. */
export async function mockPurchaseBundleAction(
  smsCount: 100 | 300 | 1000,
): Promise<Result> {
  const bundle = SMS_BUNDLES.find((b) => b.smsCount === smsCount);
  if (!bundle) return { ok: false, error: "Geçersiz paket." };

  const businessId = await currentBusinessId();
  if (!businessId) return { ok: false, error: "Oturum yok." };

  const svc = createAdminClient();
  const { error: payErr } = await svc.from("payments").insert({
    business_id: businessId,
    amount_kurus: bundle.kurus,
    product: bundle.id,
    status: "succeeded",
  });
  if (payErr) return { ok: false, error: payErr.message };

  const { data: biz } = await svc
    .from("businesses")
    .select("sms_bundle_credits")
    .eq("id", businessId)
    .single();
  const current = (biz?.sms_bundle_credits as number | undefined) ?? 0;

  const { error: upErr } = await svc
    .from("businesses")
    .update({ sms_bundle_credits: current + bundle.smsCount })
    .eq("id", businessId);
  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Manual downgrade — sets plan back to Free. Kept for the "Free'ye dön"
 *  control in settings while we're still iterating. */
export async function downgradeAction(): Promise<Result> {
  const businessId = await currentBusinessId();
  if (!businessId) return { ok: false, error: "Oturum yok." };

  const svc = createAdminClient();
  const { error } = await svc
    .from("businesses")
    .update({ plan: "free", pro_until: null })
    .eq("id", businessId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
