import "server-only";
import {
  findAppointmentByToken as dbFindByToken,
  listAppointmentsForCurrentBusiness,
  listCustomersForCurrentBusiness,
} from "@/lib/db/appointments";
import { getPublicBusinessBySlug } from "@/lib/db/businesses";
import type { Appointment, Customer } from "./types";
import type { PublicBusiness } from "@/lib/business/types";

/**
 * Thin wrapper over the Supabase DAL. The function signatures stay
 * compatible with the old in-memory registry so existing call sites
 * don't need to change.
 */

export async function getPublicBusiness(
  slug: string,
): Promise<PublicBusiness | null> {
  return getPublicBusinessBySlug(slug);
}

/** Returns appointments for the currently-authenticated owner.
 *  `_slug` is accepted for backwards-compat but ignored — RLS scopes to owner. */
export async function getAppointments(_slug?: string): Promise<Appointment[]> {
  return listAppointmentsForCurrentBusiness();
}

export async function getCustomers(_slug?: string): Promise<Customer[]> {
  return listCustomersForCurrentBusiness();
}

export async function findAppointmentByToken(token: string) {
  return dbFindByToken(token);
}
