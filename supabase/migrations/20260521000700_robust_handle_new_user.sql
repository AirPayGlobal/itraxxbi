-- =============================================================
-- Make the new-user -> profile trigger defensive.
-- If the profile insert ever fails, it must NOT abort the auth.users
-- write (that would surface as "Database error saving new user" / a 500
-- from Supabase Auth). Log a warning and continue instead.
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email, name, role, phone, department, job_title)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      coalesce((new.raw_user_meta_data->>'role')::user_role, 'STAFF'),
      new.raw_user_meta_data->>'phone',
      new.raw_user_meta_data->>'department',
      new.raw_user_meta_data->>'job_title'
    )
    on conflict (id) do nothing;
  exception
    when others then
      raise warning 'handle_new_user: could not create profile for %: %',
        new.id, sqlerrm;
  end;
  return new;
end;
$$;
