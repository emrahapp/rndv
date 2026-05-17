"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What's being bought — Pro subscription, SMS bundle, etc. */
  title: string;
  description: string;
  /** Amount string with currency, e.g. "₺199" or "₺49". */
  amount: string;
  amountSuffix?: string; // " /ay" or " · 100 SMS"
  /** Async server action; resolves with {ok}. */
  onConfirm: () => Promise<{ ok: boolean; error?: string }>;
  /** Called after successful purchase finishes. */
  onSuccess?: () => void;
};

function formatCard(v: string): string {
  return (
    v
      .replace(/\D/g, "")
      .slice(0, 16)
      .match(/.{1,4}/g)
      ?.join(" ") ?? ""
  );
}
function formatExpiry(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}

export function MockCheckoutDialog({
  open,
  onOpenChange,
  title,
  description,
  amount,
  amountSuffix,
  onConfirm,
  onSuccess,
}: Props) {
  const t = useTranslations("payment");

  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"form" | "processing" | "success">("form");
  const [pending, startTransition] = useTransition();

  // Reset on close
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStage("form");
        setError(null);
        setCard("");
        setName("");
        setExpiry("");
        setCvc("");
      }, 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const cardDigits = card.replace(/\D/g, "");
  const formValid =
    cardDigits.length >= 14 &&
    name.trim().length >= 3 &&
    /^\d{2}\/\d{2}$/.test(expiry) &&
    /^\d{3,4}$/.test(cvc);

  function submit() {
    if (!formValid || stage !== "form") return;
    setError(null);
    setStage("processing");
    startTransition(async () => {
      // Simulate 1.4s payment-gateway latency
      await new Promise((r) => setTimeout(r, 1400));
      const res = await onConfirm();
      if (!res.ok) {
        setError(res.error ?? "Ödeme başarısız.");
        setStage("form");
        return;
      }
      setStage("success");
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1600);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (stage === "processing") return; // don't allow close mid-flight
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Amount banner */}
        <div className="flex items-baseline justify-between rounded-xl bg-muted px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {t("amount")}
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {amount}
            {amountSuffix && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {amountSuffix}
              </span>
            )}
          </span>
        </div>

        {stage === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-7" />
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{t("successTitle")}</div>
              <div className="text-sm text-muted-foreground">
                {t("successSubtitle")}
              </div>
            </div>
          </div>
        ) : stage === "processing" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-7 animate-spin text-foreground" />
            <div className="text-sm text-muted-foreground">
              {t("processing")}
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cc-num">{t("cardNumber")}</Label>
                <div className="relative">
                  <Input
                    id="cc-num"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="4321 1234 1234 1234"
                    value={card}
                    onChange={(e) => setCard(formatCard(e.target.value))}
                    maxLength={19}
                    className="pr-10 tracking-wider tabular-nums"
                  />
                  <CreditCard className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cc-name">{t("cardHolder")}</Label>
                <Input
                  id="cc-name"
                  autoComplete="cc-name"
                  placeholder="ADI SOYADI"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  className="uppercase tracking-wide"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-exp">{t("expiry")}</Label>
                  <Input
                    id="cc-exp"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-cvc">{t("cvc")}</Label>
                  <div className="relative">
                    <Input
                      id="cc-cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="•••"
                      value={cvc}
                      onChange={(e) =>
                        setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      maxLength={4}
                      className="tabular-nums"
                    />
                    <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>{t("secureHint")}</span>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!formValid || pending}
              onClick={submit}
            >
              <Lock className="size-4" />
              {t("payCta", { amount })}
            </Button>

            <p
              className={cn(
                "text-center text-[11px] uppercase tracking-wide",
                "text-muted-foreground/70",
              )}
            >
              {t("testMode")}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
