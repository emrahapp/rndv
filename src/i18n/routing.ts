import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en"],
  defaultLocale: "tr",
  localePrefix: "as-needed",
  // Don't auto-pick the locale from the browser's Accept-Language header.
  // First-time visitors always see Turkish; switching via the LanguageSwitcher
  // sets a cookie that's respected on subsequent visits.
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
