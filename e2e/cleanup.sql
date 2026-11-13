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

-- Data uploads (live-uploads.cjs)
begin;
delete from storage.objects where bucket_id = 'records' and name in (
  select path from public.record_files where file_name like 'E2E-%' or entity_id in (select id from public.deals where title like 'E2E %'));
delete from public.record_files where file_name like 'E2E-%' or entity_id in (select id from public.deals where title like 'E2E %');
delete from public.debtor_age_reports where id in (select report_id from public.debtor_age_lines where customer_name like 'E2E Debtor %');
delete from public.payments where reference like 'E2E %' or payer_name like 'E2E %';
delete from public.payslips where user_id in (select id from public.profiles where email like 'e2e.%@example.com');
delete from public.employees where user_id in (select id from public.profiles where email like 'e2e.%@example.com');
delete from public.deals where title like 'E2E %';
-- Files whose record no longer exists (e.g. deals or debtors reports removed by live-cleanup.cjs)
delete from storage.objects where bucket_id = 'records' and name in (
  select f.path from public.record_files f
  where (f.area = 'deal' and not exists (select 1 from public.deals d where d.id = f.entity_id))
     or (f.area = 'debtors' and not exists (select 1 from public.debtor_age_reports r where r.id = f.entity_id))
     or (f.area = 'payslip' and not exists (select 1 from public.payslips p where p.id = f.entity_id))
     or (f.area = 'payment' and not exists (select 1 from public.payments p where p.id = f.entity_id)));
delete from public.record_files f
  where (f.area = 'deal' and not exists (select 1 from public.deals d where d.id = f.entity_id))
     or (f.area = 'debtors' and not exists (select 1 from public.debtor_age_reports r where r.id = f.entity_id))
     or (f.area = 'payslip' and not exists (select 1 from public.payslips p where p.id = f.entity_id))
     or (f.area = 'payment' and not exists (select 1 from public.payments p where p.id = f.entity_id));
delete from public.invitations where email like 'e2e.%@example.com';
delete from public.profiles where email like 'e2e.%@example.com';
commit;
