-- LOCAL ONLY — runs via `supabase db reset` against the local dev stack.
--
-- DO NOT run this against a hosted/remote Supabase project. Inserting into
-- auth.users with raw SQL leaves columns GoTrue depends on unset, which breaks
-- login with "Database error querying schema" / a 500 "server configuration"
-- page. For a remote project create the demo users with the Admin API instead:
--   npm run seed:users   (see scripts/seed-remote-users.mjs)
--
-- The on_auth_user_created trigger populates public.profiles from metadata.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'admin@itrackerx.com', crypt('admin123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Admin User","role":"ADMIN","department":"Management","job_title":"System Administrator"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'manager@itrackerx.com', crypt('manager123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Sarah Manager","role":"MANAGER","department":"Operations","job_title":"Operations Manager"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'technician@itrackerx.com', crypt('tech123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"John Technician","role":"TECHNICIAN","department":"Technical","job_title":"Senior Technician"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'staff@itrackerx.com', crypt('staff123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Jane Staff","role":"STAFF","department":"Administration","job_title":"Office Administrator"}'::jsonb,
    now(), now(), '', '', '', ''
  ),
  (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'viewer@itrackerx.com', crypt('viewer123', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Mike Viewer","role":"VIEWER","department":"External","job_title":"Auditor"}'::jsonb,
    now(), now(), '', '', '', ''
  )
on conflict (email) do nothing;
