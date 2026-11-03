export interface FormattedPhone {
  raw: string;          // e.g. "09130663739"
  digits: string;       // e.g. "2349130663739"
  international: string;// e.g. "+2349130663739"
  display: string;      // e.g. "+234 913 066 3739"
  localDisplay: string; // e.g. "0913 066 3739"
  waUrl: string;        // e.g. "https://wa.me/2349130663739"
}

export const DEFAULT_WHATSAPP_NUMBER = "09130663739";

/**
 * Normalizes and formats any Nigerian phone number format:
 * - Local: 09130663739, 0913 066 3739
 * - International: +234 913 066 3739, +2349130663739
 * - Digits only: 2349130663739, 8167734221
 */
export function parseNigerianPhone(input: string): FormattedPhone | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d+]/g, "").trim();
  let digits = cleaned.replace(/\D/g, "");

  if (digits.startsWith("0") && digits.length === 11) {
    digits = "234" + digits.slice(1);
  } else if (digits.startsWith("234") && digits.length === 13) {
    // already full international without plus
  } else if (digits.length === 10) {
    digits = "234" + digits;
  } else {
    return null;
  }

  const local10 = digits.slice(3); // e.g. "8167734221"
  const raw = "0" + local10; // "09130663739"
  const part1 = local10.slice(0, 3);
  const part2 = local10.slice(3, 6);
  const part3 = local10.slice(6);

  return {
    raw,
    digits,
    international: `+${digits}`,
    display: `+234 ${part1} ${part2} ${part3}`,
    localDisplay: `0${part1} ${part2} ${part3}`,
    waUrl: `https://wa.me/${digits}`,
  };
}
