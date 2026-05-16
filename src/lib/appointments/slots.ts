import type { Business, Day } from "@/lib/business/types";

const DAY_KEYS: Day[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const toMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};

const fmt = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** "YYYY-MM-DD" → Date (local). Returns null if malformed. */
export function parseDate(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Generate "HH:MM" slot start times that are bookable on a given date.
 * Skips slots overlapping lunch and ones in `takenTimes`.
 */
export function generateSlotsForDate(
  business: Business,
  dateStr: string,
  takenTimes: string[] = [],
): string[] {
  const date = parseDate(dateStr);
  if (!date) return [];

  if (business.kapali_gunler.includes(dateStr)) return [];

  const dayKey = DAY_KEYS[date.getDay()];
  const hours = business.calisma_saatleri[dayKey];
  if (!hours) return [];

  const [open, close] = hours;
  const slot = business.slot_dakika;
  const lunch = business.ogle_arasi;

  const openMin = toMin(open);
  const closeMin = toMin(close);
  const lunchStart = lunch ? toMin(lunch[0]) : null;
  const lunchEnd = lunch ? toMin(lunch[1]) : null;

  const slots: string[] = [];
  let t = openMin;
  while (t + slot <= closeMin) {
    const slotEnd = t + slot;
    const overlapsLunch =
      lunchStart !== null &&
      lunchEnd !== null &&
      t < lunchEnd &&
      slotEnd > lunchStart;
    const time = fmt(t);
    if (!overlapsLunch && !takenTimes.includes(time)) slots.push(time);
    t += slot;
  }
  return slots;
}

/**
 * Returns the set of YYYY-MM-DD dates in [year, month] that have at least
 * one bookable slot (after subtracting `bookedByDate`).
 */
export function bookableDaysInMonth(
  business: Business,
  year: number,
  monthZeroIndexed: number,
  bookedByDate: Record<string, string[]> = {},
): Set<string> {
  const result = new Set<string>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last = new Date(year, monthZeroIndexed + 1, 0);
  for (let d = new Date(year, monthZeroIndexed, 1); d <= last; d.setDate(d.getDate() + 1)) {
    if (d < today) continue;
    const dateStr = formatDate(d);
    const slots = generateSlotsForDate(
      business,
      dateStr,
      bookedByDate[dateStr] ?? [],
    );
    if (slots.length > 0) result.add(dateStr);
  }
  return result;
}

/** Group an Appointment[] into a { "YYYY-MM-DD": ["HH:MM", ...] } map for lookup. */
export function takenByDate(
  appointments: Array<{ date: string; time: string; status: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const a of appointments) {
    if (a.status === "cancelled") continue;
    (out[a.date] ??= []).push(a.time);
  }
  return out;
}
