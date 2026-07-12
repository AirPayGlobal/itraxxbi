# iTraxx BI — Build Roadmap

Tracks remaining work to take the app from prototype to production. Modules
marked ✅ read/write real Supabase data. See `README.md` for the per-module
wiring table.

## ✅ Done
- Supabase migration (Auth + Postgres), typed client, TanStack Query data layer
- Dashboard home, Customers, Tasks, Job Cards, Finance (invoices + expenses),
  Tickets, Projects, Inventory, HR, Documents
- Documents stored in a **private** Storage bucket, served via signed URLs
- Role-based RLS: broad read, writes scoped by role (viewer / staff / manager+)

## 🔜 Next up (recommended order)
- [x] **Role-based RLS** — scope writes by `profiles.role` *(done; read-tightening for HR/finance still open — see below)*
- [ ] **Settings persistence** — `company_settings` table so Save actually saves; real password change, avatar upload
- [ ] **Notifications** — create + read from the `notifications` table; wire the header bell (currently hardcoded to 3)
- [ ] **Vehicles UI** — list/track a customer's vehicles (core to a GPS-tracking business)

## 📋 Mock pages needing a new table
- [ ] **Payslips** — `payslips` table + real payroll/tax engine (current engine hardcodes PAYE)
- [ ] **Customer-Onboarding** — `onboarding_workflows` table with stage/checklist model + stage advancement
- [ ] **Sales-Pipeline** — `deals` (+ `escalations`) tables; Kanban, KPIs, charts currently in-memory

## 📋 Mock pages (existing tables, no new schema)
- [ ] **Staff performance** — derive metrics from real `tickets` / `profiles`
- [ ] **My-Portal** — aggregate the logged-in user's tasks/leave/payslips (also fixes the payslip identity bug); do after Payslips

## 📋 Tables that exist but have no UI
- [ ] Communications (CRM contact log)
- [ ] Comments & Attachments on tasks/job-cards (tickets already have comments)
- [ ] Asset assignments (Inventory "Assign" is disabled)
- [ ] Activity logs (nothing writes audit entries)
- [ ] Document versions (re-upload a new version)

## 🔧 Cross-cutting / production hardening
- [ ] **Tighten reads** on HR (`employees` salary/bank) and finance to manager+ — currently all authenticated users can read them
- [ ] **Apply migrations to the live project** (`supabase db push`, needs DB password)
- [ ] **Pagination** — queries fetch all rows (Supabase caps at 1000; large tables truncate silently)
- [ ] **Other file uploads → Storage** — expense receipts, profile avatars (same private-bucket pattern as Documents)
- [ ] **Realtime** — Supabase subscriptions for notifications/tickets
- [ ] **Tests** — none yet

## 🚀 Domain features not started
- [ ] Live vehicle tracking / map view / device telemetry / geofencing
- [ ] Invoice & document **PDF generation** ("Download PDF" has no generator)
- [ ] Transactional **email** (invoice send, password reset delivery/templates)
- [ ] AI features (TRAXX, Meeting-AI) — currently simulated; Meeting-AI also needs speech-to-text
