import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getBusiness } from "@/lib/business/storage";
import { getCustomers } from "@/lib/appointments/registry";
import { CustomersList } from "./customers-list";

export default async function CustomersPage({
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

  const t = await getTranslations("app.customers");

  const customers = (await getCustomers()).slice().sort((a, b) => {
    const aKey = a.lastBookingAt ?? "";
    const bKey = b.lastBookingAt ?? "";
    return bKey.localeCompare(aKey);
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Users className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t("empty")}</p>
          <p className="text-xs text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        <CustomersList customers={customers} locale={locale} />
      )}
    </div>
  );
}
