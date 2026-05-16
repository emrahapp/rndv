export type AppointmentStatus = "confirmed" | "cancelled" | "completed";

/** Where did the appointment come from?
 *   "online" — the customer booked themselves via /u/[slug]
 *   "manual" — the owner created it from the admin panel
 */
export type AppointmentSource = "online" | "manual";

export type Appointment = {
  id: string;
  customerName: string;
  customerPhone: string;
  /** YYYY-MM-DD in business-local time */
  date: string;
  /** HH:MM in business-local time */
  time: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  cancelToken: string;
  createdAt: string;
};

export type Customer = {
  id: string;
  ad_soyad: string;
  telefon: string;
  lastBookingAt: string | null;
  totalBookings: number;
  createdAt: string;
};

/** Pending booking data we stash in `otp_codes.metadata` between
 *  customer form submit and OTP verification. */
export type PendingBookingMetadata = {
  business_id: string;
  business_name: string;
  business_phone: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  time: string;
};
