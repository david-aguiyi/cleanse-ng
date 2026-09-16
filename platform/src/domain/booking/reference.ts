/** Public + provider reference generation (Blueprint §7.3, §8.1). */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** Customer-facing booking reference, e.g. "CLN-260916-A82K". */
export function newBookingReference(now = new Date()): string {
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `CLN-${yy}${mm}${dd}-${randomToken(4)}`;
}

/** Unique Paystack provider reference, e.g. "CLN-PAY-01J8...". */
export function newPaymentReference(): string {
  return `CLN-PAY-${randomToken(20)}`;
}
