"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Calendar,
  Check,
  Crown,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { MockCheckoutDialog } from "@/components/payment/mock-checkout-dialog";
import {
  downgradeAction,
  mockPurchaseBundleAction,
  mockPurchaseProAction,
} from "@/lib/plan/actions";
import type { PlanStatus } from "@/lib/plan/enforce";
import { cn } from "@/lib/utils";

const BUNDLES = [
  { count: 100, name: "Mini", price: "₺49" },
  { count: 300, name: "Standart", price: "₺119" },
  { count: 1000, name: "Yoğun", price: "₺299" },
] as const;

type BundleCount = (typeof BUNDLES)[number]["count"];

export function SubscriptionSection({
  status,
  proPriceLabel,
  proFullPriceLabel,
  launchPromoActive,
}: {
  status: PlanStatus;
  proPriceLabel: string; // "₺99" while launch promo, else "₺199"
  proFullPriceLabel: string; // always "₺199" — shown crossed out during promo
  launchPromoActive: boolean;
}) {
  const t = useTranslations("app.settings.subscription");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Dialog state: which product the user is buying right now
  const [proCheckoutOpen, setProCheckoutOpen] = useState(false);
  const [bundleCheckout, setBundleCheckout] = useState<BundleCount | null>(
    null,
  );

  const isPro = status.plan === "pro";

  function onDowngrade() {
    setError(null);
    startTransition(async () => {
      const res = await downgradeAction();
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  const bundleByCount = (count: BundleCount) =>
    BUNDLES.find((b) => b.count === count)!;

  return (
    <div id="abonelik" className="space-y-5">
      <div
        className={cn(
          "rounded-2xl border bg-card p-5 sm:p-6",
          isPro ? "border-primary/50" : "border-border",
        )}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              isPro ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
            )}
          >
            {isPro ? (
              <>
                <Crown className="size-3.5" />
                Pro
              </>
            ) : (
              <>Free</>
            )}
          </span>
          {isPro && status.proUntil && (
            <span className="text-xs text-muted-foreground">
              {t("activeUntil", {
                date: new Date(status.proUntil).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              })}
            </span>
          )}
        </div>

        {/* Usage */}
        {!isPro ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">
                {t("bookingsThisMonth")}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {status.monthlyBookings} / {status.bookingLimit}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground/80 transition-all"
                style={{
                  width: `${Math.min(100, (status.monthlyBookings / status.bookingLimit) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{t("smsThisMonth")}</span>
              <span className="text-sm font-semibold tabular-nums">
                {status.monthlySmsSent} / {status.smsIncludedLimit}
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(100, (status.monthlySmsSent / Math.max(1, status.smsIncludedLimit)) * 100)}%`,
                }}
              />
            </div>
            {status.smsBundleCredits > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("bundleCredits", { count: status.smsBundleCredits })}
              </p>
            )}
          </div>
        )}

        {/* Pro features + price (only on Free) */}
        {!isPro && (
          <>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">{proPriceLabel}</span>
              <span className="text-sm text-muted-foreground">/ay</span>
              {launchPromoActive && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {proFullPriceLabel}
                  </span>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Lansman
                  </span>
                </>
              )}
            </div>
            {launchPromoActive && (
              <p className="mt-1 text-xs text-muted-foreground">
                İlk 100 üyemize ilk 12 ay özel — sonra {proFullPriceLabel}/ay.
              </p>
            )}
            <ul className="mt-5 space-y-2 text-sm">
              <Feature
                icon={<Calendar className="size-4" />}
                label={t("perks.unlimitedBookings")}
              />
              <Feature
                icon={<MessageSquare className="size-4" />}
                label={t("perks.smsIncluded")}
              />
              <Feature
                icon={<Sparkles className="size-4" />}
                label={t("perks.whatsapp")}
              />
              <Feature
                icon={<BarChart3 className="size-4" />}
                label={t("perks.reports")}
              />
            </ul>
          </>
        )}

        {/* CTA */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!isPro ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => setProCheckoutOpen(true)}
            >
              <Crown className="size-4" />
              {t("upgradeCta")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={onDowngrade}
              disabled={pending}
            >
              {t("downgradeCta")}
            </Button>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* SMS Bundles — Pro only */}
      {isPro && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{t("bundles.title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("bundles.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BUNDLES.map((b) => (
              <button
                key={b.count}
                type="button"
                onClick={() => setBundleCheckout(b.count)}
                className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:bg-muted"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {b.name}
                </span>
                <span className="text-2xl font-semibold">{b.price}</span>
                <span className="text-sm text-muted-foreground">
                  {b.count} SMS
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("bundles.hint")}</p>
        </div>
      )}

      {/* Pro checkout dialog */}
      <MockCheckoutDialog
        open={proCheckoutOpen}
        onOpenChange={setProCheckoutOpen}
        title={t("proCheckout.title")}
        description={
          launchPromoActive
            ? t("proCheckout.descriptionPromo", { fullPrice: proFullPriceLabel })
            : t("proCheckout.description")
        }
        amount={proPriceLabel}
        amountSuffix={t("proCheckout.suffix")}
        onConfirm={mockPurchaseProAction}
        onSuccess={() => router.refresh()}
      />

      {/* SMS bundle checkout dialog */}
      {bundleCheckout !== null && (
        <MockCheckoutDialog
          open={bundleCheckout !== null}
          onOpenChange={(v) => {
            if (!v) setBundleCheckout(null);
          }}
          title={t("bundleCheckout.title")}
          description={t("bundleCheckout.description", {
            count: bundleCheckout,
          })}
          amount={bundleByCount(bundleCheckout).price}
          amountSuffix={`· ${bundleCheckout} SMS`}
          onConfirm={() => mockPurchaseBundleAction(bundleCheckout)}
          onSuccess={() => {
            setBundleCheckout(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2 text-foreground">
      <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
        <Check className="size-3" />
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </span>
    </li>
  );
}
