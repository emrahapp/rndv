"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { signupAction } from "@/lib/auth/actions";

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await signupAction({
        ad_soyad: formData.get("ad_soyad"),
        telefon: formData.get("telefon"),
        email: formData.get("email"),
        parola: formData.get("parola"),
      });
      if (!res.ok) {
        setError(res.error);
      } else if (res.redirectTo) {
        router.push(res.redirectTo);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ad_soyad">{t("ad_soyad")}</Label>
        <Input
          id="ad_soyad"
          name="ad_soyad"
          autoComplete="name"
          placeholder={t("ad_soyadPlaceholder")}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefon">{t("telefon")}</Label>
        <PhoneInput
          id="telefon"
          name="telefon"
          required
          placeholder={t("telefonPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("telefonHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="parola">{t("parola")}</Label>
        <Input
          id="parola"
          name="parola"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
        <p className="text-xs text-muted-foreground">{t("parolaHint")}</p>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={pending}
      >
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
