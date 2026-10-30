/**
 * Zod schemas for public trust-boundary input (Blueprint §14 Validation).
 * Unknown/invalid values are rejected before any domain logic runs.
 */
import { z } from "zod";

const E164 = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid international number, e.g. +2348012345678");

export const quoteRequestSchema = z.object({
  service_code: z.string().trim().min(1).max(40),
  zone_code: z.string().trim().min(1).max(40),
  property_bedrooms: z.number().int().min(1).max(10),
  requested_cleaner_count: z.number().int().min(1).max(10).default(1),
  frequency_code: z.string().trim().min(1).max(40).default("ONE_TIME"),
  extras: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const createBookingSchema = z.object({
  quote_id: z.string().uuid(),
  booking_mode: z.enum(["SCHEDULED", "ASAP"]).default("SCHEDULED"),
  scheduled_start_at: z
    .string()
    .datetime({ offset: true })
    .refine((v) => new Date(v).getTime() > Date.now(), {
      message: "Scheduled time must be in the future.",
    }),
  customer: z.object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    phone_e164: E164,
    whatsapp_e164: E164,
    marketing_opt_in: z.boolean().default(false),
  }),
  address: z.object({
    zone_code: z.string().trim().min(1).max(40),
    address_line1: z.string().trim().min(3).max(200),
    address_line2: z.string().trim().max(200).optional(),
    estate: z.string().trim().max(120).optional(),
    landmark: z.string().trim().max(200).optional(),
    directions: z.string().trim().max(500).optional(),
  }),
  customer_notes: z.string().trim().max(1000).optional(),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the service and cancellation terms." }),
  }),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

const E164_CLEANER = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid international number, e.g. +2348012345678");

/** Admin creates/onboards a cleaner (Blueprint §9.1). */
export const createCleanerSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  phone_e164: E164_CLEANER,
  whatsapp_e164: E164_CLEANER.optional(),
  bio: z.string().trim().max(1000).optional(),
  zone_codes: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  service_codes: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
});
export type CreateCleanerInput = z.infer<typeof createCleanerSchema>;

/** Admin updates a cleaner: approve/suspend/verify/deployment + profile + skills. */
export const updateCleanerSchema = z
  .object({
    full_name: z.string().trim().min(2).max(120).optional(),
    bio: z.string().trim().max(1000).optional(),
    whatsapp_e164: E164_CLEANER.optional(),
    account_status: z.enum(["ONBOARDING", "ACTIVE", "SUSPENDED", "INACTIVE"]).optional(),
    block_reason: z.string().trim().max(500).optional(),
    verified: z.boolean().optional(),
    deployment_ready: z.boolean().optional(),
    zone_codes: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    service_codes: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No changes provided." });
export type UpdateCleanerInput = z.infer<typeof updateCleanerSchema>;

/** Cleaner sets their own availability (Blueprint §7 PUT /cleaner/availability). */
export const availabilitySchema = z.object({
  available: z.boolean(),
});

/** Cleaner registers/updates an FCM device token (Blueprint §7, §9.2). */
export const registerDeviceSchema = z.object({
  fcm_token: z.string().trim().min(20).max(4096),
  platform: z.enum(["ANDROID_WEB", "IOS_WEB", "DESKTOP_WEB", "OTHER"]),
  push_permission: z.enum(["GRANTED", "DENIED", "UNKNOWN"]).default("GRANTED"),
  device_fingerprint: z.string().trim().max(200).optional(),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

/** Cleaner job status transition (Blueprint §7 POST /cleaner/jobs/{id}/status). */
export const jobStatusSchema = z.object({
  status: z.enum(["ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"]),
  // Optional end-of-job report, only meaningful on COMPLETED.
  report: z
    .object({
      notes: z.string().trim().max(2000).optional(),
      complaints: z.string().trim().max(2000).optional(),
      positives: z.string().trim().max(2000).optional(),
    })
    .optional(),
});

export const initPaymentSchema = z.object({
  // Client submits booking reference only; the server reloads the authoritative
  // total from Postgres (Blueprint §8.1). No amount is accepted from the client.
  callback_path: z.string().trim().startsWith("/").max(300).optional(),
});

// --------------------------------------------------------------------------
// Cleanse Pro applications (public /become-a-cleanse-pro form)
// --------------------------------------------------------------------------
export const APPLICATION_AREAS = [
  "Bodija", "Jericho", "Oluyole", "Akobo", "Iyaganku", "GRA", "Other",
] as const;
export const APPLICATION_LANGUAGES = ["English", "Yoruba", "Pidgin", "Igbo", "Hausa", "Other"] as const;
export const APPLICATION_PLACES = [
  "Private homes", "Hotel", "Office", "Cleaning company", "None",
] as const;
export const APPLICATION_DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
] as const;
export const APPLICATION_STATUSES = ["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"] as const;

/** Accepts 0803..., 234803... or +234803... and normalises to +234 E.164. */
const NigerianPhone = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const d = v.replace(/[^\d+]/g, "");
    if (/^0\d{10}$/.test(d)) return "+234" + d.slice(1);
    if (/^234\d{10}$/.test(d)) return "+" + d;
    return d;
  },
  z.string().regex(/^\+234\d{10}$/, "Enter a valid Nigerian phone number, e.g. 08031234567")
);

function ageOn(dob: string, now = new Date()): number {
  const b = new Date(dob + "T00:00:00Z");
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age -= 1;
  return age;
}

const shortText = (max: number) => z.string().trim().min(1).max(max);
const longText = z.string().trim().min(1, "Please answer this question.").max(2000);

export const cleanerApplicationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  whatsapp: NigerianPhone,
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
    .refine((v) => ageOn(v) >= 18, { message: "You must be 18 or older to apply." })
    .refine((v) => ageOn(v) <= 80, { message: "Please check your date of birth." }),
  gender: z.enum(["Female", "Male", "Prefer not to say"]),
  has_children: z.enum(["Yes", "No", "Prefer not to say"]),
  area: z.enum(APPLICATION_AREAS),
  landmark: z.string().trim().max(200).optional().default(""),
  languages: z.array(z.enum(APPLICATION_LANGUAGES)).min(1, "Choose at least one language."),
  heard_from: z.string().trim().max(200).optional().default(""),
  experience: z.enum(["None", "Under 1 year", "1 to 3 years", "3+ years"]),
  experience_places: z.array(z.enum(APPLICATION_PLACES)).min(1),
  available_days: z.array(z.enum(APPLICATION_DAYS)).min(1, "Choose at least one day."),
  start_when: z.enum(["Immediately", "Within 1 week", "Within 2 weeks", "In a month or more"]),
  transport: z.enum(["Own transport", "Keke or bus", "Okada"]),
  has_smartphone: z.boolean(),
  has_valid_id: z.boolean(),
  willing_guarantor: z.boolean(),
  can_give_references: z.boolean(),
  willing_training: z.boolean(),
  why_cleanse: longText,
  arrival_time: shortText(100),
  found_money: longText,
  days_per_week: shortText(100),
  attention_check: shortText(100),
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree to the privacy notice." }) }),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(0).optional().default(""),
});
export type CleanerApplicationInput = z.infer<typeof cleanerApplicationSchema>;

export const updateApplicationSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((v) => v.status !== undefined || v.note !== undefined, {
    message: "Nothing to update.",
  });
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
