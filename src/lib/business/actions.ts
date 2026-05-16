"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { phoneSchema } from "@/lib/auth/schemas";
import {
  getCurrentBusiness,
  isSlugTaken,
  updateCurrentBusiness,
} from "@/lib/db/businesses";
import { isValidSlug, slugify } from "./slug";
import { DAYS, SLOT_OPTIONS, type WorkingHours } from "./types";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ─────────── Profile ───────────
const profileSchema = z.object({
  ad_soyad: z.string().trim().min(2, "En az 2 karakter."),
  telefon: phoneSchema,
  email: z.email("Geçerli bir e-posta gir."),
});

export async function updateProfileAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Form geçersiz.",
    };
  }
  const current = await getCurrentBusiness();
  if (!current) return { ok: false, error: "Oturum bulunamadı." };
  const updated = await updateCurrentBusiness(parsed.data);
  if (!updated) return { ok: false, error: "Profil güncellenemedi." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────── Slug ───────────
const slugSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      isValidSlug,
      "Sadece küçük harf, rakam ve tire kullan (3–48 karakter).",
    ),
});

export async function updateSlugAction(input: unknown): Promise<ActionResult> {
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Slug geçersiz.",
    };
  }
  const current = await getCurrentBusiness();
  if (!current) return { ok: false, error: "Oturum bulunamadı." };

  if (parsed.data.slug !== current.slug) {
    const taken = await isSlugTaken(parsed.data.slug);
    if (taken) {
      return { ok: false, error: "Bu kullanıcı adı başka biri tarafından alınmış." };
    }
  }

  const updated = await updateCurrentBusiness({ slug: parsed.data.slug });
  if (!updated) return { ok: false, error: "Kullanıcı adı güncellenemedi." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────── Working hours + slot + lunch ───────────
const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeSchema = z.string().regex(timeRe, "HH:MM bekleniyor.");

const dayHoursSchema = z.union([
  z
    .tuple([timeSchema, timeSchema])
    .refine(([a, b]) => a < b, {
      message: "Açılış saatleri kapanıştan önce olmalı.",
    }),
  z.null(),
]);

const hoursSchema = z.object({
  calisma_saatleri: z.object(
    Object.fromEntries(DAYS.map((d) => [d, dayHoursSchema])) as Record<
      (typeof DAYS)[number],
      typeof dayHoursSchema
    >,
  ) as z.ZodType<WorkingHours>,
  ogle_arasi: z
    .union([z.tuple([timeSchema, timeSchema]).refine(([a, b]) => a < b), z.null()])
    .nullable(),
  slot_dakika: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60),
  ]),
});

export async function updateHoursAction(input: unknown): Promise<ActionResult> {
  const coerced =
    typeof input === "object" && input !== null && "slot_dakika" in input
      ? {
          ...(input as Record<string, unknown>),
          slot_dakika: Number((input as Record<string, unknown>).slot_dakika),
        }
      : input;

  const parsed = hoursSchema.safeParse(coerced);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Çalışma saatlerinde bir hata var.",
    };
  }
  if (!SLOT_OPTIONS.includes(parsed.data.slot_dakika)) {
    return { ok: false, error: "Slot süresi geçersiz." };
  }
  const current = await getCurrentBusiness();
  if (!current) return { ok: false, error: "Oturum bulunamadı." };
  const updated = await updateCurrentBusiness({
    calisma_saatleri: parsed.data.calisma_saatleri,
    ogle_arasi: parsed.data.ogle_arasi,
    slot_dakika: parsed.data.slot_dakika,
  });
  if (!updated) return { ok: false, error: "Saatler güncellenemedi." };
  revalidatePath("/", "layout");
  return { ok: true };
}

// ─────────── Helper: suggest slug from current name ───────────
export async function suggestSlugAction(): Promise<string | null> {
  const current = await getCurrentBusiness();
  if (!current) return null;
  return slugify(current.ad_soyad);
}
