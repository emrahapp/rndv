"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link as I18nLink } from "@/i18n/navigation";
import { cancelBookingByTokenAction } from "@/lib/appointments/actions";

export function CancelForm({ token, slug }: { token: string; slug: string }) {
  const t = useTranslations("cancel");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await cancelBookingByTokenAction(token);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <div className="space-y-5">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold">{t("done")}</h2>
          <p className="text-sm text-muted-foreground">{t("doneHint")}</p>
        </div>
        <Button asChild variant="primary">
          <I18nLink href={`/u/${slug}`}>{t("newBooking")}</I18nLink>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={onConfirm}
      >
        {pending ? t("cancelling") : t("confirm")}
      </Button>
      <Button asChild variant="outline" size="lg" className="w-full">
        <I18nLink href={`/u/${slug}`}>{t("keep")}</I18nLink>
      </Button>
    </div>
  );
}
