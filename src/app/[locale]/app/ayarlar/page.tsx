import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/storage";
import { getPlanStatus } from "@/lib/plan/enforce";
import {
  formatKurus,
  getActiveProPriceKurus,
  isLaunchPromoActive,
  PRO_PRICE_KURUS,
} from "@/lib/plan/config";
import { ProfileForm } from "./profile-form";
import { SlugForm } from "./slug-form";
import { HoursForm } from "./hours-form";
import { SubscriptionSection } from "./subscription-section";

export default async function SettingsPage({
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

  const t = await getTranslations("app.settings");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const slugBase = `${appUrl.replace(/^https?:\/\//, "")}/u/`;
  const planStatus = await getPlanStatus(business.id);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      <Section title={t("profile.title")} subtitle={t("profile.subtitle")}>
        <ProfileForm
          initial={{
            ad_soyad: business.ad_soyad,
            telefon: business.telefon,
            email: business.email,
          }}
        />
      </Section>

      <Section title={t("slug.title")} subtitle={t("slug.subtitle")}>
        <SlugForm initialSlug={business.slug} slugBase={slugBase} />
      </Section>

      <Section title={t("hours.title")} subtitle={t("hours.subtitle")}>
        <HoursForm
          initial={{
            calisma_saatleri: business.calisma_saatleri,
            ogle_arasi: business.ogle_arasi,
            slot_dakika: business.slot_dakika,
          }}
        />
      </Section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("subscription.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("subscription.subtitle")}
          </p>
        </div>
        <SubscriptionSection
          status={planStatus}
          proPriceLabel={formatKurus(getActiveProPriceKurus())}
          proFullPriceLabel={formatKurus(PRO_PRICE_KURUS)}
          launchPromoActive={isLaunchPromoActive()}
        />
      </section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}
