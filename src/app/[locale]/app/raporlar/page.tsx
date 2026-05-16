import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BarChart3, CalendarCheck, Users, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/storage";
import { getReportData } from "@/lib/db/visits";
import { DailyVisitsChart } from "./daily-visits-chart";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) redirect("/giris");
  const business = await getBusiness();
  if (!business) redirect("/giris");

  const t = await getTranslations("app.reports");
  const report = await getReportData();
  if (!report) redirect("/giris");

  const { totals, dailyVisits, popularDays, popularHours } = report;

  // Localised weekday names — Mon=1 ... Sun=7
  const weekdayLong = new Intl.DateTimeFormat(
    locale === "tr" ? "tr-TR" : "en-US",
    { weekday: "long" },
  );
  // Build an array of {key:1..7, label:"Pazartesi" ...}
  const dayLabels: string[] = [];
  // ISO Monday corresponds to Date 2024-01-01 (which is a Monday)
  for (let i = 0; i < 7; i++) {
    dayLabels.push(weekdayLong.format(new Date(2024, 0, 1 + i)));
  }

  const popularDaysMax = Math.max(1, ...popularDays.map((d) => d.count));
  const popularHoursMax = Math.max(1, ...popularHours.map((h) => h.count));

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t("stats.visits")}
          value={totals.visits30d}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label={t("stats.bookings")}
          value={totals.bookings30d}
          icon={<CalendarCheck className="size-4" />}
        />
        <StatCard
          label={t("stats.conversion")}
          value={`${totals.conversionPct}%`}
          icon={<BarChart3 className="size-4" />}
        />
        <StatCard
          label={t("stats.customers")}
          value={totals.customers30d}
          icon={<Users className="size-4" />}
        />
      </div>

      {/* Daily visits chart */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{t("dailyVisits.title")}</h2>
          <span className="text-xs text-muted-foreground">
            {t("dailyVisits.range")}
          </span>
        </div>
        <DailyVisitsChart data={dailyVisits} locale={locale} />
      </section>

      {/* Popular days + hours */}
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("popularDays")}</h2>
          {totals.bookings30d === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {popularDays.map((d) => {
                const pct = (d.count / popularDaysMax) * 100;
                return (
                  <li key={d.weekday} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium capitalize">
                      {dayLabels[d.weekday - 1]}
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
                      {d.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{t("popularHours")}</h2>
          {popularHours.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {popularHours.map((h) => {
                const pct = (h.count / popularHoursMax) * 100;
                return (
                  <li key={h.hour} className="flex items-center gap-3">
                    <span className="w-16 text-sm font-medium tabular-nums">
                      {String(h.hour).padStart(2, "0")}:00
                    </span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
                      {h.count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl">
        {value}
      </div>
    </div>
  );
}
