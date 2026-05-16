"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** "5551234567" → "555 123 45 67" */
export function formatTrPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 8));
  if (digits.length > 8) parts.push(digits.slice(8, 10));
  return parts.join(" ");
}

function TrFlag({ className }: { className?: string }) {
  // Minimal Turkish flag — red field, white crescent, white star.
  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="30" height="20" rx="3" fill="#e30a17" />
      <circle cx="11.2" cy="10" r="4" fill="#fff" />
      <circle cx="12.4" cy="10" r="3.2" fill="#e30a17" />
      {/* Simple 5-point star approximation */}
      <polygon
        points="17.6,10 19.4,9.4 18.3,11 19.4,12.6 17.6,12 15.8,12.6 16.9,11 15.8,9.4"
        fill="#fff"
      />
    </svg>
  );
}

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "maxLength" | "onChange" | "value" | "defaultValue"
> & {
  defaultValue?: string;
  value?: string;
  onChange?: (formatted: string) => void;
};

/**
 * +90 Türkiye telefon girişi.
 *  - Sadece rakam kabul eder
 *  - Otomatik "XXX XXX XX XX" formatlar
 *  - 10 haneden fazlasını ister yapıştır, ister yaz, kırpar
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput(
    {
      className,
      defaultValue,
      value,
      onChange,
      placeholder = "5XX XXX XX XX",
      name,
      id,
      required,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined;
    const [internal, setInternal] = React.useState(() =>
      formatTrPhone(defaultValue ?? ""),
    );
    const display = isControlled ? formatTrPhone(value ?? "") : internal;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const next = formatTrPhone(e.target.value);
      if (!isControlled) setInternal(next);
      onChange?.(next);
    }

    return (
      <div className="flex gap-2">
        <span className="inline-flex h-12 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 text-sm font-medium text-muted-foreground">
          <TrFlag className="h-4 w-[22px] shrink-0 rounded-[3px]" />
          +90
        </span>
        <input
          ref={ref}
          id={id}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          maxLength={13}
          placeholder={placeholder}
          required={required}
          value={display}
          onChange={handleChange}
          className={cn(
            "flex h-12 w-full flex-1 rounded-lg border border-input bg-background px-4 text-base tracking-wide placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);
