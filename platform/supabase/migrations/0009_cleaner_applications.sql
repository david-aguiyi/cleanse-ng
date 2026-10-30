-- Cleanse.ng V2 — Cleanse Pro applications (public "Become a Cleanse Pro" form).
-- Applicants are NOT cleaners: an operator reads the answers and, if hired,
-- onboards them separately via /admin/cleaners/new.

create table if not exists cleaner_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Review state (operator-only)
  status text not null default 'NEW'
    check (status in ('NEW','REVIEWING','SHORTLISTED','REJECTED','HIRED')),
  admin_notes text,
  reviewed_by uuid references admin_users(id),
  reviewed_at timestamptz,

  -- About you
  full_name text not null,
  whatsapp_e164 text not null,
  date_of_birth date not null,
  gender text not null,
  has_children text not null,
  area text not null,
  landmark text,
  languages text[] not null default '{}',
  heard_from text,

  -- Experience and practicalities
  experience text not null,
  experience_places text[] not null default '{}',
  available_days text[] not null default '{}',
  start_when text not null,
  transport text not null,
  has_smartphone boolean not null,
  has_valid_id boolean not null,
  willing_guarantor boolean not null,
  can_give_references boolean not null,
  willing_training boolean not null,

  -- Open questions
  why_cleanse text not null,
  arrival_time text not null,
  found_money text not null,
  days_per_week text not null,
  attention_check text not null,

  consent_at timestamptz not null,
  source_ip text
);

create index if not exists cleaner_applications_created_idx
  on cleaner_applications (created_at desc);
create index if not exists cleaner_applications_status_idx
  on cleaner_applications (status);

-- Contains applicants' personal data: no anon/authenticated access at all.
-- Inserts and reads go through the server's service-role client only.
alter table cleaner_applications enable row level security;
