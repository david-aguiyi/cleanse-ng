/**
 * Cleaner eligibility for a booking (Blueprint §10.1). Selects ACTIVE, verified,
 * deployment-ready, AVAILABLE cleaners who serve the zone and are qualified for
 * the service, excluding those with a conflicting active assignment in a ±4h
 * window. Ranking uses a Postgres RPC so it stays close to the data.
 */
import "server-only";
import { serviceClient } from "@/db/service-client";

export interface EligibleCleaner {
  cleaner_id: string;
}

/**
 * Returns eligible cleaner ids ranked by reliability, excluding those already
 * offered/assigned for this booking. Implemented via the get_eligible_cleaners
 * RPC (see migration 0003).
 */
export async function getEligibleCleaners(
  bookingId: string,
  excludeCleanerIds: string[] = [],
  limit = 50
): Promise<string[]> {
  const { data, error } = await serviceClient().rpc("get_eligible_cleaners", {
    p_booking_id: bookingId,
    p_exclude: excludeCleanerIds,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []).map((r: Record<string, any>) => r.cleaner_id as string);
}
