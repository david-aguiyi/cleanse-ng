-- Cleanse.ng V2 — Invoice-linked Jobs, Visit Logs, Cleaner Bank Accounts,
-- 70% Cleaner Earnings Ledger, and Atomic Monthly Payout Settlements.

-- 1. Operational Jobs automatically provisioned & synced from saved invoices.
create table if not exists invoice_jobs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null unique references invoices(id) on delete cascade,
  invoice_number text not null,
  status text not null default 'ACTIVE'
    check (status in ('PENDING', 'ACTIVE', 'PAUSED', 'ENDED', 'TERMINATED')),
  client_name text,
  client_phone text,
  client_address text,
  client_area text,
  service_name text not null,
  property_bedrooms integer not null default 3 check (property_bedrooms > 0),
  billing text not null default 'monthly' check (billing in ('monthly', 'oneoff')),
  frequency text,
  sessions_count integer not null default 1 check (sessions_count > 0),
  materials_by text not null default 'cleanse',
  equipment_by text not null default 'client',
  contract_start date,
  contract_end date,
  serving_slot text,
  serving_days jsonb not null default '[]'::jsonb,
  invoice_total_naira bigint not null default 0,
  price_per_clean_naira bigint not null default 0,
  supplies_per_visit_naira bigint not null default 0,
  cleaner_pool_per_clean_naira bigint not null default 0,
  reserve_calendar boolean not null default true,
  paused_at timestamptz,
  ended_at timestamptz,
  terminated_at timestamptz,
  status_reason text,
  created_by uuid references admin_users(id),
  updated_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_jobs_status_idx on invoice_jobs(status, updated_at desc);

-- 2. Up to 2 onboarded Cleanse Pros assigned to an invoice job.
create table if not exists invoice_job_cleaners (
  job_id uuid not null references invoice_jobs(id) on delete cascade,
  cleaner_id uuid not null references cleaners(id) on delete cascade,
  slot_order smallint not null check (slot_order in (1, 2)),
  created_at timestamptz not null default now(),
  primary key (job_id, cleaner_id),
  unique (job_id, slot_order)
);

create index if not exists invoice_job_cleaners_cleaner_idx
  on invoice_job_cleaners(cleaner_id);

-- 3. Individual scheduled visit dates + canonical slots for each invoice job.
create table if not exists invoice_job_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references invoice_jobs(id) on delete cascade,
  visit_date date not null,
  slot text not null check (slot in ('8am - 11am', '11am - 2pm', '2pm - 5pm')),
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'SERVED', 'PAUSED', 'CANCELLED')),
  served_at timestamptz,
  served_by_admin_id uuid references admin_users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, visit_date, slot)
);

create index if not exists invoice_job_visits_date_status_idx
  on invoice_job_visits(visit_date, status);
create index if not exists invoice_job_visits_job_idx
  on invoice_job_visits(job_id, visit_date);

-- 4. Cleanse Pro bank account details entered in /pro/profile.
create table if not exists cleaner_bank_accounts (
  cleaner_id uuid primary key references cleaners(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Immutable monthly/period payout settlement receipts.
create table if not exists cleaner_payouts (
  id uuid primary key default gen_random_uuid(),
  cleaner_id uuid not null references cleaners(id) on delete restrict,
  period_key text not null,
  cutoff_date date not null,
  total_amount_naira bigint not null check (total_amount_naira > 0),
  earning_count integer not null check (earning_count > 0),
  bank_name text not null,
  account_number text not null,
  account_name text not null,
  reference_note text,
  idempotency_key uuid not null unique,
  settled_by_admin_id uuid references admin_users(id),
  settled_at timestamptz not null default now()
);

create index if not exists cleaner_payouts_cleaner_idx
  on cleaner_payouts(cleaner_id, settled_at desc);

-- 6. Immutable per-clean earnings ledger (payout_id NULL = Unpaid/Owed; non-NULL = Paid & Locked).
create table if not exists cleaner_visit_earnings (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('INVOICE_VISIT', 'BOOKING_JOB')),
  invoice_visit_id uuid references invoice_job_visits(id) on delete restrict,
  booking_id uuid references bookings(id) on delete restrict,
  cleaner_id uuid not null references cleaners(id) on delete restrict,
  job_label text not null,
  earned_on date not null,
  gross_clean_naira bigint not null check (gross_clean_naira >= 0),
  supplies_deducted_naira bigint not null default 0 check (supplies_deducted_naira >= 0),
  net_pool_naira bigint not null check (net_pool_naira >= 0),
  share_bps integer not null default 10000 check (share_bps > 0 and share_bps <= 10000),
  amount_naira bigint not null check (amount_naira >= 0),
  payout_id uuid references cleaner_payouts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source_type = 'INVOICE_VISIT' and invoice_visit_id is not null and booking_id is null)
    or (source_type = 'BOOKING_JOB' and booking_id is not null and invoice_visit_id is null)
  )
);

create unique index if not exists cleaner_visit_earnings_invoice_visit_uidx
  on cleaner_visit_earnings(invoice_visit_id, cleaner_id)
  where invoice_visit_id is not null;
create unique index if not exists cleaner_visit_earnings_booking_uidx
  on cleaner_visit_earnings(booking_id, cleaner_id)
  where booking_id is not null;
create index if not exists cleaner_visit_earnings_unpaid_idx
  on cleaner_visit_earnings(cleaner_id, earned_on)
  where payout_id is null;
create index if not exists cleaner_visit_earnings_payout_idx
  on cleaner_visit_earnings(payout_id)
  where payout_id is not null;

-- Service-role only access across operational/financial tables.
alter table invoice_jobs enable row level security;
alter table invoice_job_cleaners enable row level security;
alter table invoice_job_visits enable row level security;
alter table cleaner_bank_accounts enable row level security;
alter table cleaner_payouts enable row level security;
alter table cleaner_visit_earnings enable row level security;

-- 7. Atomic monthly/cutoff settlement RPC (prevents accidental double payments).
create or replace function settle_cleaner_payout(
  p_cleaner_id uuid,
  p_admin_id uuid,
  p_period_key text,
  p_cutoff_date date,
  p_idempotency_key uuid,
  p_reference_note text default null
)
returns table (
  payout_id uuid,
  total_amount_naira bigint,
  earning_count integer,
  bank_name text,
  account_number text,
  account_name text,
  period_key text,
  cutoff_date date,
  settled_at timestamptz,
  already_settled boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing cleaner_payouts%rowtype;
  v_bank cleaner_bank_accounts%rowtype;
  v_ids uuid[];
  v_total bigint;
  v_count integer;
  v_payout cleaner_payouts%rowtype;
begin
  -- Serialize concurrent settlement attempts for this cleaner.
  perform id from cleaners where id = p_cleaner_id for update;
  if not found then
    raise exception 'CLEANER_NOT_FOUND';
  end if;

  -- Idempotent retry safety.
  select * into v_existing
  from cleaner_payouts
  where idempotency_key = p_idempotency_key;

  if found then
    return query select
      v_existing.id,
      v_existing.total_amount_naira,
      v_existing.earning_count,
      v_existing.bank_name,
      v_existing.account_number,
      v_existing.account_name,
      v_existing.period_key,
      v_existing.cutoff_date,
      v_existing.settled_at,
      true;
    return;
  end if;

  select * into v_bank
  from cleaner_bank_accounts
  where cleaner_id = p_cleaner_id;

  if not found then
    raise exception 'BANK_ACCOUNT_MISSING';
  end if;

  select
    array_agg(id),
    coalesce(sum(amount_naira), 0),
    count(*)::integer
  into v_ids, v_total, v_count
  from (
    select id, amount_naira
    from cleaner_visit_earnings
    where cleaner_id = p_cleaner_id
      and payout_id is null
      and earned_on <= p_cutoff_date
    for update
  ) locked_rows;

  if coalesce(v_count, 0) = 0 or coalesce(v_total, 0) <= 0 then
    raise exception 'NOTHING_TO_PAY';
  end if;

  insert into cleaner_payouts (
    cleaner_id,
    period_key,
    cutoff_date,
    total_amount_naira,
    earning_count,
    bank_name,
    account_number,
    account_name,
    reference_note,
    idempotency_key,
    settled_by_admin_id
  ) values (
    p_cleaner_id,
    p_period_key,
    p_cutoff_date,
    v_total,
    v_count,
    v_bank.bank_name,
    v_bank.account_number,
    v_bank.account_name,
    nullif(btrim(coalesce(p_reference_note, '')), ''),
    p_idempotency_key,
    p_admin_id
  )
  returning * into v_payout;

  update cleaner_visit_earnings
  set payout_id = v_payout.id,
      updated_at = now()
  where id = any(v_ids);

  return query select
    v_payout.id,
    v_payout.total_amount_naira,
    v_payout.earning_count,
    v_payout.bank_name,
    v_payout.account_number,
    v_payout.account_name,
    v_payout.period_key,
    v_payout.cutoff_date,
    v_payout.settled_at,
    false;
end;
$$;

