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
// Netgsm – Turkey SMS (HTTP GET to api.netgsm.com.tr/sms/send/get)
// ─────────────────────────────────────────────────────────────
async function sendSmsViaNetgsm({
  to,
  message,
  tag,
}: SmsArgs): Promise<SmsResult> {
  const usercode = process.env.NETGSM_USERNAME;
  const password = process.env.NETGSM_PASSWORD;
  const msgheader = process.env.NETGSM_HEADER;
  if (!usercode || !password || !msgheader) {
    console.error("[notify:netgsm] missing creds, falling back to mock");
    logToConsole(to, message, tag ?? "sms");
    return { ok: false, error: "netgsm-creds-missing" };
  }
  const url = new URL("https://api.netgsm.com.tr/sms/send/get");
  url.searchParams.set("usercode", usercode);
  url.searchParams.set("password", password);
  url.searchParams.set("gsmno", to.replace(/\D/g, ""));
  url.searchParams.set("msgheader", msgheader);
  url.searchParams.set("message", message);
  url.searchParams.set("dil", "TR");

  try {
    const res = await fetch(url, { method: "GET" });
    const body = await res.text();
    const code = body.trim().split(" ")[0];
    if (code === "00") {
      return {
        ok: true,
        providerId: body.trim().split(" ")[1] ?? "",
      };
    }
    return { ok: false, error: `netgsm-${code}` };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "netgsm-network",
    };
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
