import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { paymentSucceeded } from "@/inngest/functions/payment-succeeded";
import { dispatchBooking } from "@/inngest/functions/dispatch-booking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Inngest serve endpoint — registers the durable functions (Blueprint §13).
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [paymentSucceeded, dispatchBooking],
});
