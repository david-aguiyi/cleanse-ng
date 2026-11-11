-- Cleanse.ng V2 — Cleanse Pro candidate full onboarding & 19-clause agreement.
-- Pre-vetted candidates submit identity (NIN), face photo, NIN document photo,
-- detailed split address, guarantor, emergency contacts, availability, and contract agreement.

create table if not exists cleaner_onboardings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Links
  applicant_id uuid references cleaner_applications(id) on delete set null,
  cleaner_id uuid references cleaners(id) on delete set null,

  -- Review state (operator-only): SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED
  status text not null default 'SUBMITTED'
    check (status in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  admin_notes text,
  reviewed_by uuid references admin_users(id),
  reviewed_at timestamptz,

  -- 1. About You
  full_name text not null,
  photo_url text not null,
  whatsapp_e164 text not null,
  date_of_birth date not null,
  gender text not null,
  nin_digits varchar(11) not null,
  nin_document_url text not null,

  -- 2. Where You Live (Split Address)
  street_address text not null,
  landmark text not null,
  neighbourhood text not null,
  lga text not null,
  city_state text not null default 'Ibadan, Oyo State',
  directions text,
  closest_zone text not null,
  transport_mode text not null,
  travel_time_hub text not null,

  -- 3. Background
  education_level text not null,
  religion text,
  languages text[] not null default '{}',
  experience_details text,
  products_used text[] not null default '{}',
  equipment_used text[] not null default '{}',

  -- 4. Availability
  available_days text[] not null default '{}',
  early_morning_ok boolean not null default true,
  pair_work_ok boolean not null default true,
  start_readiness text not null,

  -- 5. Trust & Safety
  guarantor_name text not null,
  guarantor_phone text not null,
  guarantor_relationship text not null,
  guarantor_occupation text,
  emergency_name text not null,
  emergency_phone text not null,
  emergency_relationship text not null,
  allergies text,

  -- 6. Cleanse Fit
  why_cleanse text,
  one_year_goal text,
  accidental_breakage_response text,
  referral_source text,

  -- 7. Agreement Audit Trail (19 clauses with 5-day notice clause)
  agreement_version text not null default 'v1.0',
  agreed_clauses int[] not null default '{}',
  agreed_at timestamptz not null default now(),
  source_ip text,
  user_agent text,

  -- Admin verification signals
  nin_verified boolean not null default false,
  guarantor_called boolean not null default false
);

create index if not exists cleaner_onboardings_created_idx
  on cleaner_onboardings (created_at desc);
create index if not exists cleaner_onboardings_status_idx
  on cleaner_onboardings (status);
create index if not exists cleaner_onboardings_nin_idx
  on cleaner_onboardings (nin_digits);
create index if not exists cleaner_onboardings_applicant_idx
  on cleaner_onboardings (applicant_id);

-- Sensitive candidate identity: server service-role access only
alter table cleaner_onboardings enable row level security;

