/**
 * Central SMS template registry.
 *
 * Designed for **Netgsm** (Turkish local SMS gateway):
 *   - Full Turkish diacritics (`şğüçöı`) are safe — Netgsm sends in TR
 *     encoding (UCS-2 with Turkish support), no operator-level character
 *     filtering on local routes.
 *   - Segment limits: TR encoding = 155 chars per segment, up to 458 in
 *     3 concatenated segments. Plenty of room for body + cancel URL.
 *   - No "trial account" prefix to worry about (vs Twilio).
 *
 * If we ever fall back to Twilio international routes, see git history
 * for the ASCII-only variants — `stripTr()` is kept as a helper below
 * so any one template can opt in to GSM-7 safety on demand.
 */

const MONTHS_TR = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

const DAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

/** "2026-05-18" → "18 May Pzt" — short ASCII Turkish date for SMS. */
export function fmtDateSms(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${d} ${MONTHS_TR[m - 1]} ${DAYS_TR[dt.getDay()]}`;
}

/** Convert a Turkish phone number to E.164 (+90...). */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("90") ? `+${digits}` : `+90${digits}`;
}

// ────────────────────────────────────────────────────────────
// Templates — each returns the SMS body string
// ────────────────────────────────────────────────────────────

export const sms = {
  /** Owner phone verification on signup. Platform-paid. */
  signupOtp: (otp: string) =>
    `Bossaat doğrulama kodun: ${otp}\n\nKod 10 dakika geçerli, kimseyle paylaşma.`,

  /** Customer phone verification on /u/[slug]. Platform-paid. */
  bookingOtp: (businessName: string, otp: string) =>
    `${businessName} · Bossaat\n\nRandevu kodun: ${otp}\nKod 10 dakika geçerli.`,

  /** Customer received this after their OTP-verified booking succeeded. */
  bookingConfirmed: (opts: {
    businessName: string;
    date: string;
    time: string;
    cancelUrl: string;
  }) =>
    [
      `${opts.businessName} randevun onaylandı.`,
      `${fmtDateSms(opts.date)} saat ${opts.time}`,
      `İptal: ${opts.cancelUrl}`,
    ].join("\n"),

  /** Owner created this booking manually for the customer. */
  bookingManual: (opts: {
    businessName: string;
    date: string;
    time: string;
    cancelUrl: string;
  }) =>
    [
      `${opts.businessName} senin için randevu oluşturdu.`,
      `${fmtDateSms(opts.date)} saat ${opts.time}`,
      `İptal: ${opts.cancelUrl}`,
    ].join("\n"),

  /** Sent to customer 24h before the appointment. */
  reminder24h: (opts: {
    businessName: string;
    date: string;
    time: string;
    cancelUrl: string;
  }) =>
    [
      `Yarınki randevun:`,
      `${opts.businessName} saat ${opts.time}`,
      `İptal: ${opts.cancelUrl}`,
    ].join("\n"),

  /** Sent to customer when owner cancels their appointment. */
  cancelledByOwner: (opts: {
    businessName: string;
    date: string;
    time: string;
  }) =>
    `${opts.businessName} ${fmtDateSms(opts.date)} ${opts.time} randevunu iptal etti.`,

  /** Sent to owner when customer cancels via the /iptal/[token] link. */
  cancelledByCustomer: (opts: {
    customerName: string;
    date: string;
    time: string;
  }) =>
    `${opts.customerName} ${fmtDateSms(opts.date)} ${opts.time} randevusunu iptal etti.`,
};

// ────────────────────────────────────────────────────────────

const TR_MAP: Record<string, string> = {
  ı: "i",
  İ: "I",
  ş: "s",
  Ş: "S",
  ğ: "g",
  Ğ: "G",
  ç: "c",
  Ç: "C",
  ö: "o",
  Ö: "O",
  ü: "u",
  Ü: "U",
};

/** Strip Turkish diacritics so the SMS stays in GSM-7 (1 segment / ~160 chars). */
export function stripTr(input: string): string {
  return input
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("");
}
