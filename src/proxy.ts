import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed `middleware` → `proxy`. The function signature is identical
// to the legacy middleware contract, so next-intl's createMiddleware still works.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, internal Next paths, generated favicons, and any path
  // with a dot (static files). Without the icon/apple-icon exclusions,
  // next-intl tries to rewrite them to a locale-prefixed path and 404s.
  matcher: ["/((?!api|_next|_vercel|icon|apple-icon|favicon\\.ico|.*\\..*).*)"],
};
