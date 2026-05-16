"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  data: Array<{ date: string; count: number }>;
  locale: string;
};

/** Lightweight CSS bar chart for the last-30-days visits. */
export function DailyVisitsChart({ data, locale }: Props) {
  const max = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data],
  );
  const total = useMemo(
    () => data.reduce((s, d) => s + d.count, 0),
    [data],
  );

  const dayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
        day: "numeric",
        month: "short",
      }),
    [locale],
  );

  return (
    <div className="space-y-3">
      <div className="flex h-32 items-end gap-1">
        {data.map(({ date, count }, idx) => {
          const heightPct = (count / max) * 100;
          const [y, m, d] = date.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          const isFirst = idx === 0;
          const isLast = idx === data.length - 1;
          const showLabel =
            isFirst || isLast || (idx + 1) % 7 === 0; // every ~week
          return (
            <div
              key={date}
              className="group flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative flex h-full w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-colors",
                    count > 0
                      ? "bg-foreground/80 group-hover:bg-foreground"
                      : "bg-muted",
                  )}
                  style={{ height: `${Math.max(heightPct, count > 0 ? 4 : 2)}%` }}
                  title={`${dayFmt.format(dt)} · ${count}`}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] tabular-nums text-muted-foreground",
                  !showLabel && "opacity-0",
                )}
              >
                {dayFmt.format(dt)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground">
        Toplam: <span className="font-medium tabular-nums">{total}</span>
      </div>
    </div>
  );
}
