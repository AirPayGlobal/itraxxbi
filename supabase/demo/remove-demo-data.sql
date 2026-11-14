-- Removes the demo data added by 20261114200000_demo_data.sql, and nothing else.
-- Demo rows are recognised by their fixed ids, "-DEMO-" numbers, "(Demo)" labels and demo emails.
-- Run in the Supabase SQL Editor, or ship it as a migration (copy into supabase/migrations/).
begin;
delete from public.ticket_comments where ticket_id in (select id from public.tickets where ticket_number like 'TKT-DEMO-%');
delete from public.tickets where ticket_number like 'TKT-DEMO-%';
delete from public.vehicle_inspections where job_card_id in (select id from public.job_cards where job_number like 'JC-DEMO-%');
delete from public.payments where invoice_id in (select id from public.invoices where invoice_number like 'INV-DEMO-%') or notes = 'Demo data';
delete from public.invoices where invoice_number like 'INV-DEMO-%';            -- items cascade
delete from public.job_cards where job_number like 'JC-DEMO-%';
delete from public.vehicles where vin like 'DEMOVIN%';
delete from public.tasks where created_by_id in (select id from public.profiles where email like '%@demo.example');
delete from public.projects where id in ('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003');
delete from public.expenses where description like '% (Demo)';
delete from public.assets where asset_number like 'AST-DEMO-%';
delete from public.deals where company like '% (Demo)';
delete from public.debtor_age_reports where id = 'a5000000-0000-0000-0000-000000000001';   -- lines cascade
delete from public.meetings where created_by_id in (select id from public.profiles where email like '%@demo.example');
delete from public.customer_onboarding where customer_id in (select id from public.customers where name like '% (Demo)');
-- People: payslips, employees, leave, reviews, trainings and notifications cascade with the profile.
delete from public.leave_requests where user_id in (select id from public.profiles where email like '%@demo.example');
delete from public.profiles where email like '%@demo.example' or email in ('demo@sinapsedi.com', 'demo.client@sinapsedi.com');
delete from public.customers where name like '% (Demo)';
commit;
