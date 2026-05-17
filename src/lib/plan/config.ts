// Subscription / pricing constants. Edit here, not in many files.

export type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    bookingsPerMonth: 20,
    smsIncluded: 0,
    canUseWhatsApp: false,
    canSeeReports: false,
  },
  pro: {
    bookingsPerMonth: Infinity,
    smsIncluded: 50,
    canUseWhatsApp: true,
    canSeeReports: true,
  },
} as const;

/**
 * Pricing — kurus (1/100 TL).
 *
 * Launch promo: ilk 100 üyeye **ilk 12 ay** ₺99/ay. Süre dolduğunda
 * `PRO_PRICE_KURUS` (₺199/ay) seviyesine geçer. Promo'yu kapatmak için
 * `LAUNCH_PROMO_ACTIVE` env var'ını "0" yap; pricing UI ve checkout
 * doğrudan tam fiyatı gösterir.
 */
export const PRO_PRICE_KURUS = 19900; // ₺199.00 (tam fiyat)
export const PRO_LAUNCH_PRICE_KURUS = 9900; // ₺99.00 (ilk 100 üye, 12 ay)
export const PRO_LAUNCH_SEAT_LIMIT = 100;
export const PRO_LAUNCH_MONTHS = 12;

export function isLaunchPromoActive(): boolean {
  return process.env.LAUNCH_PROMO_ACTIVE !== "0";
}

/** Effective Pro price (kurus) — launch promo or full. */
export function getActiveProPriceKurus(): number {
  return isLaunchPromoActive() ? PRO_LAUNCH_PRICE_KURUS : PRO_PRICE_KURUS;
}

/** "₺199" / "₺99" — TR-format integer-Lira string. */
export function formatKurus(kurus: number): string {
  return `₺${Math.round(kurus / 100)}`;
}

export const SMS_BUNDLES = [
  { id: "sms_bundle_100", name: "Mini", smsCount: 100, kurus: 4900 },
  { id: "sms_bundle_300", name: "Standart", smsCount: 300, kurus: 11900 },
  { id: "sms_bundle_1000", name: "Yoğun", smsCount: 1000, kurus: 29900 },
] as const;

export type SmsBundleId = (typeof SMS_BUNDLES)[number]["id"];

/** Tags whose SMS we (the platform) pay for. Always sent regardless of plan. */
export const PLATFORM_SMS_TAGS = new Set([
  "signup-otp",
  "signup-otp-resend",
  "signup-otp-relogin",
  "booking-otp",
]);

export function isPlatformTag(tag: string): boolean {
  return PLATFORM_SMS_TAGS.has(tag);
}
