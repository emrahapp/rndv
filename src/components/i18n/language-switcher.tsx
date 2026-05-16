"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Compact TR ⇄ EN toggle. Reuses the next-intl router so the URL prefix
 * updates correctly (localePrefix: "as-needed").
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "tr" ? "en" : "tr";
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={locale === "tr" ? "English" : "Türkçe"}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full bg-muted/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50",
        className,
      )}
    >
      <Globe className="size-3.5" />
      {locale.toUpperCase()}
    </button>
  );
}
