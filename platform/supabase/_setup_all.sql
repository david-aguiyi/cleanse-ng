-- Cleanse.ng — full database setup (migrations 0001-0007 + seed) in one file.
-- Run once on a fresh Supabase project.

-- ============================
-- migrations/0001_baseline_schema.sql
-- ============================
-- Cleanse.ng V2 baseline migration — schema (Blueprint §5.2)
-- Monetary values are stored in kobo as bigint.
-- Timestamps use timestamptz and are stored in UTC. UI displays Africa/Lagos.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type customer_booking_status as enum
  ('DRAFT','AWAITING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED');

create type fulfilment_status as enum
  ('UNASSIGNED','DISPATCHING','PARTIALLY_ASSIGNED','CLEANER_ASSIGNED',
   'ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','EXCEPTION','CANCELLED');

create type payment_status as enum
  ('PENDING','SUCCESS','FAILED','PARTIALLY_REFUNDED','REFUNDED');

create type cleaner_account_status as enum
  ('ONBOARDING','ACTIVE','SUSPENDED','INACTIVE');

create type availability_status as enum ('AVAILABLE','UNAVAILABLE');

create type job_offer_status as enum
  ('CREATED','PUSH_SENT','SMS_SENT','VIEWED','ACCEPTED','DECLINED','LOST','EXPIRED','FAILED');

create type assignment_status as enum
  ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','REASSIGNED');

create type notification_channel as enum ('PUSH','SMS','ADMIN_INAPP','EMAIL');

create type notification_status as enum ('QUEUED','SENT','DELIVERED','FAILED','SKIPPED');

create type admin_role as enum
  ('SUPER_ADMIN','OPERATIONS','DISPATCHER','CUSTOMER_SUPPORT','FINANCE');

-- ---------------------------------------------------------------------------
-- Customers & addresses
-- ---------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone_e164 text not null,
  whatsapp_e164 text not null,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_whatsapp_idx on customers (whatsapp_e164);
create index customers_email_idx on customers (lower(email));

create table service_zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  city text not null default 'Ibadan',
  state text not null default 'Oyo',
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  zone_id uuid references service_zones(id),
  address_line1 text not null,
  address_line2 text,
  estate text,
  landmark text,
  city text not null default 'Ibadan',
  state text not null default 'Oyo',
  latitude numeric(9,6),
  longitude numeric(9,6),
  directions text,
  created_at timestamptz not null default now()
);
create index customer_addresses_customer_idx on customer_addresses(customer_id);
create index customer_addresses_zone_idx on customer_addresses(zone_id);

-- ---------------------------------------------------------------------------
-- Services, extras & pricing
-- ---------------------------------------------------------------------------
create table services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  pricing_mode text not null check (pricing_mode in ('FIXED_RULES','MANUAL_QUOTE')),
  active boolean not null default true,
  requires_photos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table service_extras (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  unique(service_id, code)
);

create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  property_bedrooms integer,
  extra_id uuid references service_extras(id),
  cleaner_count integer,
  frequency_code text,
  amount_kobo bigint not null check (amount_kobo >= 0),
  service_fee_bps integer not null default 2000 check (service_fee_bps between 0 and 10000),
  effective_from timestamptz not null,
  effective_to timestamptz,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);
create index pricing_rules_lookup_idx
  on pricing_rules(service_id, property_bedrooms, active, effective_from);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id),
  zone_id uuid references service_zones(id),
  property_bedrooms integer,
  requested_cleaner_count integer not null default 1 check (requested_cleaner_count > 0),
  frequency_code text,
  subtotal_kobo bigint not null,
  extras_kobo bigint not null default 0,
  total_kobo bigint not null,
  currency text not null default 'NGN',
  service_fee_bps integer not null default 2000,
  calculation_snapshot jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  customer_id uuid not null references customers(id),
  address_id uuid not null references customer_addresses(id),
  quote_id uuid references quotes(id),
  service_id uuid not null references services(id),
  zone_id uuid references service_zones(id),
  booking_mode text not null default 'SCHEDULED' check (booking_mode in ('SCHEDULED','ASAP')),
  scheduled_start_at timestamptz not null,
  requested_cleaner_count integer not null default 1 check (requested_cleaner_count > 0),
  property_bedrooms integer,
  customer_status customer_booking_status not null default 'AWAITING_PAYMENT',
  fulfilment_status fulfilment_status not null default 'UNASSIGNED',
  payment_status payment_status not null default 'PENDING',
  assigned_cleaner_id uuid,
  subtotal_kobo bigint not null,
  extras_kobo bigint not null default 0,
  discount_kobo bigint not null default 0,
  total_kobo bigint not null,
  currency text not null default 'NGN',
  service_fee_bps integer not null default 2000,
  price_snapshot jsonb not null,
  customer_notes text,
  operations_notes text,
  confirmed_at timestamptz,
  assigned_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_schedule_idx on bookings(scheduled_start_at);
create index bookings_ops_idx on bookings(payment_status, fulfilment_status, scheduled_start_at);
create index bookings_customer_idx on bookings(customer_id, created_at desc);

create table booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  item_type text not null check (item_type in ('BASE_SERVICE','EXTRA','DISCOUNT','ADJUSTMENT')),
  code text not null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_amount_kobo bigint not null,
  line_total_kobo bigint not null,
  metadata jsonb not null default '{}'::jsonb
);
create index booking_items_booking_idx on booking_items(booking_id);

-- ---------------------------------------------------------------------------
-- Payments & refunds
-- ---------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  provider text not null default 'PAYSTACK',
  provider_reference text not null unique,
  provider_transaction_id bigint,
  expected_amount_kobo bigint not null,
  paid_amount_kobo bigint,
  currency text not null default 'NGN',
  status payment_status not null default 'PENDING',
  channel text,
  paid_at timestamptz,
  verified_at timestamptz,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_idx on payments(booking_id, created_at desc);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  payment_id uuid not null references payments(id),
  provider_reference text,
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text not null,
  status text not null check (status in ('REQUESTED','PROCESSING','SUCCESS','FAILED')),
  requested_by uuid,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  provider_payload jsonb
);

-- ---------------------------------------------------------------------------
-- Cleaners & related
-- ---------------------------------------------------------------------------
create table cleaners (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  cleaner_code text not null unique,
  full_name text not null,
  email text,
  phone_e164 text not null unique,
  whatsapp_e164 text,
  bio text,
  photo_path text,
  account_status cleaner_account_status not null default 'ONBOARDING',
  availability availability_status not null default 'UNAVAILABLE',
  verified boolean not null default false,
  deployment_ready boolean not null default false,
  rating numeric(3,2),
  completed_jobs integer not null default 0,
  acceptance_rate numeric(5,2),
  completion_rate numeric(5,2),
  cancellation_rate numeric(5,2),
  work_rate_label text,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table bookings
  add constraint bookings_assigned_cleaner_fk
  foreign key (assigned_cleaner_id) references cleaners(id);

create table cleaner_zones (
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  zone_id uuid not null references service_zones(id) on delete cascade,
  priority integer not null default 100,
  primary key(cleaner_id, zone_id)
);

create table cleaner_services (
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  approved boolean not null default true,
  approved_at timestamptz not null default now(),
  primary key(cleaner_id, service_id)
);

create table cleaner_availability (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  available boolean not null default true,
  source text not null default 'CLEANER',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index cleaner_availability_lookup_idx
  on cleaner_availability(cleaner_id, starts_at, ends_at);

create table cleaner_devices (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  device_fingerprint text,
  platform text not null check (platform in ('ANDROID_WEB','IOS_WEB','DESKTOP_WEB','OTHER')),
  fcm_token text unique,
  push_permission text not null default 'UNKNOWN' check (push_permission in ('UNKNOWN','GRANTED','DENIED')),
  is_active boolean not null default true,
  last_seen_at timestamptz,
  token_updated_at timestamptz,
  created_at timestamptz not null default now()
);
create index cleaner_devices_cleaner_idx on cleaner_devices(cleaner_id, is_active);

-- ---------------------------------------------------------------------------
-- Job offers & assignments
-- ---------------------------------------------------------------------------
create table job_offers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  dispatch_round integer not null,
  slot_number integer not null default 1 check (slot_number > 0),
  status job_offer_status not null default 'CREATED',
  secure_token_hash text,
  offered_at timestamptz not null default now(),
  push_sent_at timestamptz,
  sms_sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  unique(booking_id, cleaner_id, dispatch_round, slot_number)
);
create index job_offers_booking_status_idx on job_offers(booking_id, status);
create index job_offers_cleaner_idx on job_offers(cleaner_id, offered_at desc);

create table job_assignments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  cleaner_id uuid not null references cleaners(id),
  source_offer_id uuid references job_offers(id),
  slot_number integer not null default 1 check (slot_number > 0),
  status assignment_status not null default 'ASSIGNED',
  assigned_at timestamptz not null default now(),
  on_the_way_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index one_active_assignment_per_booking_slot
  on job_assignments(booking_id, slot_number)
  where status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');
create unique index one_active_assignment_per_cleaner_per_booking
  on job_assignments(booking_id, cleaner_id)
  where status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');
create index job_assignments_cleaner_idx on job_assignments(cleaner_id, assigned_at desc);

-- ---------------------------------------------------------------------------
-- Notifications, events, admin, audit, share cards, webhook register
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete cascade,
  cleaner_id uuid references cleaners(id) on delete cascade,
  job_offer_id uuid references job_offers(id) on delete cascade,
  channel notification_channel not null,
  provider text not null,
  recipient text not null,
  template_code text not null,
  status notification_status not null default 'QUEUED',
  provider_message_id text,
  attempt_count integer not null default 0,
  estimated_cost_minor bigint,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_offer_idx on notifications(job_offer_id, channel, status);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  role admin_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table booking_events (
  id bigserial primary key,
  booking_id uuid not null references bookings(id) on delete cascade,
  event_type text not null,
  actor_type text not null check (actor_type in ('SYSTEM','CUSTOMER','CLEANER','ADMIN','PROVIDER')),
  actor_id uuid,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index booking_events_timeline_idx on booking_events(booking_id, created_at);

create table audit_logs (
  id bigserial primary key,
  actor_auth_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id, created_at desc);

create table cleaner_share_cards (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  cleaner_id uuid not null references cleaners(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  payload_hash text not null,
  event_type text,
  reference text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'RECEIVED'
    check (processing_status in ('RECEIVED','PROCESSED','IGNORED','FAILED')),
  payload jsonb not null,
  unique(provider, payload_hash)
);

-- ============================
-- migrations/0002_functions_rls.sql
-- ============================
-- Cleanse.ng V2 — functions, atomic claim, triggers, RLS (Blueprint §5.3, §6.2, Appendix A.1)

-- ---------------------------------------------------------------------------
-- updated_at trigger (Appendix A.1)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create trigger cleaners_set_updated_at
  before update on cleaners
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic first-accept-wins claim (Blueprint §5.3)
--
-- Race-condition invariant: never "check then assign" in separate operations.
-- Every cleaner acceptance goes through this single database operation. For a
-- one-cleaner job exactly one cleaner fills slot 1; for multi-cleaner bookings
-- each slot has at most one active cleaner, and one cleaner cannot fill two
-- slots on the same booking.
-- ---------------------------------------------------------------------------
create or replace function claim_job_offer(
  p_offer_id uuid,
  p_cleaner_id uuid
)
returns table (
  won boolean,
  booking_id uuid,
  result_code text,
  slot_number integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offer job_offers%rowtype;
  v_booking bookings%rowtype;
  v_active_count integer;
begin
  select * into v_offer
  from job_offers
  where id = p_offer_id
    and cleaner_id = p_cleaner_id
  for update;

  if not found then
    return query select false, null::uuid, 'OFFER_NOT_FOUND', null::integer;
    return;
  end if;

  if v_offer.status not in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED')
     or v_offer.expires_at <= now() then
    return query select false, v_offer.booking_id, 'OFFER_NOT_ACTIVE', v_offer.slot_number;
    return;
  end if;

  -- Serialize every claim for this booking, including multi-cleaner crew slots.
  perform pg_advisory_xact_lock(hashtextextended(v_offer.booking_id::text, 0));

  select * into v_booking
  from bookings
  where id = v_offer.booking_id
  for update;

  if v_booking.payment_status <> 'SUCCESS'
     or v_booking.customer_status <> 'CONFIRMED'
     or v_booking.fulfilment_status in ('COMPLETED','CANCELLED') then
    return query select false, v_offer.booking_id, 'BOOKING_NOT_CLAIMABLE', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments
    where booking_id = v_offer.booking_id
      and slot_number = v_offer.slot_number
      and status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    update job_offers set status = 'LOST' where id = p_offer_id;
    return query select false, v_offer.booking_id, 'ALREADY_TAKEN', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments
    where booking_id = v_offer.booking_id
      and cleaner_id = p_cleaner_id
      and status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_ALREADY_ON_BOOKING', v_offer.slot_number;
    return;
  end if;

  insert into job_assignments(booking_id, cleaner_id, source_offer_id, slot_number, status)
  values (v_offer.booking_id, p_cleaner_id, p_offer_id, v_offer.slot_number, 'ASSIGNED');

  update job_offers
     set status = case when id = p_offer_id then 'ACCEPTED'::job_offer_status else 'LOST'::job_offer_status end,
         accepted_at = case when id = p_offer_id then now() else accepted_at end
   where booking_id = v_offer.booking_id
     and slot_number = v_offer.slot_number
     and status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED');

  select count(*) into v_active_count
  from job_assignments
  where booking_id = v_offer.booking_id
    and status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');

  update bookings
     set assigned_cleaner_id = coalesce(assigned_cleaner_id, p_cleaner_id),
         fulfilment_status = case
           when v_active_count >= requested_cleaner_count then 'CLEANER_ASSIGNED'::fulfilment_status
           else 'PARTIALLY_ASSIGNED'::fulfilment_status
         end,
         assigned_at = coalesce(assigned_at, now()),
         updated_at = now()
   where id = v_offer.booking_id;

  insert into booking_events(booking_id,event_type,actor_type,actor_id,data)
  values (v_offer.booking_id,'cleaner.assigned','CLEANER',p_cleaner_id,
          jsonb_build_object('offer_id',p_offer_id,'slot_number',v_offer.slot_number));

  return query select true, v_offer.booking_id, 'WON', v_offer.slot_number;
end;
$$;

-- Only the trusted server service role should invoke this RPC.
revoke all on function claim_job_offer(uuid,uuid) from public;
revoke all on function claim_job_offer(uuid,uuid) from anon;
revoke all on function claim_job_offer(uuid,uuid) from authenticated;
grant execute on function claim_job_offer(uuid,uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row-Level Security baseline (Blueprint §6.2)
-- ---------------------------------------------------------------------------
alter table cleaners enable row level security;
alter table cleaner_devices enable row level security;
alter table job_offers enable row level security;
alter table job_assignments enable row level security;
alter table bookings enable row level security;

-- Helper mapping auth.uid() -> active cleaner id.
create or replace function current_cleaner_id()
returns uuid
language sql
stable
security invoker
set search_path = public
as $$
  select id from cleaners where auth_user_id = auth.uid() and account_status = 'ACTIVE';
$$;

-- Cleaner can read only own profile/offers/assignments if direct reads are used.
create policy cleaner_reads_self
  on cleaners for select to authenticated
  using (auth_user_id = auth.uid());

create policy cleaner_reads_own_offers
  on job_offers for select to authenticated
  using (cleaner_id = current_cleaner_id());

create policy cleaner_reads_own_assignments
  on job_assignments for select to authenticated
  using (cleaner_id = current_cleaner_id());

-- Do not grant cleaner direct UPDATE on assignment/booking rows.
-- State transitions go through server APIs/domain services (service role).

-- ============================
-- migrations/0003_eligibility_fn.sql
-- ============================
-- Cleanse.ng V2 — eligibility ranking function (Blueprint §10.1)
-- Ranks ACTIVE + verified + deployment-ready + AVAILABLE cleaners who serve the
-- booking's zone and are qualified for its service, excluding those with a
-- conflicting active assignment in a ±4h window and any explicitly excluded ids.

create or replace function get_eligible_cleaners(
  p_booking_id uuid,
  p_exclude uuid[] default '{}',
  p_limit integer default 50
)
returns table (cleaner_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    return;
  end if;

  return query
  select c.id
  from cleaners c
  join cleaner_zones cz on cz.cleaner_id = c.id
  join cleaner_services cs on cs.cleaner_id = c.id and cs.approved = true
  where c.account_status = 'ACTIVE'
    and c.verified = true
    and c.deployment_ready = true
    and c.availability = 'AVAILABLE'
    and cz.zone_id = v_booking.zone_id
    and cs.service_id = v_booking.service_id
    and not (c.id = any(p_exclude))
    and not exists (
      select 1
      from job_assignments ja
      join bookings b2 on b2.id = ja.booking_id
      where ja.cleaner_id = c.id
        and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
        and tstzrange(b2.scheduled_start_at,
                      b2.scheduled_start_at + interval '4 hours', '[)')
            && tstzrange(v_booking.scheduled_start_at,
                         v_booking.scheduled_start_at + interval '4 hours', '[)')
    )
    -- Exclude cleaners already offered this booking in any active offer.
    and not exists (
      select 1 from job_offers jo
      where jo.booking_id = p_booking_id
        and jo.cleaner_id = c.id
        and jo.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED','ACCEPTED')
    )
  order by
    coalesce(c.completion_rate, 100) desc,
    coalesce(c.rating, 5) desc,
    c.last_active_at desc nulls last
  limit p_limit;
end;
$$;

revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from public;
revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from anon;
grant execute on function get_eligible_cleaners(uuid, uuid[], integer) to service_role;

-- ============================
-- migrations/0004_rls_hardening.sql
-- ============================
-- Cleanse.ng V2 — RLS hardening (Blueprint §6, §14).
-- All privileged reads/writes go through the server-side service role, which
-- bypasses RLS. Enabling RLS on the remaining exposed tables WITHOUT permissive
-- policies denies anon/authenticated direct access by default (deny-by-default),
-- closing accidental data exposure via the public API keys.

alter table customers enable row level security;
alter table customer_addresses enable row level security;
alter table quotes enable row level security;
alter table booking_items enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table notifications enable row level security;
alter table booking_events enable row level security;
alter table audit_logs enable row level security;
alter table admin_users enable row level security;
alter table cleaner_zones enable row level security;
alter table cleaner_services enable row level security;
alter table cleaner_availability enable row level security;
alter table cleaner_share_cards enable row level security;
alter table webhook_events enable row level security;
alter table service_zones enable row level security;
alter table services enable row level security;
alter table service_extras enable row level security;
alter table pricing_rules enable row level security;

-- Public catalog reads (services, zones, extras) may be exposed read-only if the
-- UI ever reads them directly with the anon key. The booking UI currently uses
-- the server APIs, so we keep these deny-by-default and add read policies only
-- if/when direct client reads are introduced. Example (commented) template:
--   create policy anon_reads_active_services on services
--     for select to anon using (active = true);

-- Revoke broad table grants from the anonymous/authenticated roles that are not
-- needed (defense in depth; service role retains full access).
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- ============================
-- migrations/0005_fix_claim_ambiguity.sql
-- ============================
-- Cleanse.ng V2 — fix ambiguous column references in claim_job_offer.
-- The function's OUT columns (booking_id, slot_number) collided with the
-- job_offers/job_assignments columns inside WHERE/SET clauses ("column
-- reference booking_id is ambiguous"). Qualify every table column so the
-- planner never confuses them with the output parameters.

create or replace function claim_job_offer(
  p_offer_id uuid,
  p_cleaner_id uuid
)
returns table (
  won boolean,
  booking_id uuid,
  result_code text,
  slot_number integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offer job_offers%rowtype;
  v_booking bookings%rowtype;
  v_active_count integer;
begin
  select * into v_offer
  from job_offers
  where job_offers.id = p_offer_id
    and job_offers.cleaner_id = p_cleaner_id
  for update;

  if not found then
    return query select false, null::uuid, 'OFFER_NOT_FOUND', null::integer;
    return;
  end if;

  if v_offer.status not in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED')
     or v_offer.expires_at <= now() then
    return query select false, v_offer.booking_id, 'OFFER_NOT_ACTIVE', v_offer.slot_number;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_offer.booking_id::text, 0));

  select * into v_booking
  from bookings
  where bookings.id = v_offer.booking_id
  for update;

  if v_booking.payment_status <> 'SUCCESS'
     or v_booking.customer_status <> 'CONFIRMED'
     or v_booking.fulfilment_status in ('COMPLETED','CANCELLED') then
    return query select false, v_offer.booking_id, 'BOOKING_NOT_CLAIMABLE', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments ja
    where ja.booking_id = v_offer.booking_id
      and ja.slot_number = v_offer.slot_number
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    update job_offers set status = 'LOST' where job_offers.id = p_offer_id;
    return query select false, v_offer.booking_id, 'ALREADY_TAKEN', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments ja
    where ja.booking_id = v_offer.booking_id
      and ja.cleaner_id = p_cleaner_id
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_ALREADY_ON_BOOKING', v_offer.slot_number;
    return;
  end if;

  insert into job_assignments(booking_id, cleaner_id, source_offer_id, slot_number, status)
  values (v_offer.booking_id, p_cleaner_id, p_offer_id, v_offer.slot_number, 'ASSIGNED');

  update job_offers
     set status = case when job_offers.id = p_offer_id then 'ACCEPTED'::job_offer_status else 'LOST'::job_offer_status end,
         accepted_at = case when job_offers.id = p_offer_id then now() else job_offers.accepted_at end
   where job_offers.booking_id = v_offer.booking_id
     and job_offers.slot_number = v_offer.slot_number
     and job_offers.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED');

  select count(*) into v_active_count
  from job_assignments ja
  where ja.booking_id = v_offer.booking_id
    and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');

  update bookings
     set assigned_cleaner_id = coalesce(bookings.assigned_cleaner_id, p_cleaner_id),
         fulfilment_status = case
           when v_active_count >= bookings.requested_cleaner_count then 'CLEANER_ASSIGNED'::fulfilment_status
           else 'PARTIALLY_ASSIGNED'::fulfilment_status
         end,
         assigned_at = coalesce(bookings.assigned_at, now()),
         updated_at = now()
   where bookings.id = v_offer.booking_id;

  insert into booking_events(booking_id,event_type,actor_type,actor_id,data)
  values (v_offer.booking_id,'cleaner.assigned','CLEANER',p_cleaner_id,
          jsonb_build_object('offer_id',p_offer_id,'slot_number',v_offer.slot_number));

  return query select true, v_offer.booking_id, 'WON', v_offer.slot_number;
end;
$$;

revoke all on function claim_job_offer(uuid,uuid) from public;
revoke all on function claim_job_offer(uuid,uuid) from anon;
revoke all on function claim_job_offer(uuid,uuid) from authenticated;
grant execute on function claim_job_offer(uuid,uuid) to service_role;

-- ============================
-- migrations/0006_fair_dispatch.sql
-- ============================
-- Cleanse.ng V2 — fair dispatch (spread work + 2-hour busy lock).
--
-- 1. get_eligible_cleaners now ranks by CURRENT WORKLOAD first (fewest recent
--    jobs win), so work spreads across the network instead of always going to
--    the single highest-rated cleaner. Reliability is the tie-breaker.
-- 2. A job is estimated at 2 hours. A cleaner with an active assignment whose
--    2-hour block overlaps the candidate job is excluded (eligibility) AND
--    blocked at claim time (claim_job_offer), so one cleaner can never hold two
--    overlapping jobs.
--
-- JOB_BLOCK below is the pilot job-duration estimate; change '2 hours' to retune.

create or replace function get_eligible_cleaners(
  p_booking_id uuid,
  p_exclude uuid[] default '{}',
  p_limit integer default 50
)
returns table (cleaner_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
begin
  select * into v_booking from bookings where id = p_booking_id;
  if not found then
    return;
  end if;

  return query
  select c.id
  from cleaners c
  join cleaner_zones cz on cz.cleaner_id = c.id
  join cleaner_services cs on cs.cleaner_id = c.id and cs.approved = true
  where c.account_status = 'ACTIVE'
    and c.verified = true
    and c.deployment_ready = true
    and c.availability = 'AVAILABLE'
    and cz.zone_id = v_booking.zone_id
    and cs.service_id = v_booking.service_id
    and not (c.id = any(p_exclude))
    -- 2-hour busy lock: no active assignment whose 2h block overlaps this job.
    and not exists (
      select 1
      from job_assignments ja
      join bookings b2 on b2.id = ja.booking_id
      where ja.cleaner_id = c.id
        and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
        and tstzrange(b2.scheduled_start_at,
                      b2.scheduled_start_at + interval '2 hours', '[)')
            && tstzrange(v_booking.scheduled_start_at,
                         v_booking.scheduled_start_at + interval '2 hours', '[)')
    )
    -- not already offered this booking in an active/accepted offer
    and not exists (
      select 1 from job_offers jo
      where jo.booking_id = p_booking_id
        and jo.cleaner_id = c.id
        and jo.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED','ACCEPTED')
    )
  order by
    -- FAIRNESS: fewest jobs in the last 24h first, so work spreads around.
    (select count(*) from job_assignments ja2
       where ja2.cleaner_id = c.id
         and ja2.assigned_at > now() - interval '24 hours') asc,
    coalesce(c.completion_rate, 100) desc,
    coalesce(c.rating, 5) desc,
    c.last_active_at desc nulls last
  limit p_limit;
end;
$$;

revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from public;
revoke all on function get_eligible_cleaners(uuid, uuid[], integer) from anon;
grant execute on function get_eligible_cleaners(uuid, uuid[], integer) to service_role;

-- ---------------------------------------------------------------------------
-- claim_job_offer: add the 2-hour busy-lock guard so a cleaner can never accept
-- a second job overlapping one they already hold (defense in depth).
-- ---------------------------------------------------------------------------
create or replace function claim_job_offer(
  p_offer_id uuid,
  p_cleaner_id uuid
)
returns table (
  won boolean,
  booking_id uuid,
  result_code text,
  slot_number integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offer job_offers%rowtype;
  v_booking bookings%rowtype;
  v_active_count integer;
begin
  select * into v_offer
  from job_offers
  where job_offers.id = p_offer_id
    and job_offers.cleaner_id = p_cleaner_id
  for update;

  if not found then
    return query select false, null::uuid, 'OFFER_NOT_FOUND', null::integer;
    return;
  end if;

  if v_offer.status not in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED')
     or v_offer.expires_at <= now() then
    return query select false, v_offer.booking_id, 'OFFER_NOT_ACTIVE', v_offer.slot_number;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_offer.booking_id::text, 0));

  select * into v_booking
  from bookings
  where bookings.id = v_offer.booking_id
  for update;

  if v_booking.payment_status <> 'SUCCESS'
     or v_booking.customer_status <> 'CONFIRMED'
     or v_booking.fulfilment_status in ('COMPLETED','CANCELLED') then
    return query select false, v_offer.booking_id, 'BOOKING_NOT_CLAIMABLE', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments ja
    where ja.booking_id = v_offer.booking_id
      and ja.slot_number = v_offer.slot_number
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    update job_offers set status = 'LOST' where job_offers.id = p_offer_id;
    return query select false, v_offer.booking_id, 'ALREADY_TAKEN', v_offer.slot_number;
    return;
  end if;

  if exists (
    select 1 from job_assignments ja
    where ja.booking_id = v_offer.booking_id
      and ja.cleaner_id = p_cleaner_id
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_ALREADY_ON_BOOKING', v_offer.slot_number;
    return;
  end if;

  -- 2-hour busy lock across OTHER bookings.
  if exists (
    select 1 from job_assignments ja
    join bookings b2 on b2.id = ja.booking_id
    where ja.cleaner_id = p_cleaner_id
      and ja.booking_id <> v_offer.booking_id
      and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS')
      and tstzrange(b2.scheduled_start_at,
                    b2.scheduled_start_at + interval '2 hours', '[)')
          && tstzrange(v_booking.scheduled_start_at,
                       v_booking.scheduled_start_at + interval '2 hours', '[)')
  ) then
    return query select false, v_offer.booking_id, 'CLEANER_TIME_CONFLICT', v_offer.slot_number;
    return;
  end if;

  insert into job_assignments(booking_id, cleaner_id, source_offer_id, slot_number, status)
  values (v_offer.booking_id, p_cleaner_id, p_offer_id, v_offer.slot_number, 'ASSIGNED');

  update job_offers
     set status = case when job_offers.id = p_offer_id then 'ACCEPTED'::job_offer_status else 'LOST'::job_offer_status end,
         accepted_at = case when job_offers.id = p_offer_id then now() else job_offers.accepted_at end
   where job_offers.booking_id = v_offer.booking_id
     and job_offers.slot_number = v_offer.slot_number
     and job_offers.status in ('CREATED','PUSH_SENT','SMS_SENT','VIEWED');

  select count(*) into v_active_count
  from job_assignments ja
  where ja.booking_id = v_offer.booking_id
    and ja.status in ('ASSIGNED','ON_THE_WAY','ARRIVED','IN_PROGRESS');

  update bookings
     set assigned_cleaner_id = coalesce(bookings.assigned_cleaner_id, p_cleaner_id),
         fulfilment_status = case
           when v_active_count >= bookings.requested_cleaner_count then 'CLEANER_ASSIGNED'::fulfilment_status
           else 'PARTIALLY_ASSIGNED'::fulfilment_status
         end,
         assigned_at = coalesce(bookings.assigned_at, now()),
         updated_at = now()
   where bookings.id = v_offer.booking_id;

  insert into booking_events(booking_id,event_type,actor_type,actor_id,data)
  values (v_offer.booking_id,'cleaner.assigned','CLEANER',p_cleaner_id,
          jsonb_build_object('offer_id',p_offer_id,'slot_number',v_offer.slot_number));

  return query select true, v_offer.booking_id, 'WON', v_offer.slot_number;
end;
$$;

revoke all on function claim_job_offer(uuid,uuid) from public;
revoke all on function claim_job_offer(uuid,uuid) from anon;
revoke all on function claim_job_offer(uuid,uuid) from authenticated;
grant execute on function claim_job_offer(uuid,uuid) to service_role;

-- ============================
-- migrations/0007_completion_report.sql
-- ============================
-- Cleanse.ng V2 — cleaner completion report (Stage 10 enhancement).
-- Stores the cleaner's end-of-job report (duration + notes/complaints/positives)
-- on the assignment, so operations can see what actually happened on site.

alter table job_assignments
  add column if not exists completion_report jsonb;

-- ============================
-- seed.sql
-- ============================
-- Cleanse.ng pilot seed data (Blueprint §5.2 seed + Appendix A.3)
-- Amounts are NGN converted to kobo. Service fee baseline 20% => service_fee_bps = 2000.

-- --- Service zones (Ibadan pilot) ---
insert into service_zones(code, name, city, state, sort_order) values
  ('BODIJA',   'Bodija',   'Ibadan', 'Oyo', 10),
  ('AKOBO',    'Akobo',    'Ibadan', 'Oyo', 20),
  ('JERICHO',  'Jericho',  'Ibadan', 'Oyo', 30),
  ('OLUYOLE',  'Oluyole',  'Ibadan', 'Oyo', 40),
  ('IYAGANKU', 'Iyaganku', 'Ibadan', 'Oyo', 50)
on conflict (code) do nothing;

-- --- Services ---
insert into services(code, name, description, pricing_mode, active, requires_photos) values
  ('REGULAR', 'Regular Cleaning', 'Standard residential cleaning', 'FIXED_RULES', true, false)
on conflict (code) do nothing;

insert into services(code, name, description, pricing_mode, active, requires_photos) values
  ('DEEP',        'Deep Cleaning',           'Intensive top-to-bottom clean',        'MANUAL_QUOTE', true, true),
  ('MOVE',        'Move-in / Move-out',      'End-of-tenancy deep clean',            'MANUAL_QUOTE', true, true),
  ('POSTFUMIGATION', 'Post-fumigation Clean','Cleanup after fumigation treatment',   'MANUAL_QUOTE', true, true)
on conflict (code) do nothing;

-- --- Extras for Regular Cleaning ---
with regular_service as (select id from services where code = 'REGULAR')
insert into service_extras(service_id, code, name, active)
select r.id, e.code, e.name, true
from regular_service r
cross join (values
  ('FRIDGE', 'Inside fridge'),
  ('OVEN',   'Inside oven'),
  ('LAUNDRY','Laundry & fold'),
  ('WINDOWS','Interior windows')
) as e(code, name)
on conflict (service_id, code) do nothing;

-- --- Pilot Regular-cleaning pricing seed (Appendix A.3) ---
with regular_service as (
  select id from services where code = 'REGULAR'
), price_seed(property_bedrooms, amount_kobo) as (
  values (1,  900000::bigint),
         (2, 1300000::bigint),
         (3, 1700000::bigint),
         (4, 2000000::bigint),
         (5, 2500000::bigint)
)
insert into pricing_rules(
  service_id, property_bedrooms, frequency_code, amount_kobo,
  service_fee_bps, effective_from, active
)
select r.id, p.property_bedrooms, 'ONE_TIME', p.amount_kobo,
       2000, '2026-09-16T00:00:00Z'::timestamptz, true
from regular_service r cross join price_seed p;

