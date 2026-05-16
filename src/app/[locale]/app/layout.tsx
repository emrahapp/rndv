import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Link as I18nLink } from "@/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { getCurrentBusiness } from "@/lib/db/businesses";
import { AvatarBlock } from "./avatar-block";
import { MobileBottomNav, SidebarNav } from "./panel-nav";

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) redirect("/giris");

  // Signed in but no business yet → finish signup (phone verification).
  const business = await getCurrentBusiness();
  if (!business) redirect("/dogrula");

  const t = await getTranslations("app.nav");

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-72 shrink-0 border-r border-border bg-muted lg:flex lg:flex-col">
        <div className="px-6 pt-6 pb-2">
          <I18nLink href="/app">
            <Logo size={34} />
          </I18nLink>
        </div>

        {/* Avatar + name + email */}
        <AvatarBlock
          name={business.ad_soyad}
          email={session.email}
          initialColor={session.avatarColor}
          initialType={session.avatarType}
          initialIcon={session.avatarIcon}
          initialUrl={session.avatarUrl}
        />

        {/* Nav items (active-state aware) */}
        <SidebarNav />

        <div className="flex-1" />

        {/* Logout pinned to bottom */}
        <form action={logoutAction} className="p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <LogOut className="size-5" strokeWidth={2} />
            {t("logout")}
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
        <I18nLink href="/app">
          <Logo size={24} />
        </I18nLink>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label={t("logout")}
            className="text-muted-foreground"
          >
            <LogOut className="size-5" />
          </button>
        </form>
      </header>

      {/* Content */}
      <main className="flex-1 pb-24 lg:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav (active-state aware) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <MobileBottomNav />
      </nav>
    </div>
  );
}
