"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * On every route change, jumps the window back to the top.
 *
 * Without this, navigating away from a scrolled-down page (e.g. scrolling
 * through Randevular and clicking "Müşteriler" in the sidebar) leaves the
 * new page rendered at the same Y position — the user has to manually
 * scroll up to see the page header.
 *
 * Next.js + next-intl don't reliably auto-scroll on client-side nav.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
