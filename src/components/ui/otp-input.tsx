"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  autoFocus = true,
  className,
  disabled,
  hasError,
}: OtpInputProps) {
  const inputsRef = React.useRef<(HTMLInputElement | null)[]>([]);

  const digits = React.useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ""),
    [value, length],
  );

  React.useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  React.useEffect(() => {
    if (value.length === length) onComplete?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function setAt(idx: number, digit: string) {
    const next = [...digits];
    next[idx] = digit;
    onChange(next.join(""));
  }

  function handleChange(
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    if (raw.length > 1) {
      // paste landed in one cell
      const next = (value + raw).slice(0, length);
      onChange(next);
      const focusIdx = Math.min(next.length, length - 1);
      inputsRef.current[focusIdx]?.focus();
      return;
    }
    setAt(idx, raw);
    if (idx < length - 1) inputsRef.current[idx + 1]?.focus();
  }

  function handleKey(
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx]) {
        setAt(idx, "");
      } else if (idx > 0) {
        setAt(idx - 1, "");
        inputsRef.current[idx - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && idx > 0)
      inputsRef.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < length - 1)
      inputsRef.current[idx + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
  }

  return (
    <div className={cn("flex justify-center gap-1.5 sm:gap-2", className)}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKey(idx, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={cn(
            "size-11 sm:size-12 rounded-lg border bg-background text-center text-xl sm:text-2xl font-semibold tracking-tight tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-foreground disabled:opacity-50",
            hasError ? "border-destructive" : "border-input",
          )}
        />
      ))}
    </div>
  );
}
