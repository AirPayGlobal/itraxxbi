-- =============================================================
-- Lock down roles and make access invite-only.
--
-- Fixes two privilege escalations in earlier migrations:
--   1. handle_new_user() took the role from user-supplied sign-up metadata,
--      so anyone could sign up as ADMIN.
--   2. "users update own profile" let a user change their own role/is_active.
--
-- Also:
--   * Roles now come from admin-created invitations. Users without one are
--     created as inactive VIEWERs.
--   * Deactivated users (is_active = false) lose all data access.
--   * Finance tables are readable only by roles that can open Finance.
-- =============================================================

-- 1. Invitations ------------------------------------------------
create table if not exists public.invitations (
  email       text primary key check (email = lower(email)),
  name        text not null,
  role        user_role not null default 'STAFF',
  department  text,
  job_title   text,
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);
alter table public.invitations enable row level security;
drop policy if exists "admins manage invitations" on public.invitations;
create policy "admins manage invitations" on public.invitations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Active-aware role helper -------------------------------------
-- Deactivated users have no role, so every role check fails for them.
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_active_member()
returns boolean language sql stable
set search_path = public
as $$ select public.current_user_role() is not null $$;

-- 3. New users take their role from an invitation, never from metadata -----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
begin
  begin
    select * into inv from public.invitations where email = lower(new.email);

    insert into public.profiles (id, email, name, role, phone, department, job_title, is_active)
    values (
      new.id,
      lower(new.email),
      coalesce(inv.name, new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      coalesce(inv.role, 'VIEWER'),
      new.raw_user_meta_data->>'phone',
      inv.department,
      inv.job_title,
      inv.email is not null
    )
    on conflict (id) do nothing;

    update public.invitations set accepted_at = now() where email = lower(new.email);
  exception
    when others then
      raise warning 'handle_new_user: could not create profile for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

-- 4. Only admins may change role, access or email ---------------------
-- Requests without a signed-in user (service role, SQL editor, the sign-up
-- trigger) are trusted; signed-in non-admins are not.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'VIEWER';
    new.is_active := false;
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email then
    raise exception 'Only administrators can change roles, access or email'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_privileges on public.profiles;
create trigger guard_profile_privileges
  before insert or update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- 5. Deactivated users lose access; finance reads follow page access -----
do $$
declare
  p record;
  t text;
  finance text[] := array['invoices', 'invoice_items', 'payments', 'expenses'];
begin
  -- Every authenticated policy on public tables (except profiles, handled
  -- below) additionally requires an active member.
  for p in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and 'authenticated' = any(roles)
      and tablename not in ('profiles', 'invitations')
  loop
    if p.qual is not null then
      execute format('alter policy %I on public.%I using ((%s) and public.is_active_member())',
                     p.policyname, p.tablename, p.qual);
    end if;
    if p.with_check is not null then
      execute format('alter policy %I on public.%I with check ((%s) and public.is_active_member())',
                     p.policyname, p.tablename, p.with_check);
    end if;
  end loop;

  foreach t in array finance loop
    execute format('drop policy if exists "authenticated read %1$s" on public.%1$I', t);
    execute format(
      'create policy "authenticated read %1$s" on public.%1$I for select to authenticated
         using (public.current_user_role() in (''ADMIN'', ''MANAGER'', ''VIEWER''))', t);
  end loop;
end $$;

-- Profiles: active members see the team directory; everyone can see their
-- own row (the app needs it to show "no access" to deactivated users).
drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles" on public.profiles
  for select to authenticated
  using (public.is_active_member() or id = auth.uid());

-- Storage: documents bucket requires an active member too.
do $$
declare p record;
begin
  for p in
    select policyname, qual, with_check
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'authenticated % documents bucket'
  loop
    if p.qual is not null then
      execute format('alter policy %I on storage.objects using ((%s) and public.is_active_member())',
                     p.policyname, p.qual);
    end if;
    if p.with_check is not null then
      execute format('alter policy %I on storage.objects with check ((%s) and public.is_active_member())',
                     p.policyname, p.with_check);
    end if;
  end loop;
end $$;
