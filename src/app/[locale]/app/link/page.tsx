import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/storage";
import { buildQrSvg, buildShareCardSvg } from "@/lib/business/share-card";
import { PublicLinkCard } from "@/components/business/public-link-card";
import { LinkAssets } from "./link-assets";

export default async function LinkPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) redirect("/giris");
  const business = await getBusiness();
  if (!business) redirect("/giris");

  const t = await getTranslations("app.link");

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicUrl = `${appUrl}/u/${business.slug}`;

  const qrPreviewSvg = await buildQrSvg(publicUrl, 320);
  const qrLargeSvg = await buildQrSvg(publicUrl, 1024);
  const storyCardSvg = await buildShareCardSvg({
    businessName: business.ad_soyad,
    publicUrl,
    bookingLabel: locale === "tr" ? "Online randevu" : "Online booking",
    footerLabel: locale === "tr" ? "rndv ile çalışıyor" : "powered by rndv",
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      <PublicLinkCard url={publicUrl} />

      <LinkAssets
        slug={business.slug}
        qrPreviewSvg={qrPreviewSvg}
        qrLargeSvg={qrLargeSvg}
        storyCardSvg={storyCardSvg}
      />
    </div>
  );
}
