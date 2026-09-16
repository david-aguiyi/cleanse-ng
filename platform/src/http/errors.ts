/**
 * Domain error taxonomy. Every AppError maps cleanly to the standard error
 * envelope (Blueprint §7.1) with a stable machine code and safe HTTP status.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "QUOTE_NOT_FOUND"
  | "QUOTE_EXPIRED"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_NOT_BOOKABLE_ONLINE"
  | "ZONE_NOT_SERVICEABLE"
  | "PRICING_UNAVAILABLE"
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_PAYABLE"
  | "PAYMENT_INIT_FAILED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "AMOUNT_MISMATCH"
  | "OFFER_ALREADY_TAKEN"
  | "OFFER_NOT_ACTIVE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  QUOTE_NOT_FOUND: 404,
  QUOTE_EXPIRED: 409,
  SERVICE_NOT_FOUND: 404,
  SERVICE_NOT_BOOKABLE_ONLINE: 409,
  ZONE_NOT_SERVICEABLE: 409,
  PRICING_UNAVAILABLE: 409,
  BOOKING_NOT_FOUND: 404,
  BOOKING_NOT_PAYABLE: 409,
  PAYMENT_INIT_FAILED: 502,
  PAYMENT_VERIFICATION_FAILED: 502,
  AMOUNT_MISMATCH: 409,
  OFFER_ALREADY_TAKEN: 409,
  OFFER_NOT_ACTIVE: 409,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, details: unknown = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = STATUS[code];
    this.details = details;
  }
}
