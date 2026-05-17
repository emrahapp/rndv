import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Crown,
  Dumbbell,
  Flower2,
  Globe,
  MessageSquare,
  PawPrint,
  QrCode,
  Scissors,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Link as I18nLink } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import {
  formatKurus,
  getActiveProPriceKurus,
  isLaunchPromoActive,
  PRO_PRICE_KURUS,
} from "@/lib/plan/config";
import { cn } from "@/lib/utils";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const proPriceLabel = formatKurus(getActiveProPriceKurus());
  const proFullPriceLabel = formatKurus(PRO_PRICE_KURUS);
  const promoActive = isLaunchPromoActive();

  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");

  return (
    <main className="min-h-screen bg-background">
      {/* ─────────── Top nav ─────────── */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-border bg-background/80 px-3 py-2 backdrop-blur sm:px-5 sm:py-2.5">
          <I18nLink href="/" className="flex items-center pl-1">
            <Logo size={28} />
          </I18nLink>
          <nav className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
            >
              <a href="#fiyat">{t("nav.pricing")}</a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <I18nLink href="/giris">{tNav("login")}</I18nLink>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <I18nLink href="/kayit">{tNav("signup")}</I18nLink>
            </Button>
          </nav>
        </div>
      </header>

      {/* ─────────── Hero ─────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              {t("badge")}
            </span>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[5.25rem]">
              {t("title")}
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("description")}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild variant="primary" size="lg">
                <I18nLink href="/kayit">{t("ctaPrimary")}</I18nLink>
              </Button>
              <Button asChild variant="outline" size="lg">
                <I18nLink href="/u/demo">
                  {t("ctaSecondary")}
                  <ArrowUpRight className="size-4" />
                </I18nLink>
              </Button>
            </div>
          </div>

          {/* Booking card mockup */}
          <div className="rounded-3xl bg-muted/60 p-6 sm:p-10 lg:p-14">
            <div className="mx-auto max-w-sm space-y-3 rounded-2xl bg-background p-3 shadow-sm">
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
                <div className="grid size-10 place-items-center rounded-full bg-foreground text-background">
                  <Calendar className="size-4" />
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium leading-tight">
                    {t("card.service")}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" />
                    {t("card.time")}
                  </div>
                </div>
              </div>
              <Button variant="primary" size="lg" className="w-full gap-1.5">
                <span className="opacity-70">
                  {t("card.cta").split(" ")[0]}
                </span>
                <Logo size={18} showWordmark={false} className="-mx-0.5" />
                <span className="font-semibold">
                  {t("card.cta").split(" ").slice(1).join(" ")}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── Features ─────────── */}
      <section
        id="ozellikler"
        className="mx-auto max-w-6xl px-4 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("features.kicker")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("features.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t("features.subtitle")}
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<MessageSquare className="size-5" />}
            title={t("features.items.sms.title")}
            description={t("features.items.sms.description")}
          />
          <FeatureCard
            icon={<QrCode className="size-5" />}
            title={t("features.items.qr.title")}
            description={t("features.items.qr.description")}
          />
          <FeatureCard
            icon={<BarChart3 className="size-5" />}
            title={t("features.items.reports.title")}
            description={t("features.items.reports.description")}
          />
          <FeatureCard
            icon={<Globe className="size-5" />}
            title={t("features.items.i18n.title")}
            description={t("features.items.i18n.description")}
          />
        </div>
      </section>

      {/* ─────────── How it works ─────────── */}
      <section
        id="nasil"
        className="mx-auto max-w-6xl px-4 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("how.kicker")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("how.title")}
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((key, i) => (
            <div
              key={key}
              className="space-y-3 rounded-2xl border border-border bg-card p-6"
            >
              <div className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="text-lg font-semibold">
                {t(`how.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`how.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── Sectors ─────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("sectors.kicker")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("sectors.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {t("sectors.subtitle")}
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {([
            { Icon: Scissors, color: "bg-primary", key: "barber" },
            { Icon: Sparkles, color: "bg-violet-500", key: "beauty" },
            { Icon: Stethoscope, color: "bg-blue-500", key: "doctor" },
            { Icon: PawPrint, color: "bg-orange-500", key: "vet" },
            { Icon: Dumbbell, color: "bg-pink-500", key: "trainer" },
            { Icon: Flower2, color: "bg-zinc-900", key: "spa" },
          ] as const).map(({ Icon, color, key }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-5 text-center"
            >
              <div
                className={cn(
                  "grid size-12 place-items-center rounded-full text-white",
                  color,
                )}
              >
                <Icon className="size-6" strokeWidth={2.2} />
              </div>
              <span className="text-sm font-medium">
                {t(`sectors.items.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────── Pricing ─────────── */}
      <section
        id="fiyat"
        className="mx-auto max-w-6xl px-4 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("pricing.kicker")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {/* Free */}
          <div className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                {t("pricing.free.name")}
              </span>
              <div className="mt-4">
                <span className="text-4xl font-semibold">₺0</span>
                <span className="ml-1 text-sm text-muted-foreground">
                  /{t("pricing.month")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("pricing.free.tagline")}
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <Perk label={t("pricing.free.perk1")} />
              <Perk label={t("pricing.free.perk2")} />
              <Perk label={t("pricing.free.perk3")} />
            </ul>
            <Button asChild variant="outline" size="lg" className="w-full">
              <I18nLink href="/kayit">{t("pricing.free.cta")}</I18nLink>
            </Button>
          </div>
          {/* Pro */}
          <div className="relative space-y-5 rounded-2xl border-2 border-primary bg-card p-6 sm:p-8">
            {promoActive && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm">
                {t("pricing.pro.launchBadge")}
              </span>
            )}
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
                <Crown className="size-3" />
                {t("pricing.pro.name")}
              </span>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold">{proPriceLabel}</span>
                <span className="text-sm text-muted-foreground">
                  /{t("pricing.month")}
                </span>
                {promoActive && (
                  <span className="text-sm text-muted-foreground line-through">
                    {proFullPriceLabel}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {promoActive
                  ? t("pricing.pro.taglinePromo", {
                      fullPrice: proFullPriceLabel,
                    })
                  : t("pricing.pro.tagline")}
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <Perk highlight label={t("pricing.pro.perk1")} />
              <Perk highlight label={t("pricing.pro.perk2")} />
              <Perk highlight label={t("pricing.pro.perk3")} />
              <Perk highlight label={t("pricing.pro.perk4")} />
              <Perk highlight label={t("pricing.pro.perk5")} />
            </ul>
            <Button asChild variant="primary" size="lg" className="w-full">
              <I18nLink href="/kayit">{t("pricing.pro.cta")}</I18nLink>
            </Button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("pricing.disclaimer")}
        </p>
      </section>

      {/* ─────────── Benefits — "ne kazanırsın" ─────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("benefits.kicker")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("benefits.title")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            {t("benefits.subtitle")}
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: "time",
              icon: <Clock className="size-5" />,
              title: t("benefits.items.time.title"),
              desc: t("benefits.items.time.description"),
            },
            {
              key: "noshow",
              icon: <Calendar className="size-5" />,
              title: t("benefits.items.noshow.title"),
              desc: t("benefits.items.noshow.description"),
            },
            {
              key: "selfserve",
              icon: <Sparkles className="size-5" />,
              title: t("benefits.items.selfserve.title"),
              desc: t("benefits.items.selfserve.description"),
            },
            {
              key: "insight",
              icon: <BarChart3 className="size-5" />,
              title: t("benefits.items.insight.title"),
              desc: t("benefits.items.insight.description"),
            },
          ].map((b) => (
            <div
              key={b.key}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6"
            >
              <div className="grid size-10 place-items-center rounded-full bg-primary/15 text-primary">
                {b.icon}
              </div>
              <div className="text-base font-semibold">{b.title}</div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          {t("benefits.note")}
        </p>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:py-28">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            {t("faq.kicker")}
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("faq.title")}
          </h2>
        </div>
        <div className="mt-10 space-y-2">
          {(["q1", "q2", "q3", "q4", "q5", "q6"] as const).map((q) => (
            <details
              key={q}
              className="group rounded-2xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="text-base font-semibold">
                  {t(`faq.items.${q}.q`)}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`faq.items.${q}.a`)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ─────────── Final CTA ─────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="rounded-3xl bg-foreground px-8 py-12 text-center sm:px-12 sm:py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-medium text-background">
            <Zap className="size-3" />
            {t("finalCta.kicker")}
          </span>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-background sm:text-4xl">
            {t("finalCta.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-background/70">
            {t("finalCta.subtitle")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <I18nLink href="/kayit">
                {t("finalCta.primary")}
                <ArrowUpRight className="size-4" />
              </I18nLink>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="bg-background/10 text-background hover:bg-background/20"
            >
              <a href="#fiyat">{t("finalCta.secondary")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ─────────── Footer ─────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo size={24} />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("footer.tagline")}
            </p>
          </div>
          <FooterCol
            title={t("footer.product")}
            links={[
              { label: t("footer.features"), href: "#ozellikler" },
              { label: t("footer.pricing"), href: "#fiyat" },
            ]}
          />
          <FooterCol
            title={t("footer.account")}
            links={[
              { label: tNav("signup"), href: "/kayit", internal: true },
              { label: tNav("login"), href: "/giris", internal: true },
            ]}
          />
          <FooterCol
            title={t("footer.legal")}
            links={[
              { label: t("footer.terms"), href: "#" },
              { label: t("footer.privacy"), href: "#" },
            ]}
          />
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} rndv</span>
            <span>{t("footer.rights")}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-6">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function Perk({ label, highlight }: { label: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          highlight
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <Check className="size-3" />
      </span>
      <span>{label}</span>
    </li>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ label: string; href: string; internal?: boolean }>;
}) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map(({ label, href, internal }) => (
          <li key={label}>
            {internal ? (
              <I18nLink href={href} className="hover:text-foreground">
                {label}
              </I18nLink>
            ) : (
              <a href={href} className="hover:text-foreground">
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
