-- Deleting a customer removes its client portal accounts.
-- Before, the delete tried to set profiles.customer_id to null, which a CLIENT profile may not have
-- (profiles_client_has_customer), so customers with portal users could not be deleted at all.
alter table public.profiles drop constraint if exists profiles_customer_id_fkey;
alter table public.profiles
  add constraint profiles_customer_id_fkey
  foreign key (customer_id) references public.customers(id) on delete cascade;
