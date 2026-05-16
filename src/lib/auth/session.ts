import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  coerceAvatarColor,
  coerceAvatarType,
  coerceSectorIcon,
  type AvatarColor,
  type AvatarType,
  type SectorIcon,
} from "./avatar-color";

// Re-export so existing callers can keep `import { AvatarColor } from "@/lib/auth/session"`.
// Client components should import directly from "@/lib/auth/avatar-color".
export type { AvatarColor, AvatarType, SectorIcon };
export { AVATAR_COLORS, SECTOR_ICONS } from "./avatar-color";

/**
 * Session = the currently-authenticated Supabase Auth user, projected
 * into the shape that older callers expect.
 *
 * Source of truth: `auth.users` + `user_metadata` (set during signUp).
 */

export type Session = {
  userId: string;
  ad_soyad: string;
  email: string;
  telefon: string;
  avatarColor: AvatarColor;
  avatarType: AvatarType;
  avatarIcon: SectorIcon | null;
  avatarUrl: string | null;
};

export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    userId: user.id,
    ad_soyad:
      (user.user_metadata?.ad_soyad as string | undefined) ??
      user.email?.split("@")[0] ??
      "",
    email: user.email ?? "",
    telefon: (user.user_metadata?.telefon as string | undefined) ?? "",
    avatarColor: coerceAvatarColor(user.user_metadata?.avatar_color),
    avatarType: coerceAvatarType(user.user_metadata?.avatar_type),
    avatarIcon: coerceSectorIcon(user.user_metadata?.avatar_icon),
    avatarUrl:
      (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

// Legacy no-ops — kept so any leftover imports keep compiling.
// Session lifecycle is now handled by `supabase.auth.signOut()` (via logoutAction).
export async function clearSession(): Promise<void> {}
export function newUserId(): string {
  return "";
}

// The old pending-signup cookie is gone. /dogrula now reads telefon from
// the authenticated user's `user_metadata`. These remain for compat.
export async function getPending(): Promise<null> {
  return null;
}
export async function setPending(_p: unknown): Promise<void> {}
export async function clearPending(): Promise<void> {}
