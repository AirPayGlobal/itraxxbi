-- =============================================================
-- Public Storage bucket for brand/profile images (company logo, avatars).
-- These are display images meant to be shown in the UI, so the bucket is
-- PUBLIC (readable by URL). Uploads are restricted to authenticated users.
-- Files are organised by folder: logos/ and avatars/.
-- =============================================================

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do update set public = true;

create policy "public read brand-assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

create policy "authenticated write brand-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brand-assets');

create policy "authenticated update brand-assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'brand-assets');

create policy "authenticated delete brand-assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brand-assets');

-- Persist the company logo URL alongside the rest of the company settings.
alter table public.company_settings
  add column if not exists logo_url text;
