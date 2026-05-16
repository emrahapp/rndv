"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loginSchema, otpSchema, signupSchema } from "./schemas";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createOtp,
  generateOtp,
  verifyOtpByPhone,
} from "@/lib/db/otp";
import {
  createBusiness,
  ensureUniqueSlug,
  getCurrentBusiness,
} from "@/lib/db/businesses";
import { sendSms } from "@/lib/notify";
import { sms } from "@/lib/notify/templates";

export type ActionResult<T = void> =
  | { ok: true; redirectTo?: string; data?: T }
  | { ok: false; error: string };

// ────────────────────────────────────────────────────────────
// signup → create auth user (admin), sign in, store OTP, send SMS
// ────────────────────────────────────────────────────────────
export async function signupAction(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Form geçersiz.",
    };
  }
  const { ad_soyad, telefon, email, parola } = parsed.data;

  // 1) Create the auth user with email pre-confirmed (so we don't depend
  //    on Supabase's email-confirmation project setting).
  const svc = createAdminClient();
  const { data: created, error: createErr } =
    await svc.auth.admin.createUser({
      email,
      password: parola,
      email_confirm: true,
      user_metadata: { ad_soyad, telefon },
    });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Kayıt başarısız.";
    if (
      msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("registered") ||
      msg.toLowerCase().includes("exists")
    ) {
      return { ok: false, error: "Bu e-posta zaten kayıtlı. Giriş yap." };
    }
    return { ok: false, error: msg };
  }

  // 2) Sign in immediately so the user has a session for /dogrula.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: parola,
  });
  if (signInErr) {
    return { ok: false, error: signInErr.message };
  }

  // 3) Generate + store + send OTP.
  const otp = generateOtp();
  try {
    await createOtp({ telefon, code: otp, amac: "signup" });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "OTP oluşturulamadı.",
    };
  }
  await sendSms({
    to: telefon,
    tag: "signup-otp",
    message: sms.signupOtp(otp),
  });

  return { ok: true, redirectTo: "/dogrula" };
}

// ────────────────────────────────────────────────────────────
// verifyOtp → confirm phone, create business row, set session
// ────────────────────────────────────────────────────────────
export async function verifyOtpAction(rawCode: string): Promise<ActionResult> {
  const parsed = otpSchema.safeParse(rawCode);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Kod geçersiz.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Oturum bulunamadı. Lütfen baştan kayıt ol.",
    };
  }

  const telefon = user.user_metadata?.telefon as string | undefined;
  const ad_soyad = user.user_metadata?.ad_soyad as string | undefined;
  if (!telefon || !ad_soyad) {
    return { ok: false, error: "Profil bilgileri eksik. Baştan kayıt ol." };
  }

  const result = await verifyOtpByPhone({
    telefon,
    amac: "signup",
    code: parsed.data,
  });
  if (!result.ok) {
    if (result.reason === "expired") {
      return {
        ok: false,
        error: "Doğrulama süresi doldu. Kodu tekrar gönder.",
      };
    }
    if (result.reason === "mismatch") {
      return { ok: false, error: "Kod yanlış. Tekrar dene." };
    }
    return {
      ok: false,
      error: "Doğrulama kodu bulunamadı. Tekrar gönder.",
    };
  }

  // Idempotent: if business already exists (e.g. user re-verified), just continue.
  const existing = await getCurrentBusiness();
  if (existing) {
    return { ok: true, redirectTo: "/app" };
  }

  const slug = await ensureUniqueSlug(ad_soyad);
  const created = await createBusiness({
    owner_user_id: user.id,
    ad_soyad,
    slug,
    telefon,
    email: user.email ?? "",
  });
  if (!created) {
    return {
      ok: false,
      error: "Profil oluşturulamadı. Lütfen tekrar dene.",
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/app" };
}

// ────────────────────────────────────────────────────────────
// resend OTP
// ────────────────────────────────────────────────────────────
export async function resendOtpAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum yok." };

  const telefon = user.user_metadata?.telefon as string | undefined;
  if (!telefon) return { ok: false, error: "Telefon bilgisi yok." };

  const otp = generateOtp();
  try {
    await createOtp({ telefon, code: otp, amac: "signup" });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "OTP oluşturulamadı.",
    };
  }
  await sendSms({
    to: telefon,
    tag: "signup-otp-resend",
    message: sms.signupOtp(otp),
  });
  return { ok: true };
}

// ────────────────────────────────────────────────────────────
// login (email + password via Supabase Auth)
// ────────────────────────────────────────────────────────────
export async function loginAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Form geçersiz.",
    };
  }

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.parola,
  });
  if (signInErr) {
    return { ok: false, error: "E-posta veya parola hatalı." };
  }

  // If they signed up but never verified phone, send them to /dogrula
  // with a fresh OTP so they can finish setup.
  const business = await getCurrentBusiness();
  if (business) {
    return { ok: true, redirectTo: "/app" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const telefon = user?.user_metadata?.telefon as string | undefined;
  if (telefon) {
    const otp = generateOtp();
    try {
      await createOtp({ telefon, code: otp, amac: "signup" });
      await sendSms({
        to: telefon,
        tag: "signup-otp-relogin",
        message: sms.signupOtp(otp),
      });
    } catch {
      // soft-fail — /dogrula has a "resend" button as fallback
    }
  }
  return { ok: true, redirectTo: "/dogrula" };
}

// ────────────────────────────────────────────────────────────
// logout
// ────────────────────────────────────────────────────────────
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/giris");
}

// ────────────────────────────────────────────────────────────
// updateAvatar → persist avatar type/color/icon choices
// uploadAvatar  → upload an image to Supabase Storage + switch to image mode
// ────────────────────────────────────────────────────────────
import {
  AVATAR_COLORS,
  SECTOR_ICONS,
  type AvatarColor,
  type AvatarType,
  type SectorIcon,
} from "./avatar-color";

const VALID_TYPES: readonly AvatarType[] = ["initial", "icon", "image"];

export async function updateAvatarAction(input: {
  type?: AvatarType;
  color?: AvatarColor;
  icon?: SectorIcon | null;
}): Promise<ActionResult> {
  if (input.type && !VALID_TYPES.includes(input.type)) {
    return { ok: false, error: "Geçersiz avatar tipi." };
  }
  if (input.color && !AVATAR_COLORS.includes(input.color)) {
    return { ok: false, error: "Geçersiz renk." };
  }
  if (input.icon && !SECTOR_ICONS.includes(input.icon)) {
    return { ok: false, error: "Geçersiz simge." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum yok." };

  const patch: Record<string, unknown> = { ...(user.user_metadata ?? {}) };
  if (input.type !== undefined) patch.avatar_type = input.type;
  if (input.color !== undefined) patch.avatar_color = input.color;
  if (input.icon !== undefined) patch.avatar_icon = input.icon;

  const { error } = await supabase.auth.updateUser({ data: patch });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export async function uploadAvatarAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Dosya seçilmedi." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Dosya 5MB'ı geçemez." };
  }
  if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
    return { ok: false, error: "Sadece JPG, PNG, WebP, GIF kabul edilir." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum yok." };

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/avatar.${ext}`;

  // We use the SERVICE-ROLE client to write — server action is the trust
  // boundary (we already verified the user is signed in and we control the
  // path: `{user_id}/avatar.{ext}`). This avoids needing per-row RLS policies
  // on `storage.objects` for the avatars bucket.
  const svc = createAdminClient();
  const { error: upErr } = await svc.storage
    .from("avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    });
  if (upErr) return { ok: false, error: upErr.message };

  const {
    data: { publicUrl },
  } = svc.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so the freshly uploaded image is visible immediately.
  const finalUrl = `${publicUrl}?t=${Date.now()}`;

  const { error: updErr } = await supabase.auth.updateUser({
    data: {
      ...(user.user_metadata ?? {}),
      avatar_type: "image",
      avatar_url: finalUrl,
    },
  });
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/", "layout");
  return { ok: true, data: { url: finalUrl } };
}

/** Backwards-compat shim — older callers just changed color. Routes through
 *  the new updateAvatarAction. */
export async function updateAvatarColorAction(
  color: string,
): Promise<ActionResult> {
  if (!AVATAR_COLORS.includes(color as AvatarColor)) {
    return { ok: false, error: "Geçersiz renk." };
  }
  return updateAvatarAction({ color: color as AvatarColor });
}

// ────────────────────────────────────────────────────────────
// restartSignup → wipe the half-baked auth user + signOut + back to /kayit
//
// Used by /dogrula's "Baştan başla" link when the user wants to change
// phone/email mid-signup. Without this, /kayit would just bounce them
// back to /dogrula because they still have a valid session.
// ────────────────────────────────────────────────────────────
export async function restartSignupAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const business = await getCurrentBusiness();
    // Only delete the auth user if signup never completed (no business row).
    if (!business) {
      const svc = createAdminClient();
      await svc.auth.admin.deleteUser(user.id);
    }
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/kayit");
}
