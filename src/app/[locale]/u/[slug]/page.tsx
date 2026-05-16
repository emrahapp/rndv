import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Link as I18nLink } from "@/i18n/navigation";
import { getPublicBusinessBySlug } from "@/lib/db/businesses";
import { getTakenByDateForSlug } from "@/lib/db/appointments";
import { recordVisit } from "@/lib/db/visits";
import { BookingFlow } from "./booking-flow";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const business = await getPublicBusinessBySlug(slug);
  if (!business) notFound();

  // Analytics — best-effort, never blocks the page.
  void recordVisit(business.id);

  const takenByDate = await getTakenByDateForSlug(slug);

  const t = await getTranslations("booking");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Logo size={28} />
          </div>
          <span className="text-xs text-muted-foreground">
            {t("header.subtitle")}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
        <BookingFlow
          business={business}
          takenByDate={takenByDate}
          locale={locale}
        />
      </main>

      <footer className="border-t border-border py-4">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-2 px-4 text-xs text-muted-foreground">
          <span>{t("powered")}</span>
          <I18nLink
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline underline-offset-4"
          >
            <Logo size={14} />
          </I18nLink>
        </div>
      </footer>
    </div>
  );
}
