"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { suggestSlugAction, updateSlugAction } from "@/lib/business/actions";

export function SlugForm({
  initialSlug,
  slugBase,
}: {
  initialSlug: string;
  slugBase: string; // e.g. "rndv.click/u/" or "localhost:3000/u/"
}) {
  const t = useTranslations("app.settings.slug");
  const tCommon = useTranslations("common");
  const [slug, setSlug] = useState(initialSlug);
  const [pending, startTransition] = useTransition();
  const [suggesting, startSuggest] = useTransition();

  async function onSubmit() {
    startTransition(async () => {
      const res = await updateSlugAction({ slug });
      if (!res.ok) toast.error(res.error);
      else toast.success(tCommon("saved"));
    });
  }

  function onSuggest() {
    startSuggest(async () => {
      const suggestion = await suggestSlugAction();
      if (suggestion) setSlug(suggestion);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="slug">{t("label")}</Label>
        <div className="flex items-center gap-0 overflow-hidden rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="select-none border-r border-input bg-muted/40 px-3 text-sm font-medium text-muted-foreground self-stretch flex items-center">
            {slugBase}
          </span>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            className="h-12 flex-1 bg-background px-3 text-base outline-none placeholder:text-muted-foreground"
            placeholder="kullanici-adi"
          />
        </div>
        <button
          type="button"
          onClick={onSuggest}
          disabled={suggesting}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          <Sparkles className="size-3" />
          {t("suggest")}
        </button>
      </div>

      <Button type="submit" variant="primary" disabled={pending || !slug}>
        {pending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
}
