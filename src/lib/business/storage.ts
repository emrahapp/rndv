import "server-only";
import {
  getCurrentBusiness,
  updateCurrentBusiness,
} from "@/lib/db/businesses";
import type { Business } from "./types";

/**
 * Thin wrapper over the Supabase DAL so existing call sites
 * (panel pages, server actions) don't need to know about Supabase.
 *
 * In the demo era these were HMAC-signed cookies + an in-memory Map.
 * Now they're real Postgres rows.
 */

export async function getBusiness(): Promise<Business | null> {
  return getCurrentBusiness();
}

export async function updateBusiness(
  patch: Partial<Omit<Business, "id">>,
): Promise<Business | null> {
  return updateCurrentBusiness(patch);
}

// Legacy no-ops — kept so any leftover imports don't blow up.
// The auth action now writes the row directly via createBusiness().
export async function setBusiness(_b: Business): Promise<void> {
  /* handled inside the signup verify flow */
}
export async function clearBusiness(): Promise<void> {
  /* Supabase Auth handles session; business row persists across logouts */
}
export async function rehydrateBusinessRegistry(): Promise<Business | null> {
  // Used to re-publish a cookie-stored business into the in-memory map.
  // With Supabase, the DB is the single source of truth.
  return getCurrentBusiness();
}
