-- =============================================================
-- Storage bucket for the Documents module.
-- Files are uploaded to the "documents" bucket; the public URL (or a
-- signed URL) is stored in public.documents.file_url.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

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
