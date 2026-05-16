"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { resendOtpAction, verifyOtpAction } from "@/lib/auth/actions";

const RESEND_COOLDOWN = 60;

export function OtpForm() {
  const t = useTranslations("auth.otp");
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, startVerify] = useTransition();
  const [resending, startResend] = useTransition();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  function submit(value: string) {
    setError(null);
    startVerify(async () => {
      const res = await verifyOtpAction(value);
      if (!res.ok) {
        setError(res.error);
        setCode("");
      } else if (res.redirectTo) {
        router.push(res.redirectTo);
      }
    });
  }

  function onResend() {
    setError(null);
    startResend(async () => {
      const res = await resendOtpAction();
      if (!res.ok) setError(res.error);
      else {
        setCooldown(RESEND_COOLDOWN);
        setCode("");
      }
    });
  }

  return (
    <div className="space-y-5">
      <OtpInput
        autoFocus
        value={code}
        onChange={setCode}
        onComplete={submit}
        disabled={verifying}
      />

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={verifying || code.replace(/\D/g, "").length !== 6}
        onClick={() => submit(code)}
      >
        {verifying ? t("submitting") : t("submit")}
      </Button>

      <div className="text-center text-sm">
        {cooldown > 0 ? (
          <span className="text-muted-foreground">
            {t("resendIn", { seconds: cooldown })}
          </span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50"
          >
            {resending ? t("resending") : t("resend")}
          </button>
        )}
      </div>
    </div>
  );
}
