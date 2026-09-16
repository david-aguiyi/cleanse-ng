# Testing & Acceptance Matrix (Blueprint §16)

How each acceptance test is addressed in this codebase. Items marked **manual**
require a live Supabase/Paystack/staging run.

| Test | Pass condition | Where it's enforced |
|---|---|---|
| Pricing tamper | Server ignores client total; uses quote snapshot | `pricing-service` computes from DB rules; client never sends a total (`app/book`) |
| Double payment init | ≤1 active intended payment | PENDING payment stored before init; init refused once SUCCESS/CONFIRMED (`payment-service.initializePaystack`) |
| Fake callback | Booking stays unconfirmed | `finalizePaystackPayment` verifies with Paystack; callback route redirects to error on failure |
| Webhook signature | 401 / ignored, no mutation | `verifyWebhookSignature` (constant-time HMAC-SHA512) in the webhook route |
| Duplicate webhook | One finalization, one `booking.confirmed`, one dispatch | `webhook_events` register (`storeOnce`) + guarded CONFIRMED transition |
| Wrong amount | Ops exception; never auto-confirm | `finalizePaystackPayment` amount check → `AMOUNT_MISMATCH` event |
| 10 simultaneous accepts | Exactly one WON; one active assignment | `claim_job_offer` RPC + `tests/concurrency` (**manual**, needs test DB) |
| GET preview scanner | No assignment on SMS link open | `/j/{code}` and offer detail are GET-only; claim is POST via `claim_job_offer` |
| No push token | SMS fallback path | `runOfferSmsFallback` sends when no active token |
| Invalid FCM token | Device inactive; SMS fallback | push gateway `markTokenInactive` on unregistered/invalid |
| SMS failure | Retry; visible; booking not lost | Inngest retries; notification row records FAILED; booking stays CONFIRMED |
| No cleaner accepts | EXCEPTION + urgent alert; customer CONFIRMED | dispatch escalation step → `escalateBooking` |
| Reassignment | Old assignment kept; new dispatch; card revoked | `reassign-service` (REASSIGNED + revoke share cards) |
| PII broadcast | No full address/contact in push/SMS | push payload + SMS body carry broad zone only |
| Cleaner authorization | 403/404, no leakage | `requireCleaner`; offer/job queries scoped by `cleaner_id` |
| Admin authorization | 403 unless role permits | `requireAdmin(roles)`; finance/create restricted |
| Historical pricing | Paid total/snapshot unchanged | `price_snapshot` on booking; `pricing_rules` versioned by effective window |
| Share card expiry | Gone page; no data | `getShareCardByToken` checks revoked/expiry |
