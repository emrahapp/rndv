"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Customer } from "@/lib/appointments/types";
import { CustomerDetailSheet } from "./customer-detail-sheet";

function fmtPhone(p: string) {
  return `+${p.replace(/^(\d{2})(\d{3})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4 $5")}`;
}

export function CustomersList({
  customers,
  locale,
}: {
  customers: Customer[];
  locale: string;
}) {
  const [openCustomer, setOpenCustomer] = useState<Customer | null>(null);

  const dateFmt = new Intl.DateTimeFormat(
    locale === "tr" ? "tr-TR" : "en-US",
    { day: "numeric", month: "short", year: "numeric" },
  );

  function fmtLast(iso: string | null) {
    if (!iso) return "—";
    const [date] = iso.split("T");
    const [y, m, d] = date.split("-").map(Number);
    return dateFmt.format(new Date(y, m - 1, d));
  }

  return (
    <>
      <ul className="space-y-2">
        {customers.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setOpenCustomer(c)}
              className="group flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/60"
            >
              <div className="space-y-0.5">
                <div className="font-semibold">{c.ad_soyad}</div>
                <span className="text-sm text-muted-foreground">
                  {fmtPhone(c.telefon)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs text-muted-foreground">
                  <div>{c.totalBookings} randevu</div>
                  <div>{fmtLast(c.lastBookingAt)}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          </li>
        ))}
      </ul>

      {openCustomer && (
        <CustomerDetailSheet
          customer={openCustomer}
          open={openCustomer !== null}
          onOpenChange={(open) => {
            if (!open) setOpenCustomer(null);
          }}
          locale={locale}
        />
      )}
    </>
  );
}
