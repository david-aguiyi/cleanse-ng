export interface FormattedPhone {
  raw: string;          // e.g. "08167734221"
  digits: string;       // e.g. "2348167734221"
  international: string;// e.g. "+2348167734221"
  display: string;      // e.g. "+234 816 773 4221"
  localDisplay: string; // e.g. "0816 773 4221"
  waUrl: string;        // e.g. "https://wa.me/2348167734221"
}

export const DEFAULT_WHATSAPP_NUMBER = "08167734221";

/**
 * Normalizes and formats any Nigerian phone number format:
 * - Local: 08167734221, 0816 773 4221
 * - International: +234 816 773 4221, +2348167734221
 * - Digits only: 2348167734221, 8167734221
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
  const raw = "0" + local10; // "08167734221"
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
