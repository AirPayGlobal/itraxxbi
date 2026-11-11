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
