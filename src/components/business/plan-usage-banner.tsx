import { Crown, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link as I18nLink } from "@/i18n/navigation";
import type { PlanStatus } from "@/lib/plan/enforce";
import { cn } from "@/lib/utils";

/** Compact "you're on Free, X/20 bookings used this month" banner, with
 *  an Upgrade CTA. Pro plan shows SMS quota instead. */
export async function PlanUsageBanner({ status }: { status: PlanStatus }) {
  const t = await getTranslations("app.plan");

  if (status.plan === "free") {
    const used = status.monthlyBookings;
    const limit = status.bookingLimit;
    const pct = Math.min(100, Math.round((used / limit) * 100));
    const near = pct >= 80;
    const full = used >= limit;

    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between",
          full
            ? "border-destructive/40"
            : near
              ? "border-amber-300/60"
              : "border-border",
        )}
      >
        <div className="flex-1 space-y-1.5">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              <Zap className="size-3" />
              {t("free")}
            </span>
            <span className="text-sm font-medium tabular-nums">
              {t("bookingsUsed", { used, limit })}
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all",
                full
                  ? "bg-destructive"
                  : near
                    ? "bg-amber-500"
                    : "bg-foreground/80",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {full && (
            <p className="text-xs text-destructive">{t("freeFullHint")}</p>
          )}
        </div>
        <Button asChild variant="primary" size="default">
          <I18nLink href="/app/ayarlar#abonelik">
            <Crown className="size-4" />
            {t("upgradeCta")}
          </I18nLink>
        </Button>
      </div>
    );
  }

  // Pro plan — show SMS quota
  const used = status.monthlySmsSent;
  const included = status.smsIncludedLimit;
  const pct = Math.min(100, Math.round((used / Math.max(1, included)) * 100));
  const totalRemaining = status.smsRemaining;
  const usingBundle = used >= included;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 space-y-1.5">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            <Crown className="size-3" />
            {t("pro")}
          </span>
          <span className="text-sm font-medium tabular-nums">
            {usingBundle
              ? t("smsBundleUsage", {
                  remaining: totalRemaining,
                  credits: status.smsBundleCredits,
                })
              : t("smsUsed", { used, included })}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {status.proUntil && (
          <p className="text-xs text-muted-foreground">
            {t("proUntil", {
              date: new Date(status.proUntil).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
              }),
            })}
          </p>
        )}
      </div>
      <Button asChild variant="outline" size="default">
        <I18nLink href="/app/ayarlar#abonelik">{t("manageCta")}</I18nLink>
      </Button>
    </div>
  );
}
