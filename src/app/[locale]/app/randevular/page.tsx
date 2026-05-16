import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/storage";
import { getAppointments } from "@/lib/appointments/registry";
import { AppointmentsList } from "./appointments-list";
import { NewAppointmentButton } from "./new-appointment-button";

export default async function AppointmentsPage({
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

  const t = await getTranslations("app.appointments");

  // Sort: future ascending, then past descending
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const all = (await getAppointments()).slice().sort((a, b) => {
    const aKey = `${a.date}T${a.time}`;
    const bKey = `${b.date}T${b.time}`;
    return aKey.localeCompare(bKey);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <NewAppointmentButton />
      </header>

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarDays className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t("empty")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <AppointmentsList
          slug={business.slug}
          appointments={all}
          locale={locale}
          todayStr={todayStr}
        />
      )}
    </div>
  );
}
