/** Domain types (Blueprint Appendix B.1). */
export type CustomerBookingStatus =
  | "DRAFT"
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type FulfilmentStatus =
  | "UNASSIGNED"
  | "DISPATCHING"
  | "PARTIALLY_ASSIGNED"
  | "CLEANER_ASSIGNED"
  | "ON_THE_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EXCEPTION"
  | "CANCELLED";

export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type ClaimResult =
  | { result: "WON"; bookingReference: string; slotNumber: number }
  | { result: "ALREADY_TAKEN" }
  | { result: "OFFER_NOT_ACTIVE" };

export interface PriceLineItem {
  item_type: "BASE_SERVICE" | "EXTRA" | "DISCOUNT" | "ADJUSTMENT";
  code: string;
  description: string;
  quantity: number;
  unit_amount_kobo: number;
  line_total_kobo: number;
}

export interface QuoteResult {
  quoteId: string;
  currency: string;
  subtotalKobo: number;
  extrasKobo: number;
  totalKobo: number;
  serviceFeeBps: number;
  displayTotal: string;
  expiresAt: string;
  lineItems: PriceLineItem[];
}
