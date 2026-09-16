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
