-- =============================================================
-- Demo data for the DEMO SITE ONLY (never the live database).
-- Loaded by scripts/migrate.mjs when DEMO_MODE=1 and the database has no
-- customers yet. Every company and person here is fictional.
-- Dates are relative to now() so the demo always looks current.
-- =============================================================

-- ---- Company --------------------------------------------------------------
update public.company_settings set
  company_name = 'ITRACKERX Demo', industry = 'fleet', company_size = '11-50',
  primary_email = 'info@example.com', phone_number = '+264 61 000 0000', website = 'https://itraxxbi.sinapsedi.com',
  country = 'NA', address = '1 Demo Street, Windhoek', vat_number = 'DEMO-VAT', currency = 'NAD', timezone = 'Africa/Windhoek'
where id = 'default';

-- ---- People (staff are profiles without a sign-in; the two demo logins link on first sign-in) ----
insert into public.profiles (id, email, name, role, department, job_title, phone, is_active) values
  ('d0000000-0000-0000-0000-000000000001', 'anna.manager@demo.example', 'Anna Shilongo', 'MANAGER', 'Operations', 'Operations Manager', '+264 81 000 0001', true),
  ('d0000000-0000-0000-0000-000000000002', 'petrus.tech@demo.example', 'Petrus Nghifikwa', 'TECHNICIAN', 'Technical', 'Senior Installation Technician', '+264 81 000 0002', true),
  ('d0000000-0000-0000-0000-000000000003', 'maria.tech@demo.example', 'Maria Iipinge', 'TECHNICIAN', 'Technical', 'Installation Technician', '+264 81 000 0003', true),
  ('d0000000-0000-0000-0000-000000000004', 'johan.staff@demo.example', 'Johan van Wyk', 'STAFF', 'Administration', 'Office Administrator', '+264 81 000 0004', true),
  ('d0000000-0000-0000-0000-000000000005', 'selma.staff@demo.example', 'Selma Amutenya', 'STAFF', 'Support', 'Customer Support Agent', '+264 81 000 0005', true),
  ('d0000000-0000-0000-0000-000000000006', 'demo@sinapsedi.com', 'Demo Viewer', 'VIEWER', 'Demo', 'Guest (read-only)', null, true)
on conflict (email) do nothing;

-- ---- Customers -------------------------------------------------------------
insert into public.customers (id, name, company, email, phone, address, city, country, account_number, status, notes, contract_start, contract_end, created_at)
select ('c0000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, c.name, c.name, c.email, c.phone, c.addr, c.city, 'Namibia',
       'ACC-' || lpad(n::text, 4, '0'), c.status::customer_status, c.notes,
       now() - (c.months || ' months')::interval, now() + ((24 - c.months) || ' months')::interval,
       now() - (c.months || ' months')::interval
from (values
  (1, 'Kalahari Freight Lines', 'fleet@kalahari-freight.example', '+264 61 100 001', '12 Industrial Rd', 'Windhoek', 'ACTIVE', 'Long-haul trucking, 40-vehicle fleet', 18),
  (2, 'Etosha Safari Transfers', 'ops@etosha-transfers.example', '+264 67 100 002', '3 Park Gate Ave', 'Outjo', 'ACTIVE', 'Tour vehicles; wants geofencing alerts', 14),
  (3, 'Swakop Cold Chain', 'logistics@swakopcold.example', '+264 64 100 003', '8 Harbour St', 'Swakopmund', 'ACTIVE', 'Refrigerated trucks with temperature sensors', 11),
  (4, 'Namib Mining Logistics', 'transport@namibmining.example', '+264 64 100 004', 'Mine Road 1', 'Arandis', 'ACTIVE', 'Heavy vehicles, fuel sensors', 9),
  (5, 'Okavango Bus Services', 'admin@okavangobus.example', '+264 66 100 005', '22 Main St', 'Rundu', 'ACTIVE', 'Passenger buses; MDVR cameras', 8),
  (6, 'Erongo Construction', 'plant@erongo-construction.example', '+264 64 100 006', '5 Builders Way', 'Walvis Bay', 'ACTIVE', 'Plant and bakkies', 6),
  (7, 'Desert Rose Couriers', 'dispatch@desertrose.example', '+264 61 100 007', '17 Sam Nujoma Dr', 'Windhoek', 'ACTIVE', 'Courier vans, route optimisation', 5),
  (8, 'Kunene Water Works', 'fleet@kunenewater.example', '+264 65 100 008', 'Water Board Office', 'Opuwo', 'ACTIVE', 'Government water tankers', 4),
  (9, 'Skeleton Coast Fisheries', 'transport@skeletonfish.example', '+264 64 100 009', 'Fishing Harbour', 'Walvis Bay', 'ACTIVE', null, 3),
  (10, 'Windhoek Taxi Co-op', 'office@whktaxi.example', '+264 61 100 010', '4 Rank St', 'Windhoek', 'ACTIVE', 'Many small owners; per-vehicle billing', 2),
  (11, 'Otjiwarongo Agri Supplies', 'buyer@otjiagri.example', '+264 67 100 011', '9 Farm Rd', 'Otjiwarongo', 'PROSPECT', 'Quote sent for 12 bakkies', 1),
  (12, 'Luderitz Port Services', 'it@luderitzport.example', '+264 63 100 012', 'Port Rd', 'Luderitz', 'INACTIVE', 'Contract paused', 20)
) as c(n, name, email, phone, addr, city, status, notes, months)
on conflict do nothing;

-- The client portal demo login belongs to Kalahari Freight Lines.
insert into public.profiles (id, email, name, role, department, job_title, is_active, customer_id) values
  ('d0000000-0000-0000-0000-000000000007', 'demo.client@sinapsedi.com', 'Demo Client', 'CLIENT', null, 'Fleet Manager (demo)', true,
   'c0000000-0000-0000-0000-000000000001')
on conflict (email) do nothing;

-- ---- Vehicles: 3 per active customer ----------------------------------------
insert into public.vehicles (id, registration_number, make, model, year, color, vin, tracker_device_id, tracker_status, last_service_date, next_service_date, customer_id)
select ('e0000000-0000-0000-0000-0000000' || lpad((c * 10 + v)::text, 5, '0'))::uuid,
       'N ' || (10000 + c * 137 + v * 29) || ' ' || (array['W','WB','S','K','R','OK'])[1 + (c + v) % 6],
       (array['Toyota','Isuzu','Ford','Mercedes-Benz','Scania','Toyota','Nissan'])[1 + (c * 3 + v) % 7],
       (array['Hilux','D-Max','Ranger','Actros','R450','Land Cruiser 79','NP200'])[1 + (c * 3 + v) % 7],
       2016 + (c + v) % 9,
       (array['White','Silver','Red','Blue','Grey'])[1 + (c + v) % 5],
       'DEMOVIN' || lpad((c * 10 + v)::text, 10, '0'),
       'TRX-' || lpad((c * 10 + v)::text, 6, '0'),
       (case when (c + v) % 9 = 0 then 'FAULTY' when (c + v) % 7 = 0 then 'INACTIVE' else 'ACTIVE' end)::tracker_status,
       now() - ((c * 7 + v * 11) % 120 || ' days')::interval,
       now() + ((c * 13 + v * 17) % 90 || ' days')::interval,
       ('c0000000-0000-0000-0000-0000000000' || lpad(c::text, 2, '0'))::uuid
from generate_series(1, 10) c, generate_series(1, 3) v
on conflict do nothing;

-- ---- Projects & tasks ---------------------------------------------------------
insert into public.projects (id, name, description, status, start_date, end_date) values
  ('f0000000-0000-0000-0000-000000000001', 'Kalahari Freight fleet roll-out', 'Install trackers and fuel sensors on 40 trucks', 'ACTIVE', now() - interval '40 days', now() + interval '30 days'),
  ('f0000000-0000-0000-0000-000000000002', 'MDVR upgrade for Okavango Bus', 'Cameras and remote view on all buses', 'PLANNING', now() + interval '7 days', now() + interval '60 days'),
  ('f0000000-0000-0000-0000-000000000003', 'Q3 device firmware update', 'Update all active trackers to the latest firmware', 'COMPLETED', now() - interval '90 days', now() - interval '50 days')
on conflict do nothing;

insert into public.tasks (title, description, status, priority, due_date, start_date, completed_at, assignee_id, created_by_id, project_id)
select t.title, t.descr, t.status::task_status, t.prio::priority,
       now() + (t.due || ' days')::interval, now() - interval '10 days',
       case when t.status = 'DONE' then now() - ((abs(t.due) % 9 + 1) || ' days')::interval end,
       ('d0000000-0000-0000-0000-00000000000' || t.who)::uuid, 'd0000000-0000-0000-0000-000000000001',
       case when t.proj > 0 then ('f0000000-0000-0000-0000-00000000000' || t.proj)::uuid end
from (values
  ('Schedule installs for trucks 21-30', 'Coordinate with Kalahari depot manager', 'IN_PROGRESS', 'HIGH', 3, 1, 1),
  ('Order 20 fuel sensors', 'Supplier quote attached in Documents', 'DONE', 'HIGH', -5, 4, 1),
  ('Configure geofences for Etosha routes', null, 'TODO', 'MEDIUM', 6, 2, 0),
  ('Replace faulty tracker on N 10166 W', 'Device not reporting since Monday', 'IN_PROGRESS', 'URGENT', 1, 3, 0),
  ('Prepare monthly fleet report for Swakop Cold Chain', null, 'REVIEW', 'MEDIUM', 2, 5, 0),
  ('Follow up overdue invoice INV-DEMO-0007', 'Customer promised payment by Friday', 'TODO', 'HIGH', -2, 4, 0),
  ('Site survey for MDVR cameras', 'Count buses and cable runs', 'TODO', 'MEDIUM', 10, 2, 2),
  ('Quote MDVR hardware', null, 'TODO', 'LOW', 12, 1, 2),
  ('Train Desert Rose dispatchers on the portal', null, 'DONE', 'MEDIUM', -8, 5, 0),
  ('Renew SIM data bundles for Kunene tankers', null, 'IN_PROGRESS', 'HIGH', 4, 4, 0),
  ('Firmware rollout batch 3', null, 'DONE', 'MEDIUM', -55, 3, 3),
  ('Firmware rollout batch 4', null, 'DONE', 'MEDIUM', -52, 2, 3),
  ('Update installation SOP', 'Add fuel sensor calibration steps', 'TODO', 'LOW', 14, 1, 0),
  ('Check stock of tamper seals', null, 'TODO', 'MEDIUM', 5, 4, 0),
  ('Call Otjiwarongo Agri about quote', 'Decision expected this week', 'IN_PROGRESS', 'HIGH', 2, 1, 0)
) as t(title, descr, status, prio, due, who, proj);

-- ---- Job cards (+ approved inspections for completed installs) ----------------------
insert into public.job_cards (id, job_number, title, description, status, priority, job_type, scheduled_date, started_at, completed_at,
                              estimated_hours, actual_hours, location, technician_id, created_by_id, customer_id, vehicle_id)
select ('a1000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid,
       'JC-DEMO-' || lpad(n::text, 4, '0'),
       (array['GPS tracker installation','Fuel sensor installation','Tracker repair','Annual inspection','Device removal','MDVR camera installation'])[1 + n % 6],
       'Demo job for vehicle ' || n,
       s.status::job_status,
       (array['MEDIUM','HIGH','LOW','URGENT'])[1 + n % 4]::priority,
       (array['INSTALLATION','INSTALLATION','REPAIR','INSPECTION','REMOVAL','INSTALLATION'])[1 + n % 6]::job_type,
       now() + ((n % 14) - 7 || ' days')::interval,
       case when s.status in ('IN_PROGRESS','COMPLETED','INVOICED') then now() - ((n % 10) + 2 || ' days')::interval end,
       case when s.status in ('COMPLETED','INVOICED') then now() - ((n % 10) + 1 || ' days')::interval end,
       2 + n % 4, case when s.status in ('COMPLETED','INVOICED') then 2 + n % 5 end,
       (array['Windhoek workshop','Customer depot','Walvis Bay bay 2','On site'])[1 + n % 4],
       ('d0000000-0000-0000-0000-00000000000' || (2 + n % 2))::uuid,
       'd0000000-0000-0000-0000-000000000001',
       ('c0000000-0000-0000-0000-0000000000' || lpad((1 + n % 10)::text, 2, '0'))::uuid,
       ('e0000000-0000-0000-0000-0000000' || lpad(((1 + n % 10) * 10 + 1 + n % 3)::text, 5, '0'))::uuid
from generate_series(1, 24) n
cross join lateral (select (array['OPEN','ASSIGNED','IN_PROGRESS','COMPLETED','INVOICED','COMPLETED','ASSIGNED','INVOICED'])[1 + n % 8] as status) s
on conflict do nothing;

insert into public.vehicle_inspections (job_card_id, customer_id, vehicle_id, inspection_date, start_time, end_time, inspection_type, client_name,
  vehicle_make, vehicle_model_year, vehicle_color, reg_number, odo, gps_imei, gps_serial, sim_number, technician_name, comments, status, approved_at, created_by_id)
select j.id, j.customer_id, j.vehicle_id, (j.completed_at)::date, '08:30', '10:15', 'NEW_FITMENT', cu.name,
       v.make, v.model || ' ' || v.year, v.color, v.registration_number, (40000 + v.year * 7)::text,
       '35' || lpad((abs(hashtext(j.job_number)) % 1000000000)::text, 13, '0'), 'SN-' || right(j.job_number, 4), '+264 81 ' || lpad((abs(hashtext(v.vin)) % 10000000)::text, 7, '0'),
       p.name, 'Installed and tested; vehicle reporting live.',
       (case when right(j.job_number, 1) in ('3','6') then 'SUBMITTED' else 'APPROVED' end)::inspection_status,
       case when right(j.job_number, 1) in ('3','6') then null else j.completed_at + interval '2 hours' end,
       j.technician_id
from public.job_cards j
join public.customers cu on cu.id = j.customer_id
join public.vehicles v on v.id = j.vehicle_id
join public.profiles p on p.id = j.technician_id
where j.job_number like 'JC-DEMO-%' and j.status in ('COMPLETED','INVOICED') and j.job_type = 'INSTALLATION';

-- ---- Tickets & comments ------------------------------------------------------------
insert into public.tickets (id, ticket_number, subject, description, status, priority, category, customer_name, company, email, customer_id, assigned_to_id, created_by_id, resolved_at, created_at)
select ('a2000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'TKT-DEMO-' || lpad(n::text, 4, '0'), t.subject, t.descr,
       t.status::ticket_status, t.prio::ticket_priority, t.cat::ticket_category, cu.name, cu.company, cu.email, cu.id,
       ('d0000000-0000-0000-0000-00000000000' || (2 + n % 4))::uuid, 'd0000000-0000-0000-0000-000000000005',
       case when t.status in ('RESOLVED','CLOSED') then now() - (n || ' days')::interval end,
       now() - (n * 2 || ' days')::interval
from (values
  (1, 'Truck not showing on map', 'Truck N 10166 W stopped reporting yesterday afternoon.', 'IN_PROGRESS', 'HIGH', 'GPS', 1),
  (2, 'Request extra user logins', 'Please add two dispatchers to the portal.', 'OPEN', 'LOW', 'ACCOUNT', 1),
  (3, 'Invoice query for October', 'We were billed for 31 vehicles but have 30.', 'RESOLVED', 'MEDIUM', 'BILLING', 3),
  (4, 'Geofence alerts too sensitive', 'Getting alerts when buses wait at the depot gate.', 'OPEN', 'MEDIUM', 'TECHNICAL', 5),
  (5, 'Fuel readings look wrong', 'Tank shows 120% after refuelling.', 'IN_PROGRESS', 'HIGH', 'DEVICE', 4),
  (6, 'New vehicle to add', 'Bought a new Hilux, please install a tracker.', 'OPEN', 'MEDIUM', 'INSTALLATION', 7),
  (7, 'Camera footage request', 'Need footage from bus 4 on Tuesday morning.', 'CLOSED', 'URGENT', 'DEVICE', 5),
  (8, 'Password reset', 'Fleet manager cannot sign in.', 'RESOLVED', 'LOW', 'ACCOUNT', 2)
) as t(n, subject, descr, status, prio, cat, cust)
join public.customers cu on cu.id = ('c0000000-0000-0000-0000-0000000000' || lpad(t.cust::text, 2, '0'))::uuid
on conflict do nothing;

insert into public.ticket_comments (ticket_id, author_id, author_name, content, is_internal, created_at) values
  ('a2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', 'Selma Amutenya', 'Thanks for reporting. A technician is checking the device remotely.', false, now() - interval '20 hours'),
  ('a2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Maria Iipinge', 'SIM looks suspended by the network. Swapping it on site tomorrow.', true, now() - interval '18 hours'),
  ('a2000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007', 'Demo Client', 'Great, the truck is at the Windhoek depot until 10:00.', false, now() - interval '16 hours'),
  ('a2000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'Johan van Wyk', 'Credit note issued for one vehicle. Apologies for the error.', false, now() - interval '3 days'),
  ('a2000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'Petrus Nghifikwa', 'Sensor needs recalibration after the tank was replaced.', true, now() - interval '2 days');

-- ---- Invoices, items, payments --------------------------------------------------------
insert into public.invoices (id, invoice_number, customer_id, subtotal, tax, total, status, issued_date, due_date, paid_date, notes, created_at)
select ('a3000000-0000-0000-0000-0000000000' || lpad(n::text, 2, '0'))::uuid, 'INV-DEMO-' || lpad(n::text, 4, '0'),
       ('c0000000-0000-0000-0000-0000000000' || lpad((1 + n % 10)::text, 2, '0'))::uuid,
       amt, round((amt * 0.15)::numeric, 2), round((amt * 1.15)::numeric, 2), st::invoice_status,
       now() - ((n * 7) || ' days')::interval, now() - ((n * 7 - 30) || ' days')::interval,
       case when st = 'PAID' then now() - ((n * 7 - 20) || ' days')::interval end,
       'Monthly tracking subscription and services', now() - ((n * 7) || ' days')::interval
from generate_series(1, 24) n
cross join lateral (select (1500 + (n * 977) % 9000)::float8 as amt,
  case when n <= 2 then 'DRAFT' when n <= 6 then 'SENT' when n in (7, 9) then 'OVERDUE' when n = 8 then 'PARTIAL' else 'PAID' end as st) x
on conflict do nothing;

insert into public.invoice_items (invoice_id, description, quantity, unit_price, total)
select i.id, li.descr, li.qty, round((i.subtotal * li.share / li.qty)::numeric, 2), round((i.subtotal * li.share)::numeric, 2)
from public.invoices i
cross join (values ('Tracking subscription (per vehicle per month)', 3, 0.6), ('Installation labour', 1, 0.25), ('Hardware: GPS tracker', 1, 0.15)) li(descr, qty, share)
where i.invoice_number like 'INV-DEMO-%';

insert into public.payments (invoice_id, customer_id, payer_name, amount, method, reference, paid_at)
select i.id, i.customer_id, c.name, case when i.status = 'PARTIAL' then round((i.total / 2)::numeric, 2) else i.total end,
       (array['BANK_TRANSFER','BANK_TRANSFER','CARD','MOBILE_PAYMENT'])[1 + right(i.invoice_number, 1)::int % 4]::payment_method,
       'EFT ' || i.invoice_number, coalesce(i.paid_date, now() - interval '5 days')
from public.invoices i join public.customers c on c.id = i.customer_id
where i.invoice_number like 'INV-DEMO-%' and i.status in ('PAID', 'PARTIAL');
-- Two bank receipts not yet matched to an invoice
insert into public.payments (amount, method, reference, payer_name, paid_at, notes) values
  (3450.00, 'BANK_TRANSFER', 'DEP WINDHOEK TAXI COOP', 'Windhoek Taxi Co-op', now() - interval '2 days', 'Imported from bank statement'),
  (1200.00, 'MOBILE_PAYMENT', 'EWALLET 0812345678', null, now() - interval '1 day', 'Imported from bank statement');

-- ---- Expenses (6 months) ---------------------------------------------------------------
insert into public.expenses (description, amount, category, date, vendor, approved)
select e.descr, e.amount * (0.9 + (m % 3) * 0.1), e.cat::expense_category, date_trunc('month', now()) - (m || ' months')::interval + interval '5 days', e.vendor, m > 0
from generate_series(0, 5) m
cross join (values
  ('Staff salaries', 98000, 'SALARY', 'Payroll'),
  ('Office rent', 18500, 'RENT', 'Demo Properties'),
  ('Vehicle fuel', 9200, 'FUEL', 'Demo Fuel Station'),
  ('SIM data bundles', 6400, 'UTILITIES', 'Demo Mobile'),
  ('Tracker stock', 22000, 'EQUIPMENT', 'Demo Devices Ltd'),
  ('Insurance', 4300, 'INSURANCE', 'Demo Insurance')
) e(descr, amount, cat, vendor);

-- ---- Inventory --------------------------------------------------------------------------
insert into public.assets (name, asset_number, serial_number, category, status, purchase_date, purchase_price, current_value, location, quantity, min_stock_level) values
  ('GPS tracker (4G)', 'AST-DEMO-001', 'BATCH-4G-2026', 'TRACKING_DEVICE', 'AVAILABLE', now() - interval '60 days', 1450, 1450, 'Windhoek store', 34, 20),
  ('Fuel level sensor', 'AST-DEMO-002', 'BATCH-FLS-11', 'SPARE_PART', 'AVAILABLE', now() - interval '40 days', 2100, 2100, 'Windhoek store', 6, 10),
  ('MDVR 4-channel kit', 'AST-DEMO-003', 'BATCH-MDVR-3', 'TRACKING_DEVICE', 'AVAILABLE', now() - interval '20 days', 5800, 5800, 'Windhoek store', 4, 5),
  ('Tamper seals (100 pack)', 'AST-DEMO-004', null, 'SPARE_PART', 'AVAILABLE', now() - interval '15 days', 350, 350, 'Walvis Bay store', 12, 5),
  ('Installation bakkie (N 55555 W)', 'AST-DEMO-005', 'DEMOVAN001', 'VEHICLE', 'IN_USE', now() - interval '700 days', 420000, 310000, 'Windhoek', 1, 0),
  ('Diagnostic laptop', 'AST-DEMO-006', 'LAP-0042', 'IT_EQUIPMENT', 'ASSIGNED', now() - interval '300 days', 18000, 12000, 'Petrus Nghifikwa', 1, 0),
  ('Crimping tool set', 'AST-DEMO-007', null, 'TOOL', 'MAINTENANCE', now() - interval '400 days', 2500, 1500, 'Workshop', 3, 2)
on conflict do nothing;

-- ---- HR: employees, leave, payslips, reviews, trainings ----------------------------------
insert into public.employees (id, user_id, employee_number, start_date, contract_type, salary, bank_name, bank_account, tax_number, annual_leave_balance, sick_leave_balance)
select ('a4000000-0000-0000-0000-00000000000' || n)::uuid, ('d0000000-0000-0000-0000-00000000000' || n)::uuid, 'EMP-D0' || n,
       now() - ((n * 200) || ' days')::interval, 'PERMANENT', s.salary, 'Demo Bank', '****' || (1000 + n * 111), 'DEMO-TAX-' || n, 22 - n * 2, 12
from (values (1, 32000), (2, 21000), (3, 18500), (4, 15000), (5, 14000)) s(n, salary)
on conflict do nothing;

insert into public.leave_requests (user_id, leave_type, start_date, end_date, days, reason, status, approved_by_id, approved_at) values
  ('d0000000-0000-0000-0000-000000000003', 'ANNUAL', now() + interval '10 days', now() + interval '14 days', 5, 'Family visit in Oshakati', 'PENDING', null, null),
  ('d0000000-0000-0000-0000-000000000004', 'SICK', now() - interval '6 days', now() - interval '5 days', 2, 'Flu', 'APPROVED', 'd0000000-0000-0000-0000-000000000001', now() - interval '6 days'),
  ('d0000000-0000-0000-0000-000000000002', 'ANNUAL', now() - interval '30 days', now() - interval '26 days', 5, 'Holiday', 'APPROVED', 'd0000000-0000-0000-0000-000000000001', now() - interval '35 days');

insert into public.payslips (payslip_number, user_id, period, pay_date, basic_salary, allowances, deductions, total_allowances, total_deductions, gross_pay, net_pay, status, sent_at)
select 'PS-' || to_char(p.month, 'YYYY-MM') || '-D0' || e.n, ('d0000000-0000-0000-0000-00000000000' || e.n)::uuid, to_char(p.month, 'YYYY-MM'),
       (p.month + interval '1 month - 1 day')::date, e.salary, jsonb_build_object('Transport', 1500),
       jsonb_build_object('PAYE', round(e.salary * 0.18, 2), 'Social Security', 99, 'Pension', round(e.salary * 0.07, 2)),
       1500, round(e.salary * 0.25, 2) + 99, e.salary + 1500, e.salary + 1500 - round(e.salary * 0.25, 2) - 99, 'SENT', p.month + interval '1 month - 1 day'
from (values (1, 32000), (2, 21000), (3, 18500), (4, 15000), (5, 14000)) e(n, salary)
cross join (select date_trunc('month', now()) - (k || ' months')::interval as month from generate_series(1, 2) k) p
on conflict do nothing;

insert into public.performance_kpis (user_id, period, jobs_completed, customer_rating, tasks_completed, attendance_rate, punctuality_rate, overall_score, manager_notes)
select ('d0000000-0000-0000-0000-00000000000' || n)::uuid, to_char(now() - interval '1 month', 'YYYY-MM'), 10 + n * 3, 4.2 + n * 0.1, 8 + n, 0.95, 0.92, 78 + n * 3, 'Solid month'
from generate_series(2, 5) n;

insert into public.trainings (employee_id, name, provider, completed_date, expiry_date, status)
select ('a4000000-0000-0000-0000-00000000000' || n)::uuid, 'Vehicle electrical safety', 'Demo Training Institute', now() - interval '120 days', now() + interval '600 days', 'COMPLETED'
from generate_series(2, 3) n;

-- ---- Sales pipeline & onboarding --------------------------------------------------------
insert into public.deals (title, company, contact_name, contact_email, value, fleet_size, stage, probability, owner_id, expected_close, source, notes, customer_id, last_activity_at)
select d.title, d.company, d.contact, d.email, d.value, d.fleet, d.stage, d.prob, 'd0000000-0000-0000-0000-000000000001', (now() + (d.close || ' days')::interval)::date, d.source, d.notes,
       case when d.cust > 0 then ('c0000000-0000-0000-0000-0000000000' || lpad(d.cust::text, 2, '0'))::uuid end, now() - (d.idle || ' days')::interval
from (values
  ('12 bakkies tracking', 'Otjiwarongo Agri Supplies', 'Hendrik Demo', 'buyer@otjiagri.example', 64800, 12, 'proposal', 50, 14, 'Website', 'Quote sent; waiting on budget approval', 11, 3),
  ('MDVR upgrade', 'Okavango Bus Services', 'Martha Demo', 'admin@okavangobus.example', 138000, 18, 'negotiation', 75, 21, 'Existing customer', null, 5, 1),
  ('Fleet of 25 couriers', 'Desert Rose Couriers', 'Kevin Demo', 'dispatch@desertrose.example', 90000, 25, 'qualified', 30, 45, 'Referral', null, 7, 6),
  ('Mine site vehicles', 'Demo Copper Mine', 'Ruth Demo', 'ruth@democopper.example', 210000, 40, 'lead', 10, 90, 'Trade show', 'Met at mining expo', 0, 20),
  ('School bus tracking', 'Demo Private School', 'Peter Demo', 'bursar@demoschool.example', 36000, 6, 'lead', 10, 60, 'Website', null, 0, 2),
  ('Cold chain sensors', 'Swakop Cold Chain', 'Lena Demo', 'logistics@swakopcold.example', 54000, 10, 'closed_won', 100, -10, 'Existing customer', null, 3, 10),
  ('Taxi rank pilot', 'Windhoek Taxi Co-op', 'Simon Demo', 'office@whktaxi.example', 15000, 10, 'closed_won', 100, -40, 'Walk-in', null, 10, 40),
  ('Port vehicles', 'Luderitz Port Services', 'Anne Demo', 'it@luderitzport.example', 72000, 15, 'closed_lost', 0, -20, 'Tender', 'Lost on price', 12, 25)
) d(title, company, contact, email, value, fleet, stage, prob, close, source, notes, cust, idle);

insert into public.customer_onboarding (customer_id, stage, status, assigned_to_id, vehicle_count, package, target_date, checklist, notes, started_at)
values
  ('c0000000-0000-0000-0000-000000000010', 'INSTALLATION', 'IN_PROGRESS', 'd0000000-0000-0000-0000-000000000002', 10, 'Basic tracking', (now() + interval '10 days')::date,
   jsonb_build_object('INQUIRY', jsonb_build_object('done', true), 'PROPOSAL', jsonb_build_object('done', true), 'CONTRACT', jsonb_build_object('done', true)), 'Installs booked per owner', now() - interval '20 days'),
  ('c0000000-0000-0000-0000-000000000009', 'TRAINING', 'IN_PROGRESS', 'd0000000-0000-0000-0000-000000000005', 3, 'Tracking + fuel', (now() + interval '3 days')::date,
   jsonb_build_object('INQUIRY', jsonb_build_object('done', true), 'PROPOSAL', jsonb_build_object('done', true), 'CONTRACT', jsonb_build_object('done', true), 'INSTALLATION', jsonb_build_object('done', true), 'CONFIGURATION', jsonb_build_object('done', true)), null, now() - interval '45 days');

-- ---- Debtors age analysis (as of last month end) ------------------------------------------
insert into public.debtor_age_reports (id, as_of, file_name, notes) values
  ('a5000000-0000-0000-0000-000000000001', (date_trunc('month', now()) - interval '1 day')::date, 'demo-age-analysis.xlsx', 'Demo data')
on conflict do nothing;
insert into public.debtor_age_lines (report_id, customer_id, account_number, customer_name, current_amount, days_30, days_60, days_90, days_120_plus, total)
select 'a5000000-0000-0000-0000-000000000001', c.id, c.account_number, c.name, a.cur, a.d30, a.d60, a.d90, a.d120, a.cur + a.d30 + a.d60 + a.d90 + a.d120
from (values (1, 18400, 6200, 0, 0, 0), (2, 9600, 0, 0, 0, 0), (3, 12100, 4100, 2300, 0, 0), (4, 22500, 11000, 0, 0, 0),
             (5, 15800, 7900, 3900, 2100, 0), (7, 5400, 0, 0, 0, 0), (8, 8800, 8800, 8800, 0, 4400), (10, 3450, 0, 0, 0, 0), (12, 0, 0, 0, 0, 9800)
) a(n, cur, d30, d60, d90, d120)
join public.customers c on c.id = ('c0000000-0000-0000-0000-0000000000' || lpad(a.n::text, 2, '0'))::uuid;

-- ---- Meetings & notifications ----------------------------------------------------------------
insert into public.meetings (title, meeting_date, duration_seconds, participants, summary, key_points, action_items, created_by_id) values
  ('Weekly operations stand-up', now() - interval '2 days', 1260,
   '[{"id":"d0000000-0000-0000-0000-000000000001","name":"Anna Shilongo"},{"id":"d0000000-0000-0000-0000-000000000002","name":"Petrus Nghifikwa"},{"id":"d0000000-0000-0000-0000-000000000003","name":"Maria Iipinge"}]',
   'Reviewed installs for Kalahari Freight and the faulty tracker backlog.',
   '["Kalahari roll-out is 60% done","Two trackers need SIM swaps","Fuel sensor stock is low"]',
   '[{"text":"Order 20 fuel sensors","assignee_name":"Johan van Wyk"},{"text":"Swap SIM on N 10166 W","assignee_name":"Maria Iipinge"}]',
   'd0000000-0000-0000-0000-000000000001');

insert into public.notifications (user_id, title, message, type, channel, is_read, link)
select ('d0000000-0000-0000-0000-00000000000' || u)::uuid, n.title, n.msg, n.type::notification_type, 'APP', false, n.link
from (values ('Invoice overdue', 'INV-DEMO-0007 is 14 days overdue.', 'FINANCE', '/finance'),
             ('New ticket', 'TKT-DEMO-0002: Request extra user logins', 'INFO', '/tickets'),
             ('Low stock', 'Fuel level sensors are below the minimum stock level.', 'WARNING', '/inventory')) n(title, msg, type, link)
cross join (values (1), (6)) u(u);
