import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Link as I18nLink } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { findAppointmentByToken } from "@/lib/db/appointments";
import { getBusinessForNotifyById } from "@/lib/db/businesses";
import { CancelForm } from "./cancel-form";

export default async function CancelPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const appointment = await findAppointmentByToken(token);
  const t = await getTranslations("cancel");

  if (!appointment) {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("notFound")}
        </h1>
        <Button asChild variant="outline">
          <I18nLink href="/">rndv.click</I18nLink>
        </Button>
      </Centered>
    );
  }

  const business = await getBusinessForNotifyById(appointment.business_id);

  if (appointment.status === "cancelled") {
    return (
      <Centered>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("alreadyCancelled")}
        </h1>
        {business && (
          <Button asChild variant="primary">
            <I18nLink href={`/u/${business.slug}`}>{t("newBooking")}</I18nLink>
          </Button>
        )}
      </Centered>
    );
  }

  const dateFmt = new Intl.DateTimeFormat(
    locale === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "long", weekday: "long" },
  );
  const [y, m, d] = appointment.date.split("-").map(Number);
  const dateLabel = dateFmt.format(new Date(y, m - 1, d));

  return (
    <Centered>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-1 rounded-2xl border border-border bg-card p-5 text-center">
        {business && (
          <div className="font-semibold">{business.ad_soyad}</div>
        )}
        <div className="text-sm text-muted-foreground">
          {dateLabel} · {appointment.time}
        </div>
      </div>

      <CancelForm token={token} slug={business?.slug ?? ""} />
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-4 pt-6 sm:pt-8">
        <I18nLink href="/" className="inline-flex">
          <Logo size={26} />
        </I18nLink>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm space-y-5 text-center">{children}</div>
      </main>
    </div>
  );
}
