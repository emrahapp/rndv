"use server";

import {
  getCustomerById,
  listAppointmentsForCustomer,
} from "@/lib/db/appointments";
import type { Appointment, Customer } from "@/lib/appointments/types";

export type CustomerDetail = {
  customer: Customer;
  appointments: Appointment[];
};

export async function getCustomerDetailAction(
  id: string,
): Promise<CustomerDetail | null> {
  const customer = await getCustomerById(id);
  if (!customer) return null;
  const appointments = await listAppointmentsForCustomer(id);
  return { customer, appointments };
}
