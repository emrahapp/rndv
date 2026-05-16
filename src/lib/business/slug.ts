/**
 * Turn a name into a URL-safe slug.
 *   "Ayşe'nin Kuaförü" → "ayse-nin-kuaforu"
 *   "Dr. Mehmet Yılmaz" → "dr-mehmet-yilmaz"
 *
 * Uses Unicode-aware diacritic stripping plus a Turkish-specific map
 * because `İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü` don't all normalize cleanly with NFD.
 */

const TR_MAP: Record<string, string> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
  Ğ: "g",
  ğ: "g",
  Ç: "c",
  ç: "c",
  Ö: "o",
  ö: "o",
  Ü: "u",
  ü: "u",
};

export function slugify(input: string): string {
  return input
    .trim()
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip remaining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}
