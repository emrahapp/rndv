import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/db/businesses";
import { restartSignupAction } from "@/lib/auth/actions";
import { OtpForm } from "./otp-form";

function maskPhone(phone: string) {
  // 905XXXXXXXXX → +90 *** *** ** XX
  const last = phone.slice(-2);
  return `+90 *** *** ** ${last}`;
}

export default async function VerifyPage({
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
  if (!user) redirect("/kayit");

  // Already verified? Skip ahead.
  const business = await getCurrentBusiness();
  if (business) redirect("/app");

  const telefon = (user.user_metadata?.telefon as string | undefined) ?? "";
  if (!telefon) redirect("/kayit");

  const t = await getTranslations("auth.otp");

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { phone: maskPhone(telefon) })}
        </p>
      </div>

      <OtpForm />

      <form
        action={restartSignupAction}
        className="text-center text-sm text-muted-foreground"
      >
        {t("wrongNumber")}{" "}
        <button
          type="submit"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("restart")}
        </button>
      </form>
    </div>
  );
}
