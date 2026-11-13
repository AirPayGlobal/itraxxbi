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
