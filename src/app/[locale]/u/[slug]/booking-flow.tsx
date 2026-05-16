"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  bookableDaysInMonth,
  generateSlotsForDate,
} from "@/lib/appointments/slots";
import type { PublicBusiness } from "@/lib/business/types";
import {
  createBookingAction,
  verifyBookingOtpAction,
} from "@/lib/appointments/actions";
import { Avatar } from "@/components/business/avatar";
import { MonthCalendar } from "./calendar";
import { cn } from "@/lib/utils";

export type { PublicBusiness };

type Step = "pick" | "customer" | "otp" | "done";

const RESEND_COOLDOWN = 60;

function maskPhone(p: string) {
  const last = p.slice(-2);
  return `+90 *** *** ** ${last}`;
}

export function BookingFlow({
  business,
  takenByDate,
  locale,
}: {
  business: PublicBusiness;
  takenByDate: Record<string, string[]>;
  locale: string;
}) {
  const t = useTranslations("booking");
  const [step, setStep] = useState<Step>("pick");
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const bookableDays = useMemo(
    () =>
      bookableDaysInMonth(
        // bookableDaysInMonth wants a full Business — pass the public-safe subset
        // augmented with placeholder identity fields.
        { ...business, telefon: "", email: "" },
        monthAnchor.getFullYear(),
        monthAnchor.getMonth(),
        takenByDate,
      ),
    [business, monthAnchor, takenByDate],
  );

  // ALL working-hour slots (lunch already excluded) — taken ones aren't
  // filtered out; we render them as disabled+muted pills instead.
  const slotsForPicked = useMemo(() => {
    if (!pickedDate) return [];
    return generateSlotsForDate(
      { ...business, telefon: "", email: "" },
      pickedDate,
      [],
    );
  }, [business, pickedDate]);

  const takenSet = useMemo(
    () => new Set(takenByDate[pickedDate ?? ""] ?? []),
    [takenByDate, pickedDate],
  );

  useEffect(() => {
    if (step !== "otp" || cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [step, cooldown]);

  // Auto-scroll to the slot grid after the user picks a date — especially
  // helpful on mobile where the slot section drops below the fold.
  const slotsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickedDate) return;
    const id = requestAnimationFrame(() => {
      slotsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(id);
  }, [pickedDate]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
        day: "numeric",
        month: "long",
        weekday: "long",
      }),
    [locale],
  );

  function formatPicked() {
    if (!pickedDate) return "";
    const [y, m, d] = pickedDate.split("-").map(Number);
    return dateFormatter.format(new Date(y, m - 1, d));
  }

  function onPickSlot(time: string) {
    setPickedTime(time);
    setError(null);
    setStep("customer");
  }

  function submitCustomer(formData: FormData) {
    setError(null);
    const rawName = String(formData.get("ad_soyad") ?? "");
    const rawPhone = String(formData.get("telefon") ?? "");
    setName(rawName);
    setPhone(rawPhone);
    startSubmit(async () => {
      const res = await createBookingAction({
        slug: business.slug,
        ad_soyad: rawName,
        telefon: rawPhone,
        date: pickedDate!,
        time: pickedTime!,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPendingId(res.data!.pendingId);
      setCooldown(RESEND_COOLDOWN);
      setCode("");
      setStep("otp");
    });
  }

  function submitOtp(value: string) {
    if (!pendingId) return;
    setError(null);
    startSubmit(async () => {
      const res = await verifyBookingOtpAction({
        pendingId,
        code: value,
      });
      if (!res.ok) {
        setError(res.error);
        setCode("");
        return;
      }
      setStep("done");
    });
  }

  function resend() {
    if (!pickedDate || !pickedTime || cooldown > 0) return;
    setError(null);
    startSubmit(async () => {
      const res = await createBookingAction({
        slug: business.slug,
        ad_soyad: name,
        telefon: phone,
        date: pickedDate,
        time: pickedTime,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPendingId(res.data!.pendingId);
      setCooldown(RESEND_COOLDOWN);
      setCode("");
    });
  }

  function bookAnother() {
    setStep("pick");
    setPickedDate(null);
    setPickedTime(null);
    setName("");
    setPhone("");
    setPendingId(null);
    setCode("");
    setError(null);
  }

  // ───────── Render ─────────
  const businessInitial = (business.ad_soyad?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-3 text-center">
        <Avatar
          type={business.avatarType}
          initial={businessInitial}
          iconName={business.avatarIcon}
          color={business.avatarColor}
          imageUrl={business.avatarUrl}
          size={88}
        />
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {business.ad_soyad}
          </h1>
          <p className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {business.slot_dakika} dk
          </p>
        </div>
      </header>

      {step === "pick" && (
        <div className="space-y-6">
          <MonthCalendar
            monthAnchor={monthAnchor}
            setMonthAnchor={setMonthAnchor}
            bookableDays={bookableDays}
            selectedDate={pickedDate}
            onSelect={(d) => {
              setPickedDate(d);
              setPickedTime(null);
            }}
            locale={locale}
          />

          {pickedDate && (
            <div ref={slotsRef} className="space-y-3 scroll-mt-4">
              <h2 className="text-sm font-medium">
                {t("slot.title", { date: formatPicked() })}
              </h2>
              {slotsForPicked.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("slot.noSlots")}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slotsForPicked.map((time) => {
                    const isTaken = takenSet.has(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isTaken}
                        aria-disabled={isTaken}
                        onClick={() => !isTaken && onPickSlot(time)}
                        className={cn(
                          "h-12 rounded-xl border text-sm font-medium transition-colors",
                          isTaken
                            ? "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground/60 line-through"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === "customer" && pickedDate && pickedTime && (
        <form action={submitCustomer} className="space-y-5">
          <SelectedSlotBanner date={formatPicked()} time={pickedTime} />

          <div className="space-y-1.5">
            <Label htmlFor="ad_soyad">{t("customer.ad_soyad")}</Label>
            <Input
              id="ad_soyad"
              name="ad_soyad"
              required
              defaultValue={name}
              autoComplete="name"
              placeholder={t("customer.ad_soyadPlaceholder")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefon">{t("customer.telefon")}</Label>
            <PhoneInput
              id="telefon"
              name="telefon"
              required
              defaultValue={phone}
            />
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
            disabled={submitting}
          >
            {submitting ? t("customer.submitting") : t("customer.submit")}
          </Button>

          <BackLink onClick={() => setStep("pick")}>
            {t("customer.back")}
          </BackLink>
        </form>
      )}

      {step === "otp" && pickedDate && pickedTime && (
        <div className="space-y-5">
          <SelectedSlotBanner date={formatPicked()} time={pickedTime} />

          <div className="space-y-1.5 text-center">
            <h2 className="text-lg font-semibold">{t("otp.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("otp.subtitle", { phone: maskPhone(phone.replace(/\D/g, "")) })}
            </p>
          </div>

          <OtpInput
            autoFocus
            value={code}
            onChange={setCode}
            onComplete={submitOtp}
            disabled={submitting}
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
            disabled={submitting || code.replace(/\D/g, "").length !== 6}
            onClick={() => submitOtp(code)}
          >
            {submitting ? t("otp.submitting") : t("otp.submit")}
          </Button>

          <div className="text-center text-sm">
            {cooldown > 0 ? (
              <span className="text-muted-foreground">
                {t("otp.resendIn", { seconds: cooldown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={resend}
                disabled={submitting}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t("otp.resend")}
              </button>
            )}
          </div>

          <BackLink onClick={() => setStep("customer")}>
            {t("otp.back")}
          </BackLink>
        </div>
      )}

      {step === "done" && pickedDate && pickedTime && (
        <div className="space-y-6 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("confirmed.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("confirmed.subtitle")}
            </p>
          </div>

          <div className="mx-auto inline-flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-5 py-4">
            <span className="font-medium">{business.ad_soyad}</span>
            <span className="text-sm text-muted-foreground">
              {formatPicked()} · {pickedTime}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("confirmed.cancelHint")}
          </p>

          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={bookAnother}
          >
            {t("confirmed.another")}
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectedSlotBanner({ date, time }: { date: string; time: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-4 py-3 text-sm">
      <div className="font-medium">{date}</div>
      <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3" />
        {time}
      </div>
    </div>
  );
}

function BackLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" />
      {children}
    </button>
  );
}
