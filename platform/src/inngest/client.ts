/**
 * Inngest client. Durable, checkpointed background work — payment finalization
 * follow-ups, dispatch rounds, offer expiry and escalation (Blueprint §2.1, §13).
 * The system must not depend on an open browser tab or a single server process
 * surviving multi-minute dispatch timers.
 */
import { Inngest, EventSchemas } from "inngest";

type Events = {
  "paystack/payment.succeeded": { data: { reference: string } };
  "booking/confirmed": { data: { bookingId: string; reference: string } };
};

export const inngest = new Inngest({
  id: "cleanse-ng",
  schemas: new EventSchemas().fromRecord<Events>(),
});

/** True when Inngest keys are present (production). In dev the CLI provides them. */
export function inngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY) || process.env.NODE_ENV !== "production";
}
