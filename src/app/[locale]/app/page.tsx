import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Clock, Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/storage";
import { getAppointments, getCustomers } from "@/lib/appointments/registry";
import { formatDate } from "@/lib/appointments/slots";
import { getPlanStatus } from "@/lib/plan/enforce";
import { PublicLinkCard } from "@/components/business/public-link-card";
import { PlanUsageBanner } from "@/components/business/plan-usage-banner";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) redirect("/giris");
  const business = await getBusiness();

  const t = await getTranslations("app.dashboard");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = business?.slug
    ? `${appUrl}/u/${business.slug}`
    : `${appUrl}/u/...`;
  const displayName = business?.ad_soyad ?? session.ad_soyad;

  // ─── Stats ───
  const today = formatDate(new Date());
  const weekEnd = formatDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const [appointments, customers, planStatus] = business
    ? await Promise.all([
        getAppointments(),
        getCustomers(),
        getPlanStatus(business.id),
      ])
    : [[], [], null];
  const stats = {
    today: appointments.filter(
      (a) => a.status !== "cancelled" && a.date === today,
    ).length,
    week: appointments.filter(
      (a) => a.status !== "cancelled" && a.date >= today && a.date <= weekEnd,
    ).length,
    customers: customers.length,
  };

  // Show today's appointments inline (up to 3) — ascending by time.
  const todayList = appointments
    .filter((a) => a.status !== "cancelled" && a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title", { name: displayName })}
        </h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {planStatus && <PlanUsageBanner status={planStatus} />}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          label={t("stats.today")}
          value={stats.today}
          icon={<CalendarDays className="size-4" />}
        />
        <StatCard
          label={t("stats.week")}
          value={stats.week}
          icon={<Clock className="size-4" />}
        />
        <StatCard
          label={t("stats.customers")}
          value={stats.customers}
          icon={<Users className="size-4" />}
        />
      </div>

      <PublicLinkCard url={publicUrl} />

      {todayList.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarDays className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t("today")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("todayList")}
          </h2>
          <ul className="space-y-2">
            {todayList.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold">{a.customerName}</div>
                  <div className="text-xs text-muted-foreground">
                    +
                    {a.customerPhone.replace(
                      /^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/,
                      "$1 $2 $3 $4 $5",
                    )}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {a.time}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
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
