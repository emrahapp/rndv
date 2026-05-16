// Subscription / pricing constants. Edit here, not in many files.

export type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    bookingsPerMonth: 30,
    smsIncluded: 0,
    canUseWhatsApp: false,
    canSeeReports: false,
  },
  pro: {
    bookingsPerMonth: Infinity,
    smsIncluded: 500,
    canUseWhatsApp: true,
    canSeeReports: true,
  },
} as const;

export const PRO_PRICE_KURUS = 49900; // ₺499.00

export const SMS_BUNDLES = [
  { id: "sms_bundle_250", name: "Mini", smsCount: 250, kurus: 5000 },
  { id: "sms_bundle_600", name: "Standart", smsCount: 600, kurus: 10000 },
  { id: "sms_bundle_1500", name: "Pro", smsCount: 1500, kurus: 20000 },
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
