-- =============================================================
-- Role-based Row Level Security.
--
-- The initial schema shipped a permissive default (any authenticated user
-- could read AND write every table). This migration keeps broad READ access
-- (this is an internal BI tool) but scopes WRITES by the caller's role:
--
--   VIEWER            -> read only, no writes anywhere
--   STAFF/TECHNICIAN  -> write operational tables
--   MANAGER/ADMIN     -> additionally write finance + HR tables
--   own profile       -> a user may update their own profile row;
--                        ADMIN may update any profile
--
-- Role is read from public.profiles via a SECURITY DEFINER helper so the
-- policy check does not recurse through profiles' own RLS.
-- =============================================================

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_viewer()
returns boolean language sql stable
set search_path = public
as $$ select coalesce(public.current_user_role() = 'VIEWER', true) $$;

create or replace function public.is_manager_plus()
returns boolean language sql stable
set search_path = public
as $$ select coalesce(public.current_user_role() in ('ADMIN','MANAGER'), false) $$;

create or replace function public.is_admin()
returns boolean language sql stable
set search_path = public
as $$ select coalesce(public.current_user_role() = 'ADMIN', false) $$;

-- Operational tables: writable by any non-viewer authenticated user.
-- Finance/HR tables: writable only by MANAGER/ADMIN.
do $$
declare
  t text;
  operational text[] := array[
    'tasks','projects','job_cards','job_card_parts','customers','vehicles',
    'communications','assets','asset_assignments','documents',
    'document_versions','folders','comments','attachments','notifications',
    'activity_logs','tickets','ticket_comments','performance_kpis','trainings'
  ];
  restricted text[] := array[
    'invoices','invoice_items','payments','expenses','employees','leave_requests'
  ];
begin
  foreach t in array operational loop
    execute format('drop policy if exists "authenticated write %1$s" on public.%1$I', t);
    execute format(
      'create policy "write %1$s (non-viewer)" on public.%1$I
         for all to authenticated
         using (not public.is_viewer())
         with check (not public.is_viewer())', t);
  end loop;

  foreach t in array restricted loop
    execute format('drop policy if exists "authenticated write %1$s" on public.%1$I', t);
    execute format(
      'create policy "write %1$s (manager+)" on public.%1$I
         for all to authenticated
         using (public.is_manager_plus())
         with check (public.is_manager_plus())', t);
  end loop;
end $$;

-- Profiles: keep self-service update/insert; let admins manage any profile.
create policy "admins update any profile" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
