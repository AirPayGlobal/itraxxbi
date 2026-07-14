-- =============================================================
-- Approval workflow for vehicle inspections.
-- Technician submits -> SUBMITTED. Office Administrator approves -> APPROVED
-- and the checklist is dispatched to the client (sent_to_client_at + the
-- client_email it went to). Can also be REJECTED back to the technician.
-- =============================================================

create type inspection_status as enum ('SUBMITTED', 'APPROVED', 'REJECTED');

alter table public.vehicle_inspections
  add column status inspection_status not null default 'SUBMITTED',
  add column approved_by_id uuid references public.profiles(id) on delete set null,
  add column approved_at timestamptz,
  add column sent_to_client_at timestamptz,
  add column client_email text,
  add column review_note text;

create index on public.vehicle_inspections (status);
