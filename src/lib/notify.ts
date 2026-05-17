import "server-only";
import { getPlanStatus, recordBusinessSms } from "@/lib/plan/enforce";

/**
 * Notification provider abstraction.
 *
 * Mode is controlled by the `NOTIFY_MODE` env var:
 *   - "mock"   → log to dev console (default; what we use in development)
 *   - "twilio" → Twilio Programmable SMS REST API
 *   - "netgsm" → Netgsm (Turkey) HTTP API
 *
 * WhatsApp is always Meta Cloud API (or mock).
 */

type NotifyMode = "mock" | "twilio" | "netgsm";
const MODE = (process.env.NOTIFY_MODE ?? "mock") as NotifyMode;

type SmsArgs = { to: string; message: string; tag?: string };
type WaArgs = {
  to: string;
  template: string;
  variables?: Record<string, string>;
};

type SmsResult =
  | { ok: true; providerId: string }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────
export async function sendSms({
  to,
  message,
  tag = "sms",
}: SmsArgs): Promise<SmsResult> {
  if (MODE === "mock") return logToConsole(to, message, tag);
  if (MODE === "twilio") return sendSmsViaTwilio({ to, message, tag });
  if (MODE === "netgsm") return sendSmsViaNetgsm({ to, message, tag });
  console.error(`[notify] unknown NOTIFY_MODE=${MODE}, falling back to mock`);
  return logToConsole(to, message, tag);
}

export async function sendWhatsApp({
  to,
  template,
  variables,
}: WaArgs): Promise<SmsResult> {
  if (MODE === "mock") {
    console.log(
      `\n[notify:wa] → ${to}\ntemplate=${template}\nvars=${JSON.stringify(variables ?? {})}\n`,
    );
    return { ok: true, providerId: `mock-${Date.now()}` };
  }
  return sendWhatsAppViaCloudApi({ to, template, variables });
}

function logToConsole(to: string, message: string, tag: string): SmsResult {
  console.log(`\n[notify:${tag}] → ${to}\n${message}\n`);
  return { ok: true, providerId: `mock-${Date.now()}` };
}

// ─────────────────────────────────────────────────────────────
// Business-aware SMS — enforces plan quota + records to sms_log
// Use this for booking confirmations, reminders, cancellations…
// (anything that "costs" the business's quota).
// Use the bare `sendSms` for platform-paid SMS (OTPs).
// ─────────────────────────────────────────────────────────────
export async function sendBusinessSms(opts: {
  businessId: string;
  to: string;
  message: string;
  tag: string;
}): Promise<SmsResult> {
  const status = await getPlanStatus(opts.businessId);
  if (!status.canSendBusinessSms) {
    console.log(
      `[notify:${opts.tag}] plan-skipped (plan=${status.plan}, remaining=${status.smsRemaining})`,
    );
    return { ok: false, error: "plan-quota-exceeded" };
  }

  const result = await sendSms({
    to: opts.to,
    message: opts.message,
    tag: opts.tag,
  });

  await recordBusinessSms({
    businessId: opts.businessId,
    toPhone: opts.to,
    tag: opts.tag,
    ok: result.ok,
  });

  return result;
}

// ─────────────────────────────────────────────────────────────
// Business-aware WhatsApp — Pro plan only
// ─────────────────────────────────────────────────────────────
export async function sendBusinessWhatsApp(opts: {
  businessId: string;
  to: string;
  template: string;
  variables?: Record<string, string>;
}): Promise<SmsResult> {
  const status = await getPlanStatus(opts.businessId);
  if (!status.canUseWhatsApp) {
    console.log(
      `[notify:wa] plan-skipped (plan=${status.plan}, template=${opts.template})`,
    );
    return { ok: false, error: "plan-feature-locked" };
  }
  return sendWhatsApp({
    to: opts.to,
    template: opts.template,
    variables: opts.variables,
  });
}

// ─────────────────────────────────────────────────────────────
// Twilio Programmable SMS
//   https://www.twilio.com/docs/messaging/api/message-resource
// ─────────────────────────────────────────────────────────────
async function sendSmsViaTwilio({
  to,
  message,
  tag,
}: SmsArgs): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.error("[notify:twilio] missing creds, falling back to mock");
    logToConsole(to, message, tag ?? "sms");
    return { ok: false, error: "twilio-creds-missing" };
  }
  // E.164 normalization: ensure leading '+'. Our DB stores "905XXX..." without +.
  const dest = to.startsWith("+") ? to : `+${to.replace(/\D/g, "")}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const body = new URLSearchParams({
    To: dest,
    From: from,
    Body: message,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await res.json()) as {
      sid?: string;
      status?: string;
      message?: string;
      code?: number;
    };
    if (!res.ok) {
      const err = `twilio-${res.status}-${data.code ?? ""}-${data.message ?? "unknown"}`;
      console.error(`[notify:twilio] ${err}`);
      return { ok: false, error: err };
    }
    return { ok: true, providerId: data.sid ?? "" };
  } catch (e) {
    const err = e instanceof Error ? e.message : "twilio-network";
    console.error(`[notify:twilio] ${err}`);
    return { ok: false, error: err };
  }
}

// ─────────────────────────────────────────────────────────────
// Netgsm – Turkey SMS (REST v2 JSON POST)
//   https://www.netgsm.com.tr/dokuman/#sms-rest-api
//
// Required env (set on Vercel for Production):
//   NETGSM_USERNAME  Netgsm panel kullanıcı kodu (10 haneli, IYS no.)
//   NETGSM_PASSWORD  API parolası (panel parolası DEĞİL — ayrı verilir)
//   NETGSM_HEADER    Onaylı msgheader / marka adı (max 11 karakter)
//
// Phone format: Netgsm expects `905XXXXXXXXX` (12 digits, no plus).
// We strip non-digits and drop a leading `+` to be safe.
//
// Encoding: we send `encoding: "TR"` which permits full Turkish
// diacritics. Segment limit 155 chars; 458 chars across 3 segments.
// ─────────────────────────────────────────────────────────────

/**
 * Human-readable error map for Netgsm's numeric response codes.
 * Used purely for logs — the user-facing error stays "sms-failed".
 * Source: Netgsm REST v2 dokümanı.
 */
const NETGSM_ERRORS: Record<string, string> = {
  "20": "mesaj-uzunlugu-asildi-veya-standart-disi-karakter",
  "30": "gecersiz-kullanici-adi-veya-sifre",
  "40": "msgheader-yetkisiz-veya-tanimli-degil",
  "50": "aktif-iys-iletim-izni-yok",
  "60": "kullanici-bulunamadi",
  "70": "hatali-sorgulama-eksik-parametre",
  "80": "sms-gonderim-limiti-asildi",
  "85": "mukerrer-gonderim-sınırı-asildi",
  "100": "sistem-hatasi",
  "101": "duplicate-jobid",
};

async function sendSmsViaNetgsm({
  to,
  message,
  tag,
}: SmsArgs): Promise<SmsResult> {
  const username = process.env.NETGSM_USERNAME;
  const password = process.env.NETGSM_PASSWORD;
  const msgheader = process.env.NETGSM_HEADER;
  if (!username || !password || !msgheader) {
    console.error("[notify:netgsm] missing creds, falling back to mock");
    logToConsole(to, message, tag ?? "sms");
    return { ok: false, error: "netgsm-creds-missing" };
  }

  // 905XXXXXXXXX — digits only, prepend 90 if missing.
  const digits = to.replace(/\D/g, "");
  const gsmno = digits.startsWith("90") ? digits : `90${digits}`;

  const url = "https://api.netgsm.com.tr/sms/rest/v2/send";
  const payload = {
    msgheader,
    encoding: "TR" as const,
    iysfilter: "0", // 0 = ticari değil, 11 = bilgilendirme, 12 = pazarlama. OTP & randevu = bilgilendirme.
    messages: [{ msg: message, no: gsmno }],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Netgsm sometimes returns text/plain even on success — try JSON, fall
    // back to plain "00 <jobid>" parser.
    const raw = await res.text();
    let code = "";
    let jobid = "";
    try {
      const parsed = JSON.parse(raw) as {
        code?: string;
        jobid?: string;
        description?: string;
      };
      code = parsed.code ?? "";
      jobid = parsed.jobid ?? "";
    } catch {
      const parts = raw.trim().split(/\s+/);
      code = parts[0] ?? "";
      jobid = parts[1] ?? "";
    }

    if (code === "00") {
      return { ok: true, providerId: jobid };
    }
    const human = NETGSM_ERRORS[code] ?? "bilinmeyen-hata";
    console.error(`[notify:netgsm] ${code} ${human} raw="${raw.slice(0, 200)}"`);
    return { ok: false, error: `netgsm-${code}-${human}` };
  } catch (e) {
    const err = e instanceof Error ? e.message : "netgsm-network";
    console.error(`[notify:netgsm] ${err}`);
    return { ok: false, error: err };
  }
}

// ─────────────────────────────────────────────────────────────
// Meta WhatsApp Cloud API – template message
// ─────────────────────────────────────────────────────────────
async function sendWhatsAppViaCloudApi({
  to,
  template,
  variables,
}: WaArgs): Promise<SmsResult> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    console.error("[notify:wa] missing creds, falling back to mock");
    return { ok: false, error: "wa-creds-missing" };
  }
  const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
  const parameters = Object.values(variables ?? {}).map((value) => ({
    type: "text",
    text: value,
  }));
  const payload = {
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: template,
      language: { code: "tr" },
      components:
        parameters.length > 0
          ? [{ type: "body", parameters }]
          : undefined,
    },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.text();
      return {
        ok: false,
        error: `wa-${res.status}-${errBody.slice(0, 120)}`,
      };
    }
    const data = (await res.json()) as {
      messages?: Array<{ id?: string }>;
    };
    return { ok: true, providerId: data.messages?.[0]?.id ?? "" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "wa-network",
    };
  }
}
