-- Cleanse.ng V2 — Admin-only cleaner login credential storage.
-- Stored in a separate RLS-locked table so cleaners (who have cleaner_reads_self
-- on `cleaners`) and public clients can never read temporary passwords.
-- Only the Next.js server service role (after admin authentication) accesses this table.

create table if not exists cleaner_credentials (
  cleaner_id uuid primary key references cleaners(id) on delete cascade,
  temporary_password text not null,
  updated_by uuid references admin_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table cleaner_credentials enable row level security;
revoke all on table cleaner_credentials from public, anon, authenticated;

