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
