-- =============================================================
-- Sign-in moves to Clerk (Supabase third-party auth).
--
-- Clerk session tokens carry the Clerk user id ("user_...") in `sub`, which
-- is not a uuid, so auth.uid() can't be used. Profiles keep their uuid ids
-- (every foreign key points at them) and gain clerk_user_id. The app links a
-- Clerk account to a profile on first sign-in by verified email, using the
-- service role; signed-in users can never set clerk_user_id themselves.
-- =============================================================

-- Profiles no longer mirror Supabase auth users.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists clerk_user_id text unique;

-- The Clerk user id of the caller, or null for the service role / SQL editor.
create or replace function public.clerk_user_id()
returns text language sql stable
as $$ select nullif(auth.jwt() ->> 'sub', '') $$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where clerk_user_id = public.clerk_user_id()
$$;
grant execute on function public.current_profile_id() to authenticated;

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where clerk_user_id = public.clerk_user_id() and is_active
$$;

-- Only admins (or server-side code) may change role, access, email or the Clerk link.
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.clerk_user_id() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Profiles are created by the server' using errcode = '42501';
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.email is distinct from old.email
     or new.clerk_user_id is distinct from old.clerk_user_id then
    raise exception 'Only administrators can change roles, access, email or sign-in links'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Own-profile policies match on the Clerk id instead of auth.uid().
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (clerk_user_id = public.clerk_user_id())
  with check (clerk_user_id = public.clerk_user_id());

drop policy if exists "users insert own profile" on public.profiles;

drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles" on public.profiles
  for select to authenticated
  using (public.is_active_member() or clerk_user_id = public.clerk_user_id());
