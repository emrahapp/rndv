export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

/** [open, close] in HH:MM 24h format, or null when the day is closed. */
export type DayHours = [string, string] | null;

export type WorkingHours = Record<Day, DayHours>;

export type SlotMinutes = 15 | 30 | 45 | 60;
export const SLOT_OPTIONS: SlotMinutes[] = [15, 30, 45, 60];

/** Owner-side business — full row with sensitive fields. */
export type Business = {
  id: string;
  ad_soyad: string;
  slug: string;
  telefon: string;
  email: string;
  calisma_saatleri: WorkingHours;
  ogle_arasi: [string, string] | null;
  slot_dakika: SlotMinutes;
  kapali_gunler: string[];
};

import type {
  AvatarColor,
  AvatarType,
  SectorIcon,
} from "@/lib/auth/avatar-color";

/** Public-safe view returned by the `get_business_by_slug` RPC. */
export type PublicBusiness = Pick<
  Business,
  | "id"
  | "ad_soyad"
  | "slug"
  | "calisma_saatleri"
  | "ogle_arasi"
  | "slot_dakika"
  | "kapali_gunler"
> & {
  avatarType: AvatarType;
  avatarColor: AvatarColor;
  avatarIcon: SectorIcon | null;
  avatarUrl: string | null;
};

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  mon: ["09:00", "18:00"],
  tue: ["09:00", "18:00"],
  wed: ["09:00", "18:00"],
  thu: ["09:00", "18:00"],
  fri: ["09:00", "18:00"],
  sat: ["10:00", "16:00"],
  sun: null,
};

export const DEFAULT_LUNCH: [string, string] = ["12:30", "13:30"];
