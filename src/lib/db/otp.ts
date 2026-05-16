import "server-only";
import { createHash, randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex");

export type OtpAmac = "signup" | "booking" | "login";

/** Cryptographically random 6-digit OTP, padded with leading zeros if needed. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Insert a fresh OTP row. Returns the row id + expiry. */
export async function createOtp(input: {
  telefon: string;
  code: string;
  amac: OtpAmac;
  metadata?: Record<string, unknown>;
  ttlSeconds?: number;
}): Promise<{ id: string; expiresAt: string }> {
  const svc = createAdminClient();
  const ttl = input.ttlSeconds ?? 600;
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { data, error } = await svc
    .from("otp_codes")
    .insert({
      telefon: input.telefon,
      kod_hash: sha256(input.code),
      amac: input.amac,
      expires_at: expiresAt,
      metadata: input.metadata ?? null,
    })
    .select("id, expires_at")
    .single();

  if (error || !data) {
    throw new Error(`[db] createOtp failed: ${error?.message ?? "unknown"}`);
  }
  return { id: data.id, expiresAt: data.expires_at };
}

type VerifyOk = {
  ok: true;
  metadata: Record<string, unknown> | null;
};
type VerifyErr = {
  ok: false;
  reason: "not_found" | "expired" | "mismatch";
};

/** Verify the latest unused OTP for a phone + purpose. */
export async function verifyOtpByPhone(input: {
  telefon: string;
  amac: OtpAmac;
  code: string;
}): Promise<VerifyOk | VerifyErr> {
  const svc = createAdminClient();
  const hash = sha256(input.code);

  const { data } = await svc
    .from("otp_codes")
    .select("id, kod_hash, expires_at, kullanildi, metadata")
    .eq("telefon", input.telefon)
    .eq("amac", input.amac)
    .eq("kullanildi", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { ok: false, reason: "not_found" };
  if (new Date(data.expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (data.kod_hash !== hash) return { ok: false, reason: "mismatch" };

  await svc.from("otp_codes").update({ kullanildi: true }).eq("id", data.id);
  return { ok: true, metadata: data.metadata };
}

/** Verify a specific OTP row by id (used by booking flow which knows the id). */
export async function verifyOtpById(input: {
  id: string;
  code: string;
}): Promise<VerifyOk | VerifyErr> {
  const svc = createAdminClient();
  const hash = sha256(input.code);

  const { data } = await svc
    .from("otp_codes")
    .select("id, kod_hash, expires_at, kullanildi, metadata")
    .eq("id", input.id)
    .maybeSingle();

  if (!data) return { ok: false, reason: "not_found" };
  if (data.kullanildi) return { ok: false, reason: "not_found" };
  if (new Date(data.expires_at) < new Date()) {
    return { ok: false, reason: "expired" };
  }
  if (data.kod_hash !== hash) return { ok: false, reason: "mismatch" };

  await svc.from("otp_codes").update({ kullanildi: true }).eq("id", data.id);
  return { ok: true, metadata: data.metadata };
}
