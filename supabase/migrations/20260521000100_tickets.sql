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
