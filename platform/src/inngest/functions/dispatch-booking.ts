/**
 * Durable dispatch flow (Blueprint §3.2, §10.3, §13). On booking/confirmed:
 *   round 1 -> push grace -> (SMS fallback, Stage 8) -> round 2 -> escalation.
 * Each step is checkpointed and retriable; a paid booking cannot silently stall.
 */
import { inngest } from "../client";
import { dispatchConfig } from "@/config";
import {
  createDispatchRound,
  getDispatchState,
  expireStaleOffers,
  escalateBooking,
} from "@/domain/dispatch/offer-service";
import { runOfferSmsFallback } from "@/domain/notification/sms-fallback";

export const dispatchBooking = inngest.createFunction(
  { id: "dispatch-booking", retries: 3 },
  { event: "booking/confirmed" },
  async ({ event, step }) => {
    const bookingId = event.data.bookingId;

    // Round 1.
    const round1 = await step.run("dispatch-round-1", async () => {
      const state = await getDispatchState(bookingId);
      if (!state.exists || state.terminal || state.fullyAssigned) return { skipped: true };
      return createDispatchRound(bookingId, { round: 1, size: dispatchConfig.round1Size });
    });

    // Push grace, then SMS fallback for still-active round-1 offers (Stage 8).
    await step.sleep("push-grace", `${dispatchConfig.pushGraceSeconds}s`);
    await step.run("sms-fallback-round-1", async () => {
      const state = await getDispatchState(bookingId);
      if (!state.exists || state.terminal || state.fullyAssigned) return { skipped: true };
      return runOfferSmsFallback(bookingId);
    });

    // Wait until round-2 window, then invite the next candidates if still needed.
    const remaining = Math.max(
      dispatchConfig.round2AfterSeconds - dispatchConfig.pushGraceSeconds,
      1
    );
    await step.sleep("wait-round-2", `${remaining}s`);
    await step.run("dispatch-round-2", async () => {
      await expireStaleOffers(bookingId);
      const state = await getDispatchState(bookingId);
      if (!state.exists || state.terminal || state.fullyAssigned) return { skipped: true };
      return createDispatchRound(bookingId, { round: 2, size: dispatchConfig.round2Size });
    });

    // Escalation window.
    const toEscalation = Math.max(
      dispatchConfig.escalationSeconds - dispatchConfig.round2AfterSeconds,
      1
    );
    await step.sleep("wait-escalation", `${toEscalation}s`);
    return step.run("escalate-if-unassigned", async () => {
      await expireStaleOffers(bookingId);
      const state = await getDispatchState(bookingId);
      if (!state.exists || state.terminal || state.fullyAssigned) return { escalated: false };
      await escalateBooking(bookingId);
      return { escalated: true };
    });
  }
);
