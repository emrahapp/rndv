"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicLinkCard({ url }: { url: string }) {
  const t = useTranslations("app.dashboard.publicLink");
  const [copied, setCopied] = useState(false);
  // strip protocol for a cleaner display: "rndv.click/u/xyz"
  const display = url.replace(/^https?:\/\//, "");

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // noop
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold leading-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{display}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="default" onClick={onCopy}>
            {copied ? (
              <>
                <Check className="size-4" />
                {t("copied")}
              </>
            ) : (
              <>
                <Copy className="size-4" />
                {t("copy")}
              </>
            )}
          </Button>
          <Button asChild variant="primary" size="default">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              {t("open")}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
