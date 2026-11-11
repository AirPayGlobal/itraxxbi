-- =============================================================
-- Vehicle Inspection / Checklist completed by technicians on site.
-- Mirrors the ITRACKERX paper form: header, vehicle + device details,
-- pre/post vehicle-condition checks, extras, anti-theft, accessories,
-- body observations and sign-off.
--
-- The grouped checkbox sections are stored as jsonb so the canonical
-- item list lives in the frontend and can evolve without a migration:
--   condition_checks -> { "vehicle_start": {"pre":bool,"post":bool}, ... }
--   extras / anti_theft / accessories -> { "key": bool, ... }
-- =============================================================

create type inspection_type as enum (
  'NEW_FITMENT',
  'RE_INSTALLATION',
  'DE_INSTALLATION',
  'REPAIR',
  'UPGRADE_ADDON'
);

create table public.vehicle_inspections (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid references public.job_cards(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,

  -- Header
  inspection_date date,
  start_time text,
  end_time text,
  device_no text,
  inspection_type inspection_type,

  -- Client / vehicle
  client_name text,
  insurer text,
  vehicle_make text,
  vehicle_model_year text,
  vehicle_color text,
  engine_number text,
  vin_number text,
  odo text,
  reg_number text,

  -- Device / installation
  gps_imei text,
  gps_serial text,
  sim_number text,
  fuel_sensor_make text,
  fuel_sensor_length text,
  seal_no_1 text,
  seal_no_2 text,
  mdvr_make text,
  mdvr_serial text,
  mdvr_id text,
  remote_view text,

  -- Grouped checks
  condition_checks jsonb not null default '{}',
  radio_make text,
  extras jsonb not null default '{}',
  anti_theft jsonb not null default '{}',
  accessories jsonb not null default '{}',
  accessories_other text,

  -- Observations
  body_observations text,
  comments text,

  -- Sign-off
  technician_name text,
  employee_code text,
  technician_signature text,
  witness_name text,
  signed_pre_check boolean not null default false,
  signed_post_check boolean not null default false,

  created_by_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.vehicle_inspections (job_card_id);
create index on public.vehicle_inspections (customer_id);
create trigger vehicle_inspections_updated_at before update on public.vehicle_inspections
  for each row execute function public.set_updated_at();

-- RLS: broad read; non-viewer authenticated users may write (technicians).
alter table public.vehicle_inspections enable row level security;

create policy "authenticated read vehicle_inspections" on public.vehicle_inspections
  for select to authenticated using (true);

create policy "write vehicle_inspections (non-viewer)" on public.vehicle_inspections
  for all to authenticated
  using (not public.is_viewer())
  with check (not public.is_viewer());
