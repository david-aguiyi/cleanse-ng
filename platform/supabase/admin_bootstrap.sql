-- Bootstrap an admin operator (Blueprint §6.1, Stage 3).
--
-- Admins authenticate with Supabase Auth (email + password). This script links
-- an existing Auth user to an admin_users row with a role. Run it AFTER creating
-- the Auth user.
--
-- 1) Create the Auth user in the Supabase dashboard:
--      Authentication → Users → Add user → email + password (auto-confirm).
--    Or via the Admin API. Copy the user's UUID.
--
-- 2) Replace the placeholders below and run this in the SQL editor:

insert into admin_users (auth_user_id, full_name, role, active)
values (
  '00000000-0000-0000-0000-000000000000',  -- <-- paste the Auth user UUID
  'Ops Admin',                             -- <-- operator display name
  'SUPER_ADMIN',                           -- SUPER_ADMIN | OPERATIONS | DISPATCHER | CUSTOMER_SUPPORT | FINANCE
  true
)
on conflict (auth_user_id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      active = excluded.active;

-- The operator can now sign in at /admin/login.
