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
