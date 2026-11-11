-- Local development seed (runs on `supabase db reset`).
--
-- Sign-in is handled by Clerk, so demo users are profiles only. Each links to a
-- Clerk account the first time someone signs in with that email; with sign-up
-- restricted, invite the email in your Clerk development instance first.
insert into public.profiles (id, email, name, role, department, job_title, is_active) values
  ('11111111-1111-1111-1111-111111111111', 'admin@itrackerx.com',      'Admin User',      'ADMIN',      'Management',     'System Administrator', true),
  ('22222222-2222-2222-2222-222222222222', 'manager@itrackerx.com',    'Sarah Manager',   'MANAGER',    'Operations',     'Operations Manager',   true),
  ('33333333-3333-3333-3333-333333333333', 'technician@itrackerx.com', 'John Technician', 'TECHNICIAN', 'Technical',      'Senior Technician',    true),
  ('44444444-4444-4444-4444-444444444444', 'staff@itrackerx.com',      'Jane Staff',      'STAFF',      'Administration', 'Office Administrator', true),
  ('55555555-5555-5555-5555-555555555555', 'viewer@itrackerx.com',     'Mike Viewer',     'VIEWER',     'External',       'Auditor',              true)
on conflict (id) do nothing;
