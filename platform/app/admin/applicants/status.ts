/** Pill colour per application status (reuses the board's pill classes). */
export const STATUS_PILL: Record<string, string> = {
  NEW: "pay-pending",
  REVIEWING: "ful-dispatching",
  SHORTLISTED: "ful-cleaner_assigned",
  REJECTED: "pay-failed",
  HIRED: "pay-success",
};
