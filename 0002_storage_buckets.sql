-- =============================================================================
-- STK Render AI — Migration 0002: Storage Buckets (Fase 1)
-- =============================================================================
-- Bucket 'uploads': arquivos originais enviados pelo usuário (JPG/PNG/PDF).
-- Privado. Path pattern: {user_id}/{project_id}/{filename}
--
-- Buckets de render (renders-preview, renders-highres) e processed/
-- serão criados na Fase 2, quando o pipeline de render existir.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  false,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- POLICIES: usuários só acessam arquivos dentro de sua própria pasta
-- ({user_id}/...), garantindo isolamento mesmo dentro do bucket privado.
-- -----------------------------------------------------------------------------

create policy "Users can upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
