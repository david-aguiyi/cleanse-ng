/** Money helpers. All monetary values are stored in kobo (bigint) — never floats. */

/** Format kobo as a Naira display string, e.g. 1700000 -> "₦17,000". */
export function formatNairaFromKobo(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toLocaleString("en-NG")}`;
}
