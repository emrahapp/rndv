import { z } from "zod";

// Türkçe telefon: +90 5XX XXX XX XX veya 05XX... → 11 hane (905XXXXXXXXX)
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(
    (v) => /^(90)?5\d{9}$/.test(v),
    "Geçerli bir telefon numarası gir (5XX XXX XX XX).",
  )
  .transform((v) => (v.startsWith("90") ? v : `90${v}`));

export const signupSchema = z.object({
  ad_soyad: z.string().trim().min(2, "En az 2 karakter."),
  telefon: phoneSchema,
  email: z.email("Geçerli bir e-posta gir."),
  parola: z.string().min(6, "Parola en az 6 karakter olmalı."),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta gir."),
  parola: z.string().min(1, "Parolanı gir."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "6 haneli kodu gir.");
