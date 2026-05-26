"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Image as ImageIcon, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LinkAssets({
  slug,
  qrPreviewSvg,
  qrLargeSvg,
  storyCardSvg,
}: {
  slug: string;
  qrPreviewSvg: string;
  qrLargeSvg: string;
  storyCardSvg: string;
}) {
  const t = useTranslations("app.link");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function downloadSvg(svg: string, name: string) {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadPng(
    svg: string,
    name: string,
    width: number,
    height: number,
  ) {
    setError(null);
    try {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 0.95),
      );
      if (!pngBlob) throw new Error("PNG encode failed");
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${name}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(pngUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İndirme başarısız.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* QR column */}
        <section className="flex flex-col gap-4">
          <div className="space-y-1 text-center">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
              <QrCode className="size-5" />
              {t("qrSection.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("qrSection.subtitle")}
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div
              className="aspect-square w-full max-w-[260px] rounded-2xl border border-border bg-card p-4 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrPreviewSvg }}
            />
          </div>

          <div className="mx-auto flex w-full max-w-[260px] flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                startTransition(() =>
                  downloadPng(qrLargeSvg, `rndv-${slug}-qr`, 1024, 1024),
                )
              }
              disabled={pending}
            >
              <Download className="size-4" />
              {t("qrSection.downloadPng")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadSvg(qrLargeSvg, `rndv-${slug}-qr`)}
            >
              <Download className="size-4" />
              {t("qrSection.downloadSvg")}
            </Button>
          </div>
        </section>

        {/* Story column */}
        <section className="flex flex-col gap-4">
          <div className="space-y-1 text-center">
            <h2 className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
              <ImageIcon className="size-5" />
              {t("storySection.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("storySection.subtitle")}
            </p>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div
              className="w-full max-w-[220px] overflow-hidden rounded-2xl border border-border bg-background shadow-sm [&>svg]:h-full [&>svg]:w-full"
              style={{ aspectRatio: "9 / 16" }}
              dangerouslySetInnerHTML={{ __html: storyCardSvg }}
            />
          </div>

          <div className="mx-auto flex w-full max-w-[260px] flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                startTransition(() =>
                  downloadPng(storyCardSvg, `rndv-${slug}-story`, 1080, 1920),
                )
              }
              disabled={pending}
            >
              <Download className="size-4" />
              {t("storySection.downloadPng")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadSvg(storyCardSvg, `rndv-${slug}-story`)}
            >
              <Download className="size-4" />
              {t("storySection.downloadSvg")}
            </Button>
          </div>
        </section>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t("tip")}
      </p>
    </div>
  );
}
