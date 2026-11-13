-- One-off: remove data left by the live end-to-end tests.
-- Strictly scoped to test markers: emails e2e.*@example.com and records named "E2E …".
-- (Their storage files were already removed through the Storage API.)
delete from public.payments where reference like 'E2E %' or payer_name like 'E2E %';
delete from public.debtor_age_reports where id in (select report_id from public.debtor_age_lines where customer_name like 'E2E Debtor %');
delete from public.ticket_comments where ticket_id in (select id from public.tickets where subject like 'E2E %');
delete from public.tickets where subject like 'E2E %';
delete from public.tasks where title like 'E2E %';
delete from public.deals where title like 'E2E %' or company like 'E2E %';
delete from public.customers where name like 'E2E Test Co%' or name like 'E2E Import Co%';
delete from public.invitations where email like 'e2e.%@example.com';
delete from public.payslips where user_id in (select id from public.profiles where email like 'e2e.%@example.com');
delete from public.employees where user_id in (select id from public.profiles where email like 'e2e.%@example.com');

-- Delete each test profile; if something real still points at one, deactivate it instead.
do $$
declare p record;
begin
  for p in select id from public.profiles where email like 'e2e.%@example.com' loop
    begin
      delete from public.profiles where id = p.id;
    exception when foreign_key_violation then
      update public.profiles set is_active = false, clerk_user_id = null where id = p.id;
    end;
  end loop;
end $$;
