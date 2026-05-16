"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Clock, Phone, X } from "lucide-react";
import { cancelAppointmentAction } from "@/lib/appointments/actions";
import type { Appointment } from "@/lib/appointments/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "today" | "tomorrow" | "week" | "cancelled";

const FILTERS: Filter[] = ["all", "today", "tomorrow", "week", "cancelled"];

export function AppointmentsList({
  slug,
  appointments,
  locale,
  todayStr,
}: {
  slug: string;
  appointments: Appointment[];
  locale: string;
  todayStr: string;
}) {
  const t = useTranslations("app.appointments");
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tomorrowStr = useMemo(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }, [todayStr]);

  const weekEnd = useMemo(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() + 7);
    return formatDate(d);
  }, [todayStr]);

  const filtered = useMemo(() => {
    const items = appointments.filter((a) => {
      switch (filter) {
        case "today":
          return a.status !== "cancelled" && a.date === todayStr;
        case "tomorrow":
          return a.status !== "cancelled" && a.date === tomorrowStr;
        case "week":
          return (
            a.status !== "cancelled" && a.date >= todayStr && a.date <= weekEnd
          );
        case "all":
          return a.status !== "cancelled";
        case "cancelled":
          return a.status === "cancelled";
      }
    });

    // Chronological ascending — earliest date+time first, latest last.
    return items.sort((a, b) => {
      const aKey = `${a.date}T${a.time}`;
      const bKey = `${b.date}T${b.time}`;
      return aKey.localeCompare(bKey);
    });
  }, [appointments, filter, todayStr, tomorrowStr, weekEnd]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
        day: "numeric",
        month: "short",
        weekday: "short",
      }),
    [locale],
  );

  function fmt(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return dateFormatter.format(new Date(y, m - 1, d));
  }

  function onCancel(id: string) {
    setConfirmingId(null);
    startTransition(async () => {
      await cancelAppointmentAction({ slug, id });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors",
              filter === f
                ? "bg-foreground text-background"
                : "bg-muted/60 text-foreground hover:bg-muted",
            )}
          >
            {t(`filters.${f}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((a) => (
            <li
              key={a.id}
              className={cn(
                "rounded-2xl border border-border bg-card p-4 transition-opacity",
                a.status === "cancelled" && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{fmt(a.date)}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="size-3.5" />
                      {a.time}
                    </span>
                  </div>
                  <div className="font-semibold">{a.customerName}</div>
                  <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    <a
                      href={`tel:+${a.customerPhone}`}
                      className="hover:text-foreground"
                    >
                      +{a.customerPhone.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5")}
                    </a>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {(() => {
                    const isOnline =
                      a.status === "confirmed" && a.source === "online";
                    const isManual =
                      a.status === "confirmed" && a.source === "manual";
                    const labelKey = isManual
                      ? "status.manual"
                      : isOnline
                        ? "status.online"
                        : (`status.${a.status}` as
                            | "status.cancelled"
                            | "status.completed");
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                          isOnline && "bg-primary/15 text-primary",
                          isManual && "bg-amber-100 text-amber-800",
                          a.status === "cancelled" &&
                            "bg-destructive/15 text-destructive",
                          a.status === "completed" &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {t(labelKey)}
                      </span>
                    );
                  })()}
                  {a.status === "confirmed" &&
                    (confirmingId === a.id ? (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => onCancel(a.id)}
                          disabled={pending}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-destructive px-3 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                        >
                          {pending ? t("cancelling") : t("cancel")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="inline-flex h-8 items-center rounded-full bg-muted px-3 text-xs font-medium text-foreground hover:bg-muted/80"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(a.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="size-3" />
                        {t("cancel")}
                      </button>
                    ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
