import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Plan } from "./config";

export type PlanStatus = {
  plan: Plan;                  // effective plan (free if pro_until expired)
  storedPlan: Plan;            // what's in the DB column
  proUntil: string | null;
  smsBundleCredits: number;

  // current-month usage
  monthlyBookings: number;
  monthlySmsSent: number;

  // computed
  bookingLimit: number;        // Infinity for pro
  bookingsRemaining: number;   // Infinity for pro
  smsIncludedLimit: number;    // included-in-plan monthly SMS (50 for pro)
  smsRemaining: number;        // included monthly + extra bundles

  // gates
  canAcceptBooking: boolean;
  canSendBusinessSms: boolean;
  canUseWhatsApp: boolean;
  canSeeReports: boolean;
};

function startOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Look up a business's plan + current-month usage via service role (no RLS). */
export async function getPlanStatus(businessId: string): Promise<PlanStatus> {
  const svc = createAdminClient();

  const { data: biz } = await svc
    .from("businesses")
    .select("plan, pro_until, sms_bundle_credits")
    .eq("id", businessId)
    .maybeSingle();

  const storedPlan: Plan = biz?.plan === "pro" ? "pro" : "free";
  const proUntil = (biz?.pro_until as string | null) ?? null;
  const smsBundleCredits = (biz?.sms_bundle_credits as number | null) ?? 0;

  // If proUntil is in the past, treat as free.
  const isProActive =
    storedPlan === "pro" && (!proUntil || new Date(proUntil) > new Date());
  const plan: Plan = isProActive ? "pro" : "free";

  const monthIso = startOfMonthIso();
  const [bookingsRes, smsRes] = await Promise.all([
    svc
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .gte("created_at", monthIso),
    svc
      .from("sms_log")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("ok", true)
      .gte("sent_at", monthIso),
  ]);
  const monthlyBookings = bookingsRes.count ?? 0;
  const monthlySmsSent = smsRes.count ?? 0;

  const limits = PLAN_LIMITS[plan];
  const bookingLimit = limits.bookingsPerMonth;
  const bookingsRemaining = Math.max(0, bookingLimit - monthlyBookings);

  const includedRemaining = Math.max(0, limits.smsIncluded - monthlySmsSent);
  const smsRemaining = includedRemaining + smsBundleCredits;

  return {
    plan,
    storedPlan,
    proUntil,
    smsBundleCredits,
    monthlyBookings,
    monthlySmsSent,
    bookingLimit,
    bookingsRemaining,
    smsIncludedLimit: limits.smsIncluded,
    smsRemaining,
    canAcceptBooking: monthlyBookings < bookingLimit,
    canSendBusinessSms: smsRemaining > 0,
    canUseWhatsApp: limits.canUseWhatsApp,
    canSeeReports: limits.canSeeReports,
  };
}

/** Convenience: look up the current authenticated owner's business plan. */
export async function getCurrentBusinessPlanStatus(): Promise<PlanStatus | null> {
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
  if (!biz) return null;
  return getPlanStatus(biz.id as string);
}

/**
 * Log an SMS and (if past the monthly inclusion) decrement bundle credits.
 * Returns true if the send was actually accounted for.
 */
export async function recordBusinessSms(opts: {
  businessId: string;
  toPhone: string;
  tag: string;
  ok: boolean;
}) {
  const svc = createAdminClient();
  await svc.from("sms_log").insert({
    business_id: opts.businessId,
    to_phone: opts.toPhone,
    tag: opts.tag,
    ok: opts.ok,
  });

  if (!opts.ok) return;

  // If we're beyond the included monthly count, drain a bundle credit.
  const status = await getPlanStatus(opts.businessId);
  if (status.monthlySmsSent > PLAN_LIMITS[status.plan].smsIncluded) {
    // monthlySmsSent already includes the just-inserted row.
    await svc
      .from("businesses")
      .update({
        sms_bundle_credits: Math.max(0, status.smsBundleCredits - 1),
      })
      .eq("id", opts.businessId);
  }
}
