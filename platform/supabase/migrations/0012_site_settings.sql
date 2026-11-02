-- Cleanse.ng V2 — global dynamic site settings (e.g., active WhatsApp phone number).
-- Keys are unique; values are JSONB for extensibility.
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id)
);

-- Seed current WhatsApp contact number
insert into site_settings (key, value)
values ('whatsapp_number', '"08167734221"'::jsonb)
on conflict (key) do nothing;

alter table site_settings enable row level security;

-- Read-only public access for anon / authenticated; mutations reserved for service-role.
create policy "site_settings_public_read" on site_settings
  for select to anon, authenticated
  using (true);
