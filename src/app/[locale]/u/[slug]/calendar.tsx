"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/appointments/slots";
import { cn } from "@/lib/utils";

type Props = {
  /** First day of the visible month (always day 1). */
  monthAnchor: Date;
  setMonthAnchor: (d: Date) => void;
  /** YYYY-MM-DD dates that have at least one open slot in the visible month. */
  bookableDays: Set<string>;
  selectedDate: string | null;
  onSelect: (dateStr: string) => void;
  locale: string;
};

export function MonthCalendar({
  monthAnchor,
  setMonthAnchor,
  bookableDays,
  selectedDate,
  onSelect,
  locale,
}: Props) {
  const t = useTranslations("booking.calendar");
  const weekdayLabels = t.raw("weekdays") as string[];

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  // Build the 6×7 grid; leading days from previous month, trailing from next.
  const cells = useMemo(() => {
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first: JS getDay returns 0 (Sun) - 6 (Sat). Shift so Mon=0…Sun=6.
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);

    const list: Array<{
      date: Date;
      inMonth: boolean;
      dateStr: string;
      bookable: boolean;
      isToday: boolean;
      isPast: boolean;
      isSelected: boolean;
    }> = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = formatDate(d);
      list.push({
        date: d,
        inMonth: d.getMonth() === month,
        dateStr,
        bookable: bookableDays.has(dateStr),
        isToday: d.getTime() === today.getTime(),
        isPast: d < today,
        isSelected: dateStr === selectedDate,
      });
    }
    return list;
  }, [monthAnchor, bookableDays, selectedDate, today]);

  function shiftMonth(delta: number) {
    setMonthAnchor(
      new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + delta, 1),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label={t("prev")}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-base font-semibold capitalize">
          {monthFmt.format(monthAnchor)}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label={t("next")}
          className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {weekdayLabels.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const disabled = !c.inMonth || c.isPast || !c.bookable;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect(c.dateStr)}
              className={cn(
                "grid aspect-square place-items-center rounded-lg text-sm font-medium transition-colors",
                "disabled:cursor-not-allowed",
                !c.inMonth && "opacity-0",
                c.inMonth && disabled && "text-muted-foreground/60",
                c.inMonth && !disabled && !c.isSelected &&
                  "bg-muted/60 text-foreground hover:bg-muted",
                c.isSelected && "bg-foreground text-background",
                c.isToday && !c.isSelected && "ring-1 ring-foreground",
              )}
            >
              {c.date.getDate()}
            </button>
          );
        })}
      </div>

      {Array.from(bookableDays).filter((d) => {
        const dt = new Date(d);
        return dt.getMonth() === monthAnchor.getMonth();
      }).length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {t("noBookable")}
        </p>
      )}
    </div>
  );
}
