-- Removes everything the live E2E suites create: records named "E2E …" and the e2e.*@example.com users.
-- Run in the Supabase SQL Editor (or via the connector). Clerk users are removed separately (e2e/cleanup-clerk.sh).
begin;
delete from public.ticket_comments where ticket_id in (select id from public.tickets where subject like 'E2E %' or customer_id in (select id from public.customers where name like 'E2E Test Co%'));
delete from public.tickets where subject like 'E2E %' or customer_id in (select id from public.customers where name like 'E2E Test Co%');
delete from public.tasks where title like 'E2E %';
delete from public.deals where title like 'E2E %' or company like 'E2E Test Co%';
delete from public.customer_onboarding where customer_id in (select id from public.customers where name like 'E2E Test Co%');
delete from public.meetings where title like 'E2E %';
delete from public.invitations where email like 'e2e.%@example.com';
delete from public.profiles where email like 'e2e.%@example.com';
delete from public.customers where name like 'E2E Test Co%';
commit;
