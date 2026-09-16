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

export const initPaymentSchema = z.object({
  // Client submits booking reference only; the server reloads the authoritative
  // total from Postgres (Blueprint §8.1). No amount is accepted from the client.
  callback_path: z.string().trim().startsWith("/").max(300).optional(),
});
