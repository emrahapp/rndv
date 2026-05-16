"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { createManualAppointmentAction } from "@/lib/appointments/actions";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NewAppointmentButton() {
  const t = useTranslations("app.appointments.newModal");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createManualAppointmentAction({
        ad_soyad: formData.get("ad_soyad"),
        telefon: formData.get("telefon"),
        date: formData.get("date"),
        time: formData.get("time"),
        notlar: formData.get("notlar") || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="primary" size="default">
          <Plus className="size-4" />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <form action={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m_ad_soyad">{t("ad_soyad")}</Label>
            <Input
              id="m_ad_soyad"
              name="ad_soyad"
              required
              autoComplete="off"
              placeholder={t("ad_soyadPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m_telefon">{t("telefon")}</Label>
            <PhoneInput id="m_telefon" name="telefon" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m_date">{t("date")}</Label>
              <Input
                id="m_date"
                name="date"
                type="date"
                defaultValue={todayStr()}
                required
                className="font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m_time">{t("time")}</Label>
              <Input
                id="m_time"
                name="time"
                type="time"
                step={900}
                required
                className="font-medium tabular-nums"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
