import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Link as I18nLink } from "@/i18n/navigation";

export default async function PublicBookingNotFound() {
  const t = await getTranslations("booking.notFound");
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-5">
        <Logo size={32} />
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="max-w-sm text-muted-foreground">{t("subtitle")}</p>
        <Button asChild variant="outline">
          <I18nLink href="/">{t("home")}</I18nLink>
        </Button>
      </div>
    </div>
  );
}
