// Shared avatar config — types + class maps + sector-icon registry.
// Safe to import from both server and client components.

import {
  Briefcase,
  Camera,
  Dumbbell,
  Flower2,
  PawPrint,
  Scissors,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

// ────────────────── Colors ──────────────────

export type AvatarColor =
  | "green"
  | "purple"
  | "orange"
  | "blue"
  | "pink"
  | "dark";

export const AVATAR_COLORS: readonly AvatarColor[] = [
  "green",
  "purple",
  "orange",
  "blue",
  "pink",
  "dark",
] as const;

/** Pre-computed Tailwind classes (must be static for the compiler to detect). */
export const COLOR_CLASSES: Record<AvatarColor, string> = {
  green: "bg-primary text-primary-foreground",
  purple: "bg-violet-500 text-white",
  orange: "bg-orange-500 text-white",
  blue: "bg-blue-500 text-white",
  pink: "bg-pink-500 text-white",
  dark: "bg-zinc-900 text-white",
};

export function coerceAvatarColor(v: unknown): AvatarColor {
  return AVATAR_COLORS.includes(v as AvatarColor)
    ? (v as AvatarColor)
    : "green";
}

// ────────────────── Avatar type (which “mode”) ──────────────────

export type AvatarType = "initial" | "icon" | "image";

export function coerceAvatarType(v: unknown): AvatarType {
  return v === "icon" || v === "image" ? v : "initial";
}

// ────────────────── Sector icons (Harf modu yerine simge) ──────────────────

export type SectorIcon =
  | "scissors" // kuaför, berber
  | "sparkles" // güzellik, manikür/pedikür
  | "stethoscope" // doktor, klinik
  | "paw" // veteriner
  | "dumbbell" // spor salonu, PT
  | "camera" // fotoğrafçı
  | "flower" // spa, masaj
  | "briefcase"; // danışman, avukat

export const SECTOR_ICONS: readonly SectorIcon[] = [
  "scissors",
  "sparkles",
  "stethoscope",
  "paw",
  "dumbbell",
  "camera",
  "flower",
  "briefcase",
] as const;

export const ICON_COMPONENTS: Record<SectorIcon, LucideIcon> = {
  scissors: Scissors,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  paw: PawPrint,
  dumbbell: Dumbbell,
  camera: Camera,
  flower: Flower2,
  briefcase: Briefcase,
};

export function coerceSectorIcon(v: unknown): SectorIcon | null {
  return SECTOR_ICONS.includes(v as SectorIcon)
    ? (v as SectorIcon)
    : null;
}
