-- Cleanse.ng V2 — saved invoices from the admin invoice maker.
-- Numbers come from a sequence so two admins (or two devices) can never get
-- the same one. CLN-001 was issued by hand before this existed, so the
-- sequence starts at 2.

create sequence if not exists invoice_number_seq start with 2;

create or replace function next_invoice_number()
returns text
language sql
volatile
as $$
  select 'CLN-' || case when n < 1000 then lpad(n::text, 3, '0') else n::text end
  from (select nextval('invoice_number_seq') as n) s;
$$;

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default next_invoice_number(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references admin_users(id),
  updated_by uuid references admin_users(id),
  client_name text,
  client_address text,
  total_naira bigint not null default 0,
  -- Full invoice-maker form state (everything needed to re-open and re-print).
  data jsonb not null
);

create index if not exists invoices_created_idx on invoices (created_at desc);

-- Contains client and bank details: service-role access only.
alter table invoices enable row level security;
