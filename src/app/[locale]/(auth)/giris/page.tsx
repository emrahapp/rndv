import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link as I18nLink } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/businesses";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const business = await getCurrentBusiness();
    redirect(business ? "/app" : "/dogrula");
  }

  const t = await getTranslations("auth.login");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <I18nLink
          href="/kayit"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("signupLink")}
        </I18nLink>
      </p>
    </div>
  );
}
