-- =============================================================
-- iTraxx BI — all migrations combined, in order.
-- Paste this into the Supabase Dashboard SQL Editor and Run,
-- OR prefer: supabase db push (see README).
-- Safe to run once on a fresh project.
-- =============================================================


-- >>>>>>>>>>>>>>>>>> 20260521000000_initial_schema.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- iTraxx BI initial schema (migrated from Prisma)
-- Auth lives in Supabase's auth.users; profile data in public.profiles.
-- All FKs to "users" point at public.profiles(id) which mirrors auth.users(id).
-- =============================================================

create extension if not exists "pgcrypto";

-- ============================================
-- Enums
-- ============================================
create type user_role as enum ('ADMIN','MANAGER','TECHNICIAN','STAFF','VIEWER');
create type task_status as enum ('TODO','IN_PROGRESS','REVIEW','DONE','CANCELLED');
create type project_status as enum ('PLANNING','ACTIVE','ON_HOLD','COMPLETED','ARCHIVED');
create type priority as enum ('LOW','MEDIUM','HIGH','URGENT');
create type job_status as enum ('OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','INVOICED','CANCELLED');
create type job_type as enum ('INSTALLATION','MAINTENANCE','REPAIR','INSPECTION','REMOVAL','OTHER');
create type customer_status as enum ('PROSPECT','ACTIVE','INACTIVE','CHURNED');
create type tracker_status as enum ('NOT_INSTALLED','ACTIVE','INACTIVE','FAULTY');
create type communication_type as enum ('CALL','EMAIL','WHATSAPP','SMS','MEETING','NOTE');
create type direction as enum ('INBOUND','OUTBOUND');
create type contract_type as enum ('PERMANENT','FIXED_TERM','PART_TIME','CONTRACTOR');
create type leave_type as enum ('ANNUAL','SICK','COMPASSIONATE','MATERNITY','PATERNITY','UNPAID','STUDY');
create type leave_status as enum ('PENDING','APPROVED','REJECTED','CANCELLED');
create type training_status as enum ('PLANNED','IN_PROGRESS','COMPLETED','EXPIRED');
create type doc_category as enum ('CONTRACT','CERTIFICATE','REGISTRATION','COMPLIANCE','SOP','INVOICE','REPORT','GENERAL');
create type doc_access as enum ('PUBLIC','INTERNAL','RESTRICTED','CONFIDENTIAL');
create type asset_category as enum ('TRACKING_DEVICE','VEHICLE','TOOL','SPARE_PART','OFFICE_EQUIPMENT','IT_EQUIPMENT','OTHER');
create type asset_status as enum ('AVAILABLE','ASSIGNED','IN_USE','MAINTENANCE','RETIRED','LOST');
create type invoice_status as enum ('DRAFT','SENT','PAID','OVERDUE','CANCELLED','PARTIAL');
create type payment_method as enum ('BANK_TRANSFER','CASH','CARD','CHEQUE','MOBILE_PAYMENT','OTHER');
create type expense_category as enum ('FUEL','MAINTENANCE','SALARY','RENT','UTILITIES','EQUIPMENT','TRAVEL','MARKETING','INSURANCE','OTHER');
create type notification_type as enum ('INFO','WARNING','ERROR','SUCCESS','TASK','JOB','LEAVE','DOCUMENT','FINANCE');
create type notification_channel as enum ('APP','EMAIL','WHATSAPP','SMS');

-- ============================================
-- updated_at trigger helper
-- ============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============================================
-- Profiles (1:1 with auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  role user_role not null default 'STAFF',
  phone text,
  avatar text,
  department text,
  job_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Projects / Tasks
-- ============================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status project_status not null default 'ACTIVE',
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status task_status not null default 'TODO',
  priority priority not null default 'MEDIUM',
  due_date timestamptz,
  start_date timestamptz,
  completed_at timestamptz,
  is_recurring boolean not null default false,
  recur_pattern text,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id) on delete set null,
  parent_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (assignee_id);
create index on public.tasks (project_id);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================
-- CRM: customers, vehicles, communications
-- ============================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text,
  phone text,
  address text,
  city text,
  country text default 'Namibia',
  account_number text unique,
  status customer_status not null default 'ACTIVE',
  notes text,
  contract_start timestamptz,
  contract_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  registration_number text unique not null,
  make text not null,
  model text not null,
  year int,
  color text,
  vin text unique,
  tracker_device_id text,
  tracker_status tracker_status not null default 'NOT_INSTALLED',
  last_service_date timestamptz,
  next_service_date timestamptz,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger vehicles_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  type communication_type not null,
  subject text,
  content text not null,
  direction direction not null default 'OUTBOUND',
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================
-- Job Cards
-- ============================================
create table public.job_cards (
  id uuid primary key default gen_random_uuid(),
  job_number text unique not null,
  title text not null,
  description text,
  status job_status not null default 'OPEN',
  priority priority not null default 'MEDIUM',
  job_type job_type not null default 'INSTALLATION',
  scheduled_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_hours double precision,
  actual_hours double precision,
  notes text,
  location text,
  gps_latitude double precision,
  gps_longitude double precision,
  technician_id uuid references public.profiles(id) on delete set null,
  created_by_id uuid not null references public.profiles(id),
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger job_cards_updated_at before update on public.job_cards
  for each row execute function public.set_updated_at();

-- ============================================
-- Inventory / Assets
-- ============================================
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_number text unique not null,
  serial_number text,
  category asset_category not null,
  status asset_status not null default 'AVAILABLE',
  purchase_date timestamptz,
  purchase_price double precision,
  current_value double precision,
  depreciation_rate double precision,
  location text,
  barcode text unique,
  quantity int not null default 1,
  min_stock_level int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

create table public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  assigned_to_id uuid references public.profiles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  returned_at timestamptz,
  notes text
);

create table public.job_card_parts (
  id uuid primary key default gen_random_uuid(),
  quantity int not null,
  unit_price double precision not null,
  job_card_id uuid not null references public.job_cards(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict
);

-- ============================================
-- Performance & HR
-- ============================================
create table public.performance_kpis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,
  jobs_completed int not null default 0,
  avg_response_time double precision,
  customer_rating double precision,
  tasks_completed int not null default 0,
  attendance_rate double precision,
  punctuality_rate double precision,
  overall_score double precision,
  goals text,
  manager_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);
create trigger performance_kpis_updated_at before update on public.performance_kpis
  for each row execute function public.set_updated_at();

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  employee_number text unique not null,
  date_of_birth timestamptz,
  start_date timestamptz not null,
  end_date timestamptz,
  contract_type contract_type not null default 'PERMANENT',
  salary double precision,
  bank_name text,
  bank_account text,
  tax_number text,
  emergency_contact text,
  emergency_phone text,
  annual_leave_balance double precision not null default 20,
  sick_leave_balance double precision not null default 12,
  compassionate_leave_balance double precision not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type leave_type not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  days double precision not null,
  reason text,
  status leave_status not null default 'PENDING',
  approved_by_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger leave_requests_updated_at before update on public.leave_requests
  for each row execute function public.set_updated_at();

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  name text not null,
  provider text,
  cert_number text,
  completed_date timestamptz,
  expiry_date timestamptz,
  status training_status not null default 'PLANNED',
  created_at timestamptz not null default now()
);

-- ============================================
-- Documents
-- ============================================
create table public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  file_name text not null,
  file_url text not null,
  file_size int,
  mime_type text,
  category doc_category not null default 'GENERAL',
  version int not null default 1,
  expiry_date timestamptz,
  access_level doc_access not null default 'INTERNAL',
  uploaded_by_id uuid not null references public.profiles(id),
  customer_id uuid references public.customers(id) on delete set null,
  folder_id uuid references public.folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version int not null,
  file_name text not null,
  file_url text not null,
  change_note text,
  created_at timestamptz not null default now()
);

-- ============================================
-- Finance
-- ============================================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  job_card_id uuid unique references public.job_cards(id) on delete set null,
  subtotal double precision not null,
  tax double precision not null default 0,
  total double precision not null,
  status invoice_status not null default 'DRAFT',
  issued_date timestamptz,
  due_date timestamptz,
  paid_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity double precision not null,
  unit_price double precision not null,
  total double precision not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount double precision not null,
  method payment_method not null,
  reference text,
  paid_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount double precision not null,
  category expense_category not null,
  date timestamptz not null,
  vendor text,
  receipt text,
  approved boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================
-- Shared: comments, attachments, notifications, activity
-- ============================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  job_card_id uuid references public.job_cards(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_url text not null,
  file_size int,
  mime_type text,
  task_id uuid references public.tasks(id) on delete cascade,
  job_card_id uuid references public.job_cards(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type notification_type not null default 'INFO',
  channel notification_channel not null default 'APP',
  is_read boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, is_read);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id text not null,
  details text,
  created_at timestamptz not null default now()
);
create index on public.activity_logs (entity, entity_id);

-- ============================================
-- Row Level Security
-- Authenticated users get read/write to their org's data.
-- Tighten per-table as needs evolve; this is a permissive default.
-- ============================================
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename not in ('schema_migrations')
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "authenticated read %1$s" on public.%1$I for select to authenticated using (true)',
      t
    );
    execute format(
      'create policy "authenticated write %1$s" on public.%1$I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Profiles: users can update their own row; admins can update any (handled via role claim later).
drop policy if exists "authenticated write profiles" on public.profiles;
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);


-- >>>>>>>>>>>>>>>>>> 20260521000100_tickets.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- Support tickets module (had no Prisma model / table before)
-- =============================================================

create type ticket_status as enum ('OPEN','IN_PROGRESS','RESOLVED','CLOSED','REOPENED');
create type ticket_priority as enum ('LOW','MEDIUM','HIGH','URGENT');
create type ticket_category as enum ('TECHNICAL','BILLING','GENERAL','DEVICE','GPS','INSTALLATION','ACCOUNT','OTHER');

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,
  subject text not null,
  description text not null,
  status ticket_status not null default 'OPEN',
  priority ticket_priority not null default 'MEDIUM',
  category ticket_category not null default 'GENERAL',
  -- denormalized customer contact (tickets can arrive before a customer record exists)
  customer_name text not null,
  company text,
  email text,
  customer_id uuid references public.customers(id) on delete set null,
  assigned_to_id uuid references public.profiles(id) on delete set null,
  created_by_id uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tickets (status);
create index on public.tickets (assigned_to_id);
create trigger tickets_updated_at before update on public.tickets
  for each row execute function public.set_updated_at();

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  content text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.ticket_comments (ticket_id);

-- Sequence for human-friendly ticket numbers (TKT-2026-0001 ...)
create sequence if not exists public.ticket_number_seq;

create or replace function public.next_ticket_number()
returns text language sql as $$
  select 'TKT-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.ticket_number_seq')::text, 4, '0');
$$;

-- RLS: authenticated read/write (permissive default, matching the base schema)
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;

create policy "authenticated read tickets" on public.tickets
  for select to authenticated using (true);
create policy "authenticated write tickets" on public.tickets
  for all to authenticated using (true) with check (true);

create policy "authenticated read ticket_comments" on public.ticket_comments
  for select to authenticated using (true);
create policy "authenticated write ticket_comments" on public.ticket_comments
  for all to authenticated using (true) with check (true);


-- >>>>>>>>>>>>>>>>>> 20260521000200_documents_storage.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- Storage bucket for the Documents module.
-- PRIVATE bucket: documents can be CONFIDENTIAL/RESTRICTED, so objects are
-- NOT publicly readable. public.documents.file_url stores the object *path*;
-- the app serves files through short-lived signed URLs. Access is gated by
-- the authenticated-only RLS policies below.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- Authenticated users may read/write objects in the documents bucket.
create policy "authenticated read documents bucket"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "authenticated insert documents bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "authenticated update documents bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

create policy "authenticated delete documents bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');


-- >>>>>>>>>>>>>>>>>> 20260521000300_rls_roles.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> 20260521000400_company_settings.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> 20260521000500_vehicle_inspections.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> 20260521000600_inspection_approval.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- Approval workflow for vehicle inspections.
-- Technician submits -> SUBMITTED. Office Administrator approves -> APPROVED
-- and the checklist is dispatched to the client (sent_to_client_at + the
-- client_email it went to). Can also be REJECTED back to the technician.
-- =============================================================

create type inspection_status as enum ('SUBMITTED', 'APPROVED', 'REJECTED');

alter table public.vehicle_inspections
  add column status inspection_status not null default 'SUBMITTED',
  add column approved_by_id uuid references public.profiles(id) on delete set null,
  add column approved_at timestamptz,
  add column sent_to_client_at timestamptz,
  add column client_email text,
  add column review_note text;

create index on public.vehicle_inspections (status);


-- >>>>>>>>>>>>>>>>>> 20260521000700_robust_handle_new_user.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> 20260521000800_image_buckets.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- Public Storage bucket for brand/profile images (company logo, avatars).
-- These are display images meant to be shown in the UI, so the bucket is
-- PUBLIC (readable by URL). Uploads are restricted to authenticated users.
-- Files are organised by folder: logos/ and avatars/.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do update set public = true;

create policy "public read brand-assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

create policy "authenticated write brand-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brand-assets');

create policy "authenticated update brand-assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'brand-assets');

create policy "authenticated delete brand-assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brand-assets');

-- Persist the company logo URL alongside the rest of the company settings.
alter table public.company_settings
  add column if not exists logo_url text;



-- >>>>>>>>>>>>>>>>>> 20261110000000_lock_down_roles.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> 20261111000000_clerk_auth.sql >>>>>>>>>>>>>>>>>>
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


-- >>>>>>>>>>>>>>>>>> 20261112000000_client_portal.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- Client portal: users from customer companies.
--
-- A CLIENT profile belongs to exactly one customer and can only read that
-- customer's vehicles, job cards, approved inspections, invoices (with items
-- and payments) and support tickets. Clients can open tickets and reply to
-- them, but never see internal staff comments. Every existing staff policy is
-- narrowed to active *staff* members, so clients can't reach internal data.
--
-- Role comparisons use role::text so the new enum value isn't needed in this
-- same transaction.
-- =============================================================

alter type public.user_role add value if not exists 'CLIENT';

alter table public.profiles add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.invitations add column if not exists customer_id uuid references public.customers(id) on delete cascade;

alter table public.profiles drop constraint if exists profiles_client_has_customer;
alter table public.profiles add constraint profiles_client_has_customer
  check (role::text <> 'CLIENT' or customer_id is not null);
alter table public.invitations drop constraint if exists invitations_client_has_customer;
alter table public.invitations add constraint invitations_client_has_customer
  check (role::text <> 'CLIENT' or customer_id is not null);

-- Existing policies use is_active_member(); it now means "active staff member".
create or replace function public.is_active_member()
returns boolean language sql stable
set search_path = public
as $$ select coalesce(public.current_user_role()::text <> 'CLIENT', false) $$;

-- The caller's customer if they are an active client, otherwise null.
create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from public.profiles
  where clerk_user_id = public.clerk_user_id() and is_active and role::text = 'CLIENT'
$$;
grant execute on function public.current_customer_id() to authenticated;

-- Only admins (or server-side code) may also move someone between customers.
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
     or new.clerk_user_id is distinct from old.clerk_user_id
     or new.customer_id is distinct from old.customer_id then
    raise exception 'Only administrators can change roles, access, email, sign-in links or customer'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---- Client read access: their own company's records only ----
drop policy if exists "client read own customer" on public.customers;
create policy "client read own customer" on public.customers
  for select to authenticated using (id = public.current_customer_id());

drop policy if exists "client read own vehicles" on public.vehicles;
create policy "client read own vehicles" on public.vehicles
  for select to authenticated using (customer_id = public.current_customer_id());

drop policy if exists "client read own job cards" on public.job_cards;
create policy "client read own job cards" on public.job_cards
  for select to authenticated using (customer_id = public.current_customer_id());

drop policy if exists "client read own approved inspections" on public.vehicle_inspections;
create policy "client read own approved inspections" on public.vehicle_inspections
  for select to authenticated
  using (customer_id = public.current_customer_id() and status = 'APPROVED');

-- Drafts stay internal until they're sent.
drop policy if exists "client read own invoices" on public.invoices;
create policy "client read own invoices" on public.invoices
  for select to authenticated using (customer_id = public.current_customer_id() and status <> 'DRAFT');

drop policy if exists "client read own invoice items" on public.invoice_items;
create policy "client read own invoice items" on public.invoice_items
  for select to authenticated
  using (invoice_id in (select id from public.invoices where customer_id = public.current_customer_id() and status <> 'DRAFT'));

drop policy if exists "client read own payments" on public.payments;
create policy "client read own payments" on public.payments
  for select to authenticated
  using (invoice_id in (select id from public.invoices where customer_id = public.current_customer_id() and status <> 'DRAFT'));

drop policy if exists "client read company settings" on public.company_settings;
create policy "client read company settings" on public.company_settings
  for select to authenticated using (public.current_customer_id() is not null);

-- ---- Client tickets: read and open their own; reply without internal notes ----
drop policy if exists "client read own tickets" on public.tickets;
create policy "client read own tickets" on public.tickets
  for select to authenticated using (customer_id = public.current_customer_id());

drop policy if exists "client open own tickets" on public.tickets;
create policy "client open own tickets" on public.tickets
  for insert to authenticated
  with check (
    customer_id = public.current_customer_id()
    and created_by_id = public.current_profile_id()
    and assigned_to_id is null
  );

drop policy if exists "client read own ticket comments" on public.ticket_comments;
create policy "client read own ticket comments" on public.ticket_comments
  for select to authenticated
  using (
    not is_internal
    and ticket_id in (select id from public.tickets where customer_id = public.current_customer_id())
  );

drop policy if exists "client reply to own tickets" on public.ticket_comments;
create policy "client reply to own tickets" on public.ticket_comments
  for insert to authenticated
  with check (
    not is_internal
    and author_id = public.current_profile_id()
    and ticket_id in (select id from public.tickets where customer_id = public.current_customer_id())
  );


-- >>>>>>>>>>>>>>>>>> 20261113000000_real_data.sql >>>>>>>>>>>>>>>>>>
-- =============================================================
-- Tables behind pages that used to show demo data:
--   payslips             Payslips page and My Portal
--   deals                Sales Pipeline
--   customer_onboarding  Customer Onboarding
--   meetings             Meeting AI history
--
-- Staff only (clients never see these). Every policy requires an active staff
-- member via is_active_member(), like the rest of the schema.
-- =============================================================

-- ---- Payslips --------------------------------------------------------------
create table if not exists public.payslips (
  id               uuid primary key default gen_random_uuid(),
  payslip_number   text not null unique,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  period           text not null check (period ~ '^\d{4}-\d{2}$'),   -- e.g. 2026-11
  pay_date         date,
  basic_salary     numeric(12,2) not null default 0,
  allowances       jsonb not null default '{}'::jsonb,               -- {"housing": 3000, ...}
  deductions       jsonb not null default '{}'::jsonb,               -- {"paye": 3850, ...}
  total_allowances numeric(12,2) not null default 0,
  total_deductions numeric(12,2) not null default 0,
  gross_pay        numeric(12,2) not null default 0,
  net_pay          numeric(12,2) not null default 0,
  status           text not null default 'GENERATED' check (status in ('DRAFT','GENERATED','SENT','VIEWED')),
  sent_at          timestamptz,
  viewed_at        timestamptz,
  created_by_id    uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, period)
);
create index if not exists payslips_period_idx on public.payslips (period);

alter table public.payslips enable row level security;
drop policy if exists "read payslips" on public.payslips;
create policy "read payslips" on public.payslips for select to authenticated
  using (public.is_active_member() and (user_id = public.current_profile_id() or public.is_manager_plus()));
drop policy if exists "managers write payslips" on public.payslips;
create policy "managers write payslips" on public.payslips for all to authenticated
  using (public.is_active_member() and public.is_manager_plus())
  with check (public.is_active_member() and public.is_manager_plus());

-- Employees mark their own payslip as viewed without being able to edit it.
create or replace function public.mark_payslip_viewed(payslip uuid)
returns void language sql security definer set search_path = public
as $$
  update public.payslips
     set status = 'VIEWED', viewed_at = coalesce(viewed_at, now())
   where id = payslip and user_id = public.current_profile_id() and public.is_active_member()
     and status in ('GENERATED', 'SENT');
$$;
grant execute on function public.mark_payslip_viewed(uuid) to authenticated;

-- ---- Sales pipeline --------------------------------------------------------
create table if not exists public.deals (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  company          text not null,
  contact_name     text,
  contact_email    text,
  contact_phone    text,
  customer_id      uuid references public.customers(id) on delete set null,
  value            numeric(14,2) not null default 0,
  fleet_size       integer,
  stage            text not null default 'lead'
                   check (stage in ('lead','qualified','proposal','negotiation','closed_won','closed_lost')),
  probability      integer not null default 10 check (probability between 0 and 100),
  owner_id         uuid references public.profiles(id) on delete set null,
  expected_close   date,
  source           text,
  notes            text,
  escalations      jsonb not null default '[]'::jsonb,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists deals_stage_idx on public.deals (stage);

alter table public.deals enable row level security;
drop policy if exists "staff read deals" on public.deals;
create policy "staff read deals" on public.deals for select to authenticated
  using (public.is_active_member());
drop policy if exists "staff write deals" on public.deals;
create policy "staff write deals" on public.deals for all to authenticated
  using (public.is_active_member() and not public.is_viewer())
  with check (public.is_active_member() and not public.is_viewer());

-- ---- Customer onboarding ---------------------------------------------------
create table if not exists public.customer_onboarding (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  stage          text not null default 'INQUIRY'
                 check (stage in ('INQUIRY','PROPOSAL','CONTRACT','INSTALLATION','CONFIGURATION','TRAINING','GO_LIVE')),
  status         text not null default 'IN_PROGRESS'
                 check (status in ('IN_PROGRESS','COMPLETED','ON_HOLD','CANCELLED')),
  assigned_to_id uuid references public.profiles(id) on delete set null,
  vehicle_count  integer,
  package        text,
  target_date    date,
  checklist      jsonb not null default '{}'::jsonb,   -- {"INQUIRY": {"done": true, "at": "..."}, ...}
  notes          text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists customer_onboarding_customer_idx on public.customer_onboarding (customer_id);

alter table public.customer_onboarding enable row level security;
drop policy if exists "staff read onboarding" on public.customer_onboarding;
create policy "staff read onboarding" on public.customer_onboarding for select to authenticated
  using (public.is_active_member());
drop policy if exists "staff write onboarding" on public.customer_onboarding;
create policy "staff write onboarding" on public.customer_onboarding for all to authenticated
  using (public.is_active_member() and not public.is_viewer())
  with check (public.is_active_member() and not public.is_viewer());

-- ---- Meetings --------------------------------------------------------------
create table if not exists public.meetings (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  meeting_date     timestamptz not null default now(),
  duration_seconds integer not null default 0,
  participants     jsonb not null default '[]'::jsonb,   -- [{"id": "<profile id>", "name": "..."}]
  transcript       jsonb not null default '[]'::jsonb,   -- [{"speaker": "...", "text": "...", "at": 12}]
  summary          text,
  key_points       jsonb not null default '[]'::jsonb,
  action_items     jsonb not null default '[]'::jsonb,   -- [{"text": "...", "assignee_id": "...", "due": "..."}]
  created_by_id    uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.meetings enable row level security;
drop policy if exists "staff read meetings" on public.meetings;
create policy "staff read meetings" on public.meetings for select to authenticated
  using (public.is_active_member());
drop policy if exists "staff add meetings" on public.meetings;
create policy "staff add meetings" on public.meetings for insert to authenticated
  with check (public.is_active_member() and not public.is_viewer() and created_by_id = public.current_profile_id());
drop policy if exists "owners edit meetings" on public.meetings;
create policy "owners edit meetings" on public.meetings for update to authenticated
  using (public.is_active_member() and (created_by_id = public.current_profile_id() or public.is_manager_plus()))
  with check (public.is_active_member() and (created_by_id = public.current_profile_id() or public.is_manager_plus()));
drop policy if exists "owners delete meetings" on public.meetings;
create policy "owners delete meetings" on public.meetings for delete to authenticated
  using (public.is_active_member() and (created_by_id = public.current_profile_id() or public.is_manager_plus()));

-- ---- updated_at triggers ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['payslips','deals','customer_onboarding','meetings'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;
