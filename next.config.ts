import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the project root so Next doesn't walk up to the user-level
    // lockfile in C:\Users\Personel.
    root: path.resolve(import.meta.dirname),
  },
};

export default withNextIntl(nextConfig);
