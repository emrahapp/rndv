"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Link2,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link as I18nLink, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavKey =
  | "dashboard"
  | "appointments"
  | "customers"
  | "link"
  | "reports"
  | "settings";

type NavItem = {
  href: string;
  key: NavKey;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/app", key: "dashboard", Icon: LayoutDashboard },
  { href: "/app/randevular", key: "appointments", Icon: CalendarDays },
  { href: "/app/musteriler", key: "customers", Icon: Users },
  { href: "/app/link", key: "link", Icon: Link2 },
  { href: "/app/raporlar", key: "reports", Icon: BarChart3 },
  { href: "/app/ayarlar", key: "settings", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const t = useTranslations("app.nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, key, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <I18nLink
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-foreground hover:bg-foreground/[0.06]",
            )}
          >
            <Icon
              className="size-5 shrink-0"
              strokeWidth={active ? 2.4 : 2}
            />
            {t(key)}
          </I18nLink>
        );
      })}
    </nav>
  );
}

export function MobileBottomNav() {
  const t = useTranslations("app.nav");
  const pathname = usePathname();

  // Bottom bar fits 4 items comfortably. Hide reports + settings; they live
  // in the desktop sidebar.
  const items = NAV_ITEMS.filter(
    (i) => i.href !== "/app/ayarlar" && i.href !== "/app/raporlar",
  );

  return (
    <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
      {items.map(({ href, key, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <I18nLink
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  active ? "text-foreground" : "text-foreground/70",
                )}
                strokeWidth={active ? 2.4 : 2}
              />
              {t(key)}
            </I18nLink>
          </li>
        );
      })}
    </ul>
  );
}
