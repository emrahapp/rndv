"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { updateProfileAction } from "@/lib/business/actions";

type Initial = { ad_soyad: string; telefon: string; email: string };

export function ProfileForm({ initial }: { initial: Initial }) {
  const t = useTranslations("app.settings.profile");
  const tCommon = useTranslations("common");
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateProfileAction({
        ad_soyad: formData.get("ad_soyad"),
        telefon: formData.get("telefon"),
        email: formData.get("email"),
      });
      if (!res.ok) toast.error(res.error);
      else toast.success(tCommon("saved"));
    });
  }

  // strip leading "90" for display so user sees their familiar 5XX...
  const phoneDisplay = initial.telefon.startsWith("90")
    ? initial.telefon.slice(2)
    : initial.telefon;

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ad_soyad">{t("ad_soyad")}</Label>
        <Input
          id="ad_soyad"
          name="ad_soyad"
          defaultValue={initial.ad_soyad}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="telefon">{t("telefon")}</Label>
        <PhoneInput
          id="telefon"
          name="telefon"
          defaultValue={phoneDisplay}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial.email}
          required
        />
      </div>

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
}
