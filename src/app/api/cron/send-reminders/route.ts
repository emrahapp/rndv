import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBusinessSms } from "@/lib/notify";
import { sms } from "@/lib/notify/templates";

/**
 * Daily reminder cron.
 *
 *   /api/cron/send-reminders
 *
 * Finds confirmed appointments scheduled for "tomorrow" (Istanbul time) that
 * haven't had a reminder yet, and texts each customer. Marks `reminder_sent`
 * so we never double-send.
 *
 * Vercel Cron hits this with `Authorization: Bearer ${CRON_SECRET}`. The
 * endpoint also accepts a `?key=` query param for easy curl testing in dev.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tomorrowDateInIstanbul(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  // sv-SE produces ISO-shaped "YYYY-MM-DD"
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

type AppointmentRow = {
  id: string;
  business_id: string;
  date: string;
  time: string;
  cancel_token: string;
  customers: { ad_soyad: string; telefon: string } | null;
  businesses: { ad_soyad: string } | null;
};

export async function GET(req: NextRequest) {
  // Auth: either Vercel's automatic Bearer header or ?key= query for testing.
  const expectedSecret = process.env.CRON_SECRET ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const queryKey = req.nextUrl.searchParams.get("key") ?? "";
  const authed =
    expectedSecret.length > 0 &&
    (authHeader === `Bearer ${expectedSecret}` || queryKey === expectedSecret);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const date = tomorrowDateInIstanbul();
  const svc = createAdminClient();

  const { data, error } = await svc
    .from("appointments")
    .select(
      "id, business_id, date, time, cancel_token, customers ( ad_soyad, telefon ), businesses ( ad_soyad )",
    )
    .eq("date", date)
    .eq("status", "confirmed")
    .eq("reminder_sent", false);

  if (error) {
    return NextResponse.json(
      { error: error.message, date },
      { status: 500 },
    );
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, date });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://rndv.click";

  let sent = 0;
  let skipped = 0;
  for (const row of data as unknown as AppointmentRow[]) {
    const phone = row.customers?.telefon;
    const businessName = row.businesses?.ad_soyad ?? "";
    if (!phone) {
      skipped++;
      continue;
    }

    const result = await sendBusinessSms({
      businessId: row.business_id,
      to: phone,
      tag: "reminder-24h",
      message: sms.reminder24h({
        businessName,
        date: row.date,
        time: row.time,
        cancelUrl: `${appUrl}/iptal/${row.cancel_token}`,
      }),
    });

    if (result.ok) {
      await svc
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", row.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ sent, skipped, date, total: data.length });
}
