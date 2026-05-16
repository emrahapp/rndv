"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Clock,
  Loader2,
  MessageCircle,
  Phone,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar } from "@/components/business/avatar";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/appointments/types";
import {
  getCustomerDetailAction,
  type CustomerDetail,
} from "./customer-actions";

type Props = {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
};

function fmtPhone(p: string) {
  return `+${p.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5")}`;
}

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  locale,
}: Props) {
  const t = useTranslations("app.customers.detail");
  const tStatus = useTranslations("app.appointments.status");
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDetail(null);
    getCustomerDetailAction(customer.id)
      .then((d) => setDetail(d))
      .finally(() => setLoading(false));
  }, [open, customer.id]);

  const initial = (customer.ad_soyad?.trim()?.[0] ?? "?").toUpperCase();
  const fullPhone = `+${customer.telefon}`;
  const waLink = `https://wa.me/${customer.telefon.replace(/\D/g, "")}`;

  const dateFmt = new Intl.DateTimeFormat(
    locale === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "long", year: "numeric" },
  );
  const shortFmt = new Intl.DateTimeFormat(
    locale === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "short", weekday: "short" },
  );

  function fmtFullDate(iso: string | null) {
    if (!iso) return "—";
    const [date] = iso.split("T");
    const [y, m, d] = date.split("-").map(Number);
    return dateFmt.format(new Date(y, m - 1, d));
  }
  function fmtShortDate(date: string) {
    const [y, m, d] = date.split("-").map(Number);
    return shortFmt.format(new Date(y, m - 1, d));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <Avatar
              type="initial"
              initial={initial}
              color="green"
              size={64}
            />
            <div className="space-y-0.5">
              <SheetTitle className="text-xl">
                {customer.ad_soyad}
              </SheetTitle>
              <a
                href={`tel:${fullPhone}`}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {fmtPhone(customer.telefon)}
              </a>
            </div>
          </div>
        </SheetHeader>

        {/* Quick actions */}
        <div className="flex gap-2">
          <a
            href={`tel:${fullPhone}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Phone className="size-4" />
            {t("call")}
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <MessageCircle className="size-4" />
            {t("whatsapp")}
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label={t("totalBookings")}
            value={customer.totalBookings.toString()}
          />
          <StatCard
            label={t("lastBooking")}
            value={
              customer.lastBookingAt
                ? shortFmt.format(new Date(customer.lastBookingAt))
                : "—"
            }
          />
          <StatCard
            label={t("memberSince")}
            value={shortFmt.format(new Date(customer.createdAt))}
          />
        </div>

        {/* Appointment history */}
        <SheetDescription className="!mt-2 text-xs uppercase tracking-wide text-muted-foreground">
          {t("history")}
        </SheetDescription>

        <div className="flex-1 space-y-2">
          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          )}

          {!loading && detail && detail.appointments.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {t("emptyHistory")}
            </p>
          )}

          {!loading &&
            detail?.appointments.map((a) => {
              const isOnline = a.status === "confirmed" && a.source === "online";
              const isManual = a.status === "confirmed" && a.source === "manual";
              const label = isManual
                ? tStatus("manual")
                : isOnline
                  ? tStatus("online")
                  : a.status === "cancelled"
                    ? tStatus("cancelled")
                    : tStatus("completed");
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-sm",
                    a.status === "cancelled" && "opacity-60",
                  )}
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{fmtShortDate(a.date)}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {a.time}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                      isOnline && "bg-primary/15 text-primary",
                      isManual && "bg-amber-100 text-amber-800",
                      a.status === "cancelled" &&
                        "bg-destructive/15 text-destructive",
                      a.status === "completed" &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
