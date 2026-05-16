import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fire-and-forget visit log (service-role insert, called from /u/[slug]). */
export async function recordVisit(businessId: string): Promise<void> {
  try {
    const svc = createAdminClient();
    await svc.from("public_link_visits").insert({ business_id: businessId });
  } catch (e) {
    // Analytics shouldn't block the booking page — swallow.
    console.error("[visits] recordVisit failed:", e);
  }
}

export type DailyVisitCount = { date: string; count: number };
export type HourBucket = { hour: number; count: number };
export type WeekdayBucket = { weekday: number; count: number };

export type ReportData = {
  totals: {
    visits30d: number;
    bookings30d: number;
    customers30d: number;
    conversionPct: number;
  };
  dailyVisits: DailyVisitCount[]; // last 30 days, oldest → newest
  popularDays: WeekdayBucket[]; // Mon=1 .. Sun=7
  popularHours: HourBucket[]; // 0-23
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Computes 30-day analytics for the currently-authenticated owner's business. */
export async function getReportData(): Promise<ReportData | null> {
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
  const businessId = biz.id as string;

  const since = new Date(Date.now() - 30 * DAY_MS);
  const sinceIso = since.toISOString();
  const sinceDate = isoDate(since);

  const [visitsRes, bookingsRes, customersRes] = await Promise.all([
    supabase
      .from("public_link_visits")
      .select("visited_at")
      .eq("business_id", businessId)
      .gte("visited_at", sinceIso),
    supabase
      .from("appointments")
      .select("date, time, status, customer_id")
      .eq("business_id", businessId)
      .gte("date", sinceDate),
    supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .gte("created_at", sinceIso),
  ]);

  const visits = (visitsRes.data ?? []) as Array<{ visited_at: string }>;
  const bookings = (bookingsRes.data ?? []) as Array<{
    date: string;
    time: string;
    status: string;
    customer_id: string;
  }>;
  const customers = (customersRes.data ?? []) as Array<{ id: string }>;

  // ─── Daily visits over last 30 days ───
  const dailyMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    dailyMap.set(isoDate(d), 0);
  }
  for (const v of visits) {
    const day = isoDate(new Date(v.visited_at));
    if (dailyMap.has(day)) dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
  }
  const dailyVisits: DailyVisitCount[] = Array.from(dailyMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );

  // ─── Popular hours ───
  const hourMap = new Map<number, number>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const hour = parseInt(b.time.slice(0, 2), 10);
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }
  const popularHours: HourBucket[] = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ─── Popular weekdays (Mon=1 .. Sun=7) ───
  const dayMap = new Map<number, number>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const [y, m, d] = b.date.split("-").map(Number);
    const wd = new Date(y, m - 1, d).getDay(); // 0=Sun .. 6=Sat
    const isoWd = wd === 0 ? 7 : wd; // 1=Mon .. 7=Sun
    dayMap.set(isoWd, (dayMap.get(isoWd) ?? 0) + 1);
  }
  const popularDays: WeekdayBucket[] = [];
  for (let i = 1; i <= 7; i++) {
    popularDays.push({ weekday: i, count: dayMap.get(i) ?? 0 });
  }

  const visits30d = visits.length;
  const bookings30d = bookings.filter((b) => b.status !== "cancelled").length;
  const customers30d = customers.length;
  const conversionPct =
    visits30d > 0 ? Math.round((bookings30d / visits30d) * 100) : 0;

  return {
    totals: { visits30d, bookings30d, customers30d, conversionPct },
    dailyVisits,
    popularDays,
    popularHours,
  };
}
