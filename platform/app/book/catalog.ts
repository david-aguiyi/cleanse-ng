/**
 * Client-side catalog for the booking UI. Mirrors seed.sql. These drive the
 * selectable options only — the authoritative price always comes from the
 * server /api/v1/quotes endpoint, never from these values.
 */
export interface ServiceOption {
  code: string;
  name: string;
  sub: string;
  bookableOnline: boolean;
}

export const SERVICES: ServiceOption[] = [
  { code: "REGULAR", name: "Regular Cleaning", sub: "Standard residential clean", bookableOnline: true },
  { code: "DEEP", name: "Deep Cleaning", sub: "Intensive top-to-bottom", bookableOnline: false },
  { code: "MOVE", name: "Move-in / Move-out", sub: "End-of-tenancy clean", bookableOnline: false },
  { code: "POSTFUMIGATION", name: "Post-fumigation", sub: "After fumigation treatment", bookableOnline: false },
];

export const ZONES = [
  { code: "BODIJA", name: "Bodija" },
  { code: "AKOBO", name: "Akobo" },
  { code: "JERICHO", name: "Jericho" },
  { code: "OLUYOLE", name: "Oluyole" },
  { code: "IYAGANKU", name: "Iyaganku" },
];

export const BEDROOMS = [1, 2, 3, 4, 5];

export const EXTRAS = [
  { code: "FRIDGE", name: "Inside fridge" },
  { code: "OVEN", name: "Inside oven" },
  { code: "LAUNDRY", name: "Laundry & fold" },
  { code: "WINDOWS", name: "Interior windows" },
];

export const WHATSAPP_HELP = "https://wa.me/2349130663739";
