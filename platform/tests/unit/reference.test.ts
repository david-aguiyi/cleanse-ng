import { describe, it, expect } from "vitest";
import { newBookingReference, newPaymentReference } from "@/domain/booking/reference";

describe("booking reference", () => {
  it("matches CLN-YYMMDD-XXXX and encodes the date", () => {
    const ref = newBookingReference(new Date("2026-09-16T00:00:00Z"));
    expect(ref).toMatch(/^CLN-260916-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("is unique across calls", () => {
    const set = new Set(Array.from({ length: 500 }, () => newBookingReference()));
    expect(set.size).toBe(500);
  });
});

describe("payment reference", () => {
  it("is CLN-PAY-prefixed and high entropy", () => {
    const ref = newPaymentReference();
    expect(ref).toMatch(/^CLN-PAY-[A-HJ-NP-Z2-9]{20}$/);
  });
});
