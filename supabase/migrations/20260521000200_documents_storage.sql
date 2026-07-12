-- =============================================================
-- Storage bucket for the Documents module.
-- PRIVATE bucket: documents can be CONFIDENTIAL/RESTRICTED, so objects are
-- NOT publicly readable. public.documents.file_url stores the object *path*;
-- the app serves files through short-lived signed URLs. Access is gated by
-- the authenticated-only RLS policies below.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- Authenticated users may read/write objects in the documents bucket.
create policy "authenticated read documents bucket"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "authenticated insert documents bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents');

create policy "authenticated update documents bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

create policy "authenticated delete documents bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');
