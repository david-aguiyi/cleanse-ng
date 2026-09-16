# Cleanse.ng Platform (Engineering Blueprint v2.0)

Next.js App Router + TypeScript booking platform: server-authoritative pricing,
guest-checkout bookings, and Paystack payments. This lives **alongside** the
existing static marketing site (repo root) and does not replace it yet.

This scaffold implements the blueprint's **Developer Build Order Stages 0–2**:

- **Stage 0 — Foundation:** project config, full Supabase migration + seed, error
  envelope, validation, logging, Supabase service client, dispatch config/flags.
- **Stage 1 — Pricing + booking domain:** `PricingService` (server-authoritative
  quotes), `BookingService` (AWAITING_PAYMENT drafts), `/api/v1/quotes`,
  `/api/v1/bookings`, and the customer booking wizard through Review.
- **Stage 2 — Paystack:** initialize / callback / webhook, idempotent
  `finalizePaystackPayment`, the customer confirmation page, and admin-visible
  paid bookings (via `booking_events`).

Stages 3–11 (admin control centre, cleaner PWA + FCM push, atomic dispatch,
durable Inngest workflows, SMS fallback, WhatsApp handoff, job execution,
hardening) are **not** built here — see the blueprint for the sequence. Clear
`TODO(Stage N)` markers point to the extension seams (e.g. `emitBookingConfirmed`).

## Getting started

```bash
cd platform
npm install
cp .env.example .env.local   # fill in Supabase + Paystack TEST keys
npm run dev
```

Apply the database schema + seed to your Supabase project:

```bash
# via the Supabase SQL editor or CLI, in order:
supabase/migrations/0001_baseline_schema.sql
supabase/migrations/0002_functions_rls.sql
supabase/seed.sql
```

### What you can run without external accounts

- `npm run typecheck`, `npm run lint`, `npm run test` (pure-unit tests).
- The booking UI renders. Quotes/bookings need Supabase; payment needs Paystack.

### Required to exercise the full Stage 0–2 path

1. A **Supabase** project — set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. **Paystack test** keys — `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`.
3. Register the webhook `POST {APP_URL}/api/v1/webhooks/paystack` in the
   Paystack dashboard for durable finalization.

## Key invariants honoured

- The browser never supplies the authoritative total — price is recomputed from
  DB pricing rules and snapshotted onto the quote/booking (§3.1, §16 pricing tamper).
- The callback and webhook both call the **same** idempotent
  `finalizePaystackPayment`; the booking transition is guarded so
  `booking.confirmed` is emitted exactly once (§8.2, §16 duplicate webhook).
- Verification requires `status=success` + matching reference + `currency=NGN` +
  exact expected amount before `CONFIRMED` (§8.2, §16 fake callback / wrong amount).
- The atomic first-accept-wins RPC `claim_job_offer` is installed for Stage 6;
  the service role is the only grantee (§5.3).

## Hardening notes (before production)

- Move `finalizePaystackPayment`'s payment+booking writes into a single Postgres
  function/transaction (currently a guarded two-step update — idempotent but not
  atomic across both rows).
- Add rate limiting to quote/booking/payment-init endpoints (§14).
- Replace the inline webhook finalize with an Inngest dispatch (§13, Stage 7).
- Add the signed-token `GET /api/v1/bookings/{ref}/confirmation` gate (§7).
