"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateHoursAction } from "@/lib/business/actions";
import {
  DAYS,
  SLOT_OPTIONS,
  type Day,
  type SlotMinutes,
  type WorkingHours,
} from "@/lib/business/types";

type Initial = {
  calisma_saatleri: WorkingHours;
  ogle_arasi: [string, string] | null;
  slot_dakika: SlotMinutes;
};

const DEFAULT_OPEN: [string, string] = ["09:00", "18:00"];

export function HoursForm({ initial }: { initial: Initial }) {
  const t = useTranslations("app.settings.hours");
  const tCommon = useTranslations("common");

  const [hours, setHours] = useState<WorkingHours>(initial.calisma_saatleri);
  const [lunch, setLunch] = useState<[string, string] | null>(
    initial.ogle_arasi,
  );
  const [slot, setSlot] = useState<SlotMinutes>(initial.slot_dakika);
  const [pending, startTransition] = useTransition();

  function setDayOpen(day: Day, open: boolean) {
    setHours((prev) => ({ ...prev, [day]: open ? DEFAULT_OPEN : null }));
  }
  function setDayTime(day: Day, idx: 0 | 1, value: string) {
    setHours((prev) => {
      const cur = prev[day];
      if (!cur) return prev;
      const next: [string, string] = [...cur] as [string, string];
      next[idx] = value;
      return { ...prev, [day]: next };
    });
  }

  function onSubmit() {
    startTransition(async () => {
      const res = await updateHoursAction({
        calisma_saatleri: hours,
        ogle_arasi: lunch,
        slot_dakika: slot,
      });
      if (!res.ok) toast.error(res.error);
      else toast.success(tCommon("saved"));
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      {/* Slot length */}
      <div className="space-y-1.5">
        <label
          htmlFor="slot"
          className="text-sm font-medium leading-none text-foreground"
        >
          {t("slot")}
        </label>
        <div className="flex flex-wrap gap-2">
          {SLOT_OPTIONS.map((opt) => {
            const active = slot === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSlot(opt)}
                className={[
                  "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "border border-border bg-background text-foreground hover:bg-muted",
                ].join(" ")}
              >
                {opt} {t("slotUnit")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-day editor */}
      <div className="divide-y divide-border">
        {DAYS.map((day) => {
          const dayHours = hours[day];
          const isOpen = dayHours !== null;
          return (
            <div
              key={day}
              className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap"
            >
              <div className="w-24 shrink-0 text-sm font-medium">
                {t(`days.${day}`)}
              </div>
              <Switch
                checked={isOpen}
                onCheckedChange={(v) => setDayOpen(day, v)}
                aria-label={t(`days.${day}`)}
              />
              {isOpen && dayHours ? (
                <div className="flex flex-1 items-center gap-2">
                  <TimeInput
                    value={dayHours[0]}
                    onChange={(v) => setDayTime(day, 0, v)}
                  />
                  <span className="text-muted-foreground">—</span>
                  <TimeInput
                    value={dayHours[1]}
                    onChange={(v) => setDayTime(day, 1, v)}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {t("dayClosed")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Lunch */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium">{t("lunchTitle")}</div>
          <Switch
            checked={lunch !== null}
            onCheckedChange={(v) => setLunch(v ? ["12:30", "13:30"] : null)}
            aria-label={t("lunchTitle")}
          />
          {lunch ? (
            <div className="flex flex-1 items-center gap-2">
              <TimeInput
                value={lunch[0]}
                onChange={(v) => setLunch([v, lunch[1]])}
              />
              <span className="text-muted-foreground">—</span>
              <TimeInput
                value={lunch[1]}
                onChange={(v) => setLunch([lunch[0], v])}
              />
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {t("lunchOff")}
            </span>
          )}
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-input bg-background px-3 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-foreground"
    />
  );
}
