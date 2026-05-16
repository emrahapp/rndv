import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Appointment,
  AppointmentSource,
  Customer,
} from "@/lib/appointments/types";

// Shape returned by Supabase when we select with a nested customers join.
type AppointmentRowWithCustomer = {
  id: string;
  business_id: string;
  customer_id: string;
  date: string;
  time: string;
  status: Appointment["status"];
  source: AppointmentSource | null;
  cancel_token: string;
  notes: string | null;
  created_at: string;
  customers: { ad_soyad: string; telefon: string } | null;
};

type CustomerRow = {
  id: string;
  ad_soyad: string;
  telefon: string;
  total_bookings: number;
  last_booking_at: string | null;
  created_at: string;
};

function rowToAppointment(row: AppointmentRowWithCustomer): Appointment {
  return {
    id: row.id,
    customerName: row.customers?.ad_soyad ?? "",
    customerPhone: row.customers?.telefon ?? "",
    date: row.date,
    time: row.time,
    status: row.status,
    source: row.source ?? "online",
    cancelToken: row.cancel_token,
    createdAt: row.created_at,
  };
}

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    ad_soyad: row.ad_soyad,
    telefon: row.telefon,
    lastBookingAt: row.last_booking_at,
    totalBookings: row.total_bookings,
    createdAt: row.created_at,
  };
}

const APT_SELECT =
  "id, business_id, customer_id, date, time, status, source, cancel_token, notes, created_at, customers(ad_soyad, telefon)";

// ────────────────── Owner-scoped (RLS) ──────────────────

export async function listAppointmentsForCurrentBusiness(): Promise<
  Appointment[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("appointments")
    .select(APT_SELECT)
    .order("date", { ascending: true })
    .order("time", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as AppointmentRowWithCustomer[]).map(rowToAppointment);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return rowToCustomer(data as CustomerRow);
}

export async function listAppointmentsForCustomer(
  customerId: string,
): Promise<Appointment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("appointments")
    .select(APT_SELECT)
    .eq("customer_id", customerId)
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (!data) return [];
  return (data as unknown as AppointmentRowWithCustomer[]).map(rowToAppointment);
}

export async function listCustomersForCurrentBusiness(): Promise<Customer[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("last_booking_at", { ascending: false, nullsFirst: false });
  if (error || !data) return [];
  return (data as CustomerRow[]).map(rowToCustomer);
}

// ────────────────── Public (anon) ──────────────────

/** Returns {YYYY-MM-DD: ["HH:MM", ...]} for the slug, via SECURITY DEFINER RPC. */
export async function getTakenByDateForSlug(
  slug: string,
): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_taken_slots", {
    p_slug: slug,
  });
  if (error || !data) return {};
  const out: Record<string, string[]> = {};
  for (const row of data as Array<{ date: string; time: string }>) {
    (out[row.date] ??= []).push(row.time);
  }
  return out;
}

// ────────────────── Service-role writes ──────────────────

type CreateBookingResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: "slot_taken" | "db_error"; error?: string };

/** Atomically upsert customer + insert appointment. The unique partial index
 *  on (business_id, date, time) WHERE status<>'cancelled' enforces the slot.
 *  Returns 'slot_taken' on conflict. */
export async function createBookingForBusiness(input: {
  business_id: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  time: string;
  notes?: string;
  source?: AppointmentSource;
}): Promise<CreateBookingResult> {
  const svc = createAdminClient();
  const bookingAt = new Date(`${input.date}T${input.time}:00`).toISOString();

  // upsert customer (unique by business_id + telefon)
  const { data: existing } = await svc
    .from("customers")
    .select("id, total_bookings")
    .eq("business_id", input.business_id)
    .eq("telefon", input.customer_phone)
    .maybeSingle();

  let customerId: string;
  if (existing) {
    customerId = existing.id;
    await svc
      .from("customers")
      .update({
        ad_soyad: input.customer_name,
        total_bookings: (existing.total_bookings ?? 0) + 1,
        last_booking_at: bookingAt,
      })
      .eq("id", customerId);
  } else {
    const { data: created, error: cErr } = await svc
      .from("customers")
      .insert({
        business_id: input.business_id,
        ad_soyad: input.customer_name,
        telefon: input.customer_phone,
        total_bookings: 1,
        last_booking_at: bookingAt,
      })
      .select("id")
      .single();
    if (cErr || !created) {
      return { ok: false, reason: "db_error", error: cErr?.message };
    }
    customerId = created.id;
  }

  const { data: apt, error: aErr } = await svc
    .from("appointments")
    .insert({
      business_id: input.business_id,
      customer_id: customerId,
      date: input.date,
      time: input.time,
      status: "confirmed",
      source: input.source ?? "online",
      notes: input.notes ?? null,
    })
    .select(APT_SELECT)
    .single();

  if (aErr) {
    if (aErr.code === "23505") return { ok: false, reason: "slot_taken" };
    return { ok: false, reason: "db_error", error: aErr.message };
  }
  if (!apt) return { ok: false, reason: "db_error" };

  const appt = rowToAppointment(apt as unknown as AppointmentRowWithCustomer);
  // The join row may be empty since we just inserted — make sure customer info
  // is populated from the input so notifications/redirects still work.
  return {
    ok: true,
    appointment: {
      ...appt,
      customerName: appt.customerName || input.customer_name,
      customerPhone: appt.customerPhone || input.customer_phone,
    },
  };
}

/** Service-role: cancel via token (used by /iptal/[token]). */
export async function cancelAppointmentByToken(token: string): Promise<{
  ok: true;
  appointment: Appointment;
  business_id: string;
} | { ok: false; reason: "not_found" | "already_cancelled" }> {
  const svc = createAdminClient();
  const { data: row } = await svc
    .from("appointments")
    .select(APT_SELECT)
    .eq("cancel_token", token)
    .maybeSingle();
  if (!row) return { ok: false, reason: "not_found" };
  if ((row as { status: string }).status === "cancelled") {
    return { ok: false, reason: "already_cancelled" };
  }
  await svc
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", (row as { id: string }).id);
  return {
    ok: true,
    appointment: rowToAppointment(row as unknown as AppointmentRowWithCustomer),
    business_id: (row as { business_id: string }).business_id,
  };
}

/** Service-role read of an appointment by cancel_token (for /iptal page). */
export async function findAppointmentByToken(token: string): Promise<
  | (Appointment & { business_id: string })
  | null
> {
  const svc = createAdminClient();
  const { data: row } = await svc
    .from("appointments")
    .select(APT_SELECT)
    .eq("cancel_token", token)
    .maybeSingle();
  if (!row) return null;
  return {
    ...rowToAppointment(row as unknown as AppointmentRowWithCustomer),
    business_id: (row as { business_id: string }).business_id,
  };
}

/** Owner-side cancel by appointment id (RLS scopes). */
export async function cancelAppointmentByIdAsOwner(id: string): Promise<{
  ok: true;
  appointment: Appointment;
} | { ok: false; reason: "not_found" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_found" };

  const { data: row, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select(APT_SELECT)
    .single();
  if (error || !row) return { ok: false, reason: "not_found" };
  return {
    ok: true,
    appointment: rowToAppointment(row as unknown as AppointmentRowWithCustomer),
  };
}
