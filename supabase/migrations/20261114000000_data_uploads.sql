-- =============================================================
-- Data uploads: file attachments on payslips, deals, payments and debtors
-- reports; debtors age analysis snapshots; payments that are not (yet)
-- matched to an invoice (bank statement imports).
--
-- Who may see a file follows the record it belongs to:
--   payslip  -> that employee, ADMIN and MANAGER
--   deal     -> active staff (VIEWER read-only)
--   payment, debtors -> finance roles (ADMIN, MANAGER read/write; VIEWER read)
-- =============================================================

-- ---- Access rule shared by record_files and the storage bucket --------------
create or replace function public.can_access_record(area text, entity uuid, for_write boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_active_member() and case area
    when 'payslip' then
      case when for_write then public.is_manager_plus()
           else public.is_manager_plus()
                or exists (select 1 from public.payslips p where p.id = entity and p.user_id = public.current_profile_id())
      end
    when 'deal' then (not for_write) or not public.is_viewer()
    when 'payment' then
      case when for_write then public.is_manager_plus()
           else public.current_user_role()::text in ('ADMIN', 'MANAGER', 'VIEWER') end
    when 'debtors' then
      case when for_write then public.is_manager_plus()
           else public.current_user_role()::text in ('ADMIN', 'MANAGER', 'VIEWER') end
    else false
  end
$$;
grant execute on function public.can_access_record(text, uuid, boolean) to authenticated;

-- Storage paths look like '<area>/<entity uuid>/<file>'.
create or replace function public.can_access_record_path(object_name text, for_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  parts text[] := storage.foldername(object_name);
  entity uuid;
begin
  if coalesce(array_length(parts, 1), 0) < 2 then
    return false;
  end if;
  begin
    entity := parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return public.can_access_record(parts[1], entity, for_write);
end;
$$;
grant execute on function public.can_access_record_path(text, boolean) to authenticated;

-- ---- Private bucket for record files ---------------------------------------
insert into storage.buckets (id, name, public)
values ('records', 'records', false)
on conflict (id) do update set public = false;

drop policy if exists "read record files" on storage.objects;
create policy "read record files" on storage.objects for select to authenticated
  using (bucket_id = 'records' and public.can_access_record_path(name, false));
drop policy if exists "add record files" on storage.objects;
create policy "add record files" on storage.objects for insert to authenticated
  with check (bucket_id = 'records' and public.can_access_record_path(name, true));
drop policy if exists "remove record files" on storage.objects;
create policy "remove record files" on storage.objects for delete to authenticated
  using (bucket_id = 'records' and public.can_access_record_path(name, true));

-- ---- File metadata ----------------------------------------------------------
create table if not exists public.record_files (
  id             uuid primary key default gen_random_uuid(),
  area           text not null check (area in ('payslip', 'deal', 'payment', 'debtors')),
  entity_id      uuid not null,
  path           text not null unique,
  file_name      text not null,
  file_size      integer,
  mime_type      text,
  uploaded_by_id uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists record_files_entity_idx on public.record_files (area, entity_id);

alter table public.record_files enable row level security;
drop policy if exists "read record files meta" on public.record_files;
create policy "read record files meta" on public.record_files for select to authenticated
  using (public.can_access_record(area, entity_id, false));
drop policy if exists "add record files meta" on public.record_files;
create policy "add record files meta" on public.record_files for insert to authenticated
  with check (public.can_access_record(area, entity_id, true)
              and uploaded_by_id = public.current_profile_id()
              and path like area || '/' || entity_id::text || '/%');
drop policy if exists "remove record files meta" on public.record_files;
create policy "remove record files meta" on public.record_files for delete to authenticated
  using (public.can_access_record(area, entity_id, true));

-- ---- Debtors age analysis ----------------------------------------------------
create table if not exists public.debtor_age_reports (
  id             uuid primary key default gen_random_uuid(),
  as_of          date not null,
  file_name      text,
  notes          text,
  uploaded_by_id uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists debtor_age_reports_as_of_idx on public.debtor_age_reports (as_of desc);

create table if not exists public.debtor_age_lines (
  id             uuid primary key default gen_random_uuid(),
  report_id      uuid not null references public.debtor_age_reports(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  account_number text,
  customer_name  text not null,
  current_amount numeric(14,2) not null default 0,
  days_30        numeric(14,2) not null default 0,
  days_60        numeric(14,2) not null default 0,
  days_90        numeric(14,2) not null default 0,
  days_120_plus  numeric(14,2) not null default 0,
  total          numeric(14,2) not null default 0
);
create index if not exists debtor_age_lines_report_idx on public.debtor_age_lines (report_id);

alter table public.debtor_age_reports enable row level security;
alter table public.debtor_age_lines enable row level security;
drop policy if exists "finance read debtor reports" on public.debtor_age_reports;
create policy "finance read debtor reports" on public.debtor_age_reports for select to authenticated
  using (public.can_access_record('debtors', id, false));
drop policy if exists "managers write debtor reports" on public.debtor_age_reports;
create policy "managers write debtor reports" on public.debtor_age_reports for all to authenticated
  using (public.is_active_member() and public.is_manager_plus())
  with check (public.is_active_member() and public.is_manager_plus());
drop policy if exists "finance read debtor lines" on public.debtor_age_lines;
create policy "finance read debtor lines" on public.debtor_age_lines for select to authenticated
  using (public.can_access_record('debtors', report_id, false));
drop policy if exists "managers write debtor lines" on public.debtor_age_lines;
create policy "managers write debtor lines" on public.debtor_age_lines for all to authenticated
  using (public.is_active_member() and public.is_manager_plus())
  with check (public.is_active_member() and public.is_manager_plus());

-- ---- Payments: allow unmatched payments from bank statement imports ---------
alter table public.payments alter column invoice_id drop not null;
alter table public.payments add column if not exists customer_id uuid references public.customers(id) on delete set null;
alter table public.payments add column if not exists payer_name text;
alter table public.payments add column if not exists notes text;
alter table public.payments add column if not exists created_at timestamptz not null default now();
create index if not exists payments_paid_at_idx on public.payments (paid_at desc);
