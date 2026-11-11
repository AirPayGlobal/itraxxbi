-- =============================================================
-- Company-wide settings (single row, keyed 'default').
-- Read by any authenticated user; written only by MANAGER/ADMIN.
-- =============================================================

create table public.company_settings (
  id text primary key default 'default',
  company_name text,
  reg_number text,
  industry text,
  company_size text,
  primary_email text,
  phone_number text,
  website text,
  country text,
  address text,
  vat_number text,
  currency text default 'NAD',
  timezone text default 'Africa/Windhoek',
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id = 'default')
);

create trigger company_settings_updated_at before update on public.company_settings
  for each row execute function public.set_updated_at();

-- Seed the single row so the app always has something to update.
insert into public.company_settings (id) values ('default')
on conflict (id) do nothing;

alter table public.company_settings enable row level security;

create policy "authenticated read company_settings" on public.company_settings
  for select to authenticated using (true);

create policy "manager+ write company_settings" on public.company_settings
  for all to authenticated
  using (public.is_manager_plus())
  with check (public.is_manager_plus());
