# Cleanse.ng Platform (Engineering Blueprint v2.0)

Next.js App Router + TypeScript booking platform: server-authoritative pricing,
guest-checkout bookings, and Paystack payments. This lives **alongside** the
existing static marketing site (repo root) and does not replace it yet.

This scaffold implements the blueprint's **Developer Build Order Stages 0–6**:

- **Stage 0 — Foundation:** project config, full Supabase migration + seed, error
  envelope, validation, logging, Supabase service client, dispatch config/flags.
- **Stage 1 — Pricing + booking domain:** `PricingService` (server-authoritative
  quotes), `BookingService` (AWAITING_PAYMENT drafts), `/api/v1/quotes`,
  `/api/v1/bookings`, and the customer booking wizard through Review.
- **Stage 2 — Paystack:** initialize / callback / webhook, idempotent
  `finalizePaystackPayment`, the customer confirmation page, and admin-visible
  paid bookings (via `booking_events`).
- **Stage 3 — Admin control centre:** Supabase Auth operator sign-in, role check
  against `admin_users`, live booking board (filters/search/SLA), full booking
  detail (customer + address, order, payment, timeline), the manual WhatsApp/call
  customer action panel, and timestamped operations notes with an audit log.
- **Stage 4 — Cleaner identity + profile:** admin cleaner onboarding (creates the
  Supabase Auth account + profile + zones/services), approve/suspend/verify/
  deployment-ready management, the cleaner PWA sign-in, home and profile screens,
  and the availability toggle **gated** so only ACTIVE + verified + deployment-ready
  cleaners can go AVAILABLE (the `isDeploymentReady` predicate).
- **Stage 5 — Cleaner PWA push:** installable PWA (manifest + service worker
  served with the Firebase web config), FCM token registration behind an explicit
  "Enable job alerts" opt-in (`POST /api/v1/cleaner/devices`), a server push
  gateway (Firebase Admin) that sends customer-safe payloads and marks invalid
  tokens inactive, and an ops device-health test push.
- **Stage 6 — Atomic assignment:** eligibility ranking (`get_eligible_cleaners`
  RPC, migration 0003), dispatch-round offer creation (admin **rebroadcast**,
  reused by Stage 7), the cleaner offer list/detail (customer-safe until won),
  and first-accept-wins accept via the `claim_job_offer` RPC — WON reveals full
  job details, everyone else gets "already taken". A concurrency integration test
  (`tests/concurrency`) proves exactly one winner for 10 simultaneous accepts
  (runs only with `CLEANSE_TEST_SUPABASE_URL` + `CLEANSE_TEST_SERVICE_ROLE_KEY`).

Stages 7–11 (durable Inngest dispatch, SMS fallback, WhatsApp cleaner handoff,
job execution, hardening) are **not** built here — see the blueprint for the
sequence. Clear `TODO(Stage N)` markers point to the extension seams (e.g.
`emitBookingConfirmed`).

Firebase is optional to build/run — push simply no-ops until you add the Firebase
env vars (client config + VAPID key + service account).

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
4. **Admin access (Stage 3):** create a Supabase Auth user (dashboard →
   Authentication → Users), then run `supabase/admin_bootstrap.sql` with that
   user's UUID to grant an operator role. Sign in at `/admin/login`.

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
