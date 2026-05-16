/**
 * Central SMS template registry.
 *
 *  We deliberately keep messages ASCII-only. Operator-level filters on
 *  Turkish mobile networks frequently drop UCS-2-encoded (Turkish-accented)
 *  SMS coming from international long codes — we'd rather lose the cedillas
 *  than the message. Once Netgsm (local route) is wired up we can switch
 *  back to full diacritics safely.
 */

const MONTHS_TR = [
  "Oca",
  "Sub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Agu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

const DAYS_TR = ["Paz", "Pzt", "Sal", "Car", "Per", "Cum", "Cmt"];

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
  /** Owner phone verification on signup. */
  signupOtp: (otp: string) =>
    `rndv dogrulama kodun: ${otp}\n\nKod 10 dakika gecerli, kimseyle paylasma.`,

  /** Customer phone verification on /u/[slug]. */
  bookingOtp: (businessName: string, otp: string) =>
    `${stripTr(businessName)} - rndv\n\nRandevu kodun: ${otp}\nKod 10 dakika gecerli.`,

  /** Customer received this after their OTP-verified booking succeeded. */
  bookingConfirmed: (opts: {
    businessName: string;
    date: string;
    time: string;
    cancelUrl: string;
  }) =>
    [
      `${stripTr(opts.businessName)} randevun onaylandi.`,
      "",
      `${fmtDateSms(opts.date)} saat ${opts.time}`,
      `Iptal: ${opts.cancelUrl}`,
    ].join("\n"),

  /** Owner created this booking manually for the customer. */
  bookingManual: (opts: {
    businessName: string;
    date: string;
    time: string;
    cancelUrl: string;
  }) =>
    [
      `${stripTr(opts.businessName)} senin icin randevu olusturdu.`,
      "",
      `${fmtDateSms(opts.date)} saat ${opts.time}`,
      `Iptal: ${opts.cancelUrl}`,
    ].join("\n"),

  /** Sent to customer 24h before the appointment. */
  reminder24h: (opts: {
    businessName: string;
    date: string;
    time: string;
    cancelUrl: string;
  }) =>
    [
      `Yarinki randevun:`,
      `${stripTr(opts.businessName)} saat ${opts.time}`,
      "",
      `Iptal: ${opts.cancelUrl}`,
    ].join("\n"),

  /** Sent to customer when owner cancels their appointment. */
  cancelledByOwner: (opts: {
    businessName: string;
    date: string;
    time: string;
  }) =>
    `${stripTr(opts.businessName)} ${fmtDateSms(opts.date)} ${opts.time} randevunu iptal etti.`,

  /** Sent to owner when customer cancels via the /iptal/[token] link. */
  cancelledByCustomer: (opts: {
    customerName: string;
    date: string;
    time: string;
  }) =>
    `${stripTr(opts.customerName)} ${fmtDateSms(opts.date)} ${opts.time} randevusunu iptal etti.`,
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
