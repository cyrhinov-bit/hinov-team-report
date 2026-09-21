-- Migration 0002: Storage Buckets Configuration for Avatars & Reports PDF

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('reports_pdf', 'reports_pdf', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public access to avatars and pdfs" ON storage.objects;
CREATE POLICY "Public access to avatars and pdfs"
ON storage.objects FOR SELECT
USING (bucket_id IN ('avatars', 'reports_pdf'));

DROP POLICY IF EXISTS "Authenticated users upload avatars and pdfs" ON storage.objects;
CREATE POLICY "Authenticated users upload avatars and pdfs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('avatars', 'reports_pdf')
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update their avatars and pdfs" ON storage.objects;
CREATE POLICY "Users can update their avatars and pdfs"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('avatars', 'reports_pdf')
  AND auth.role() = 'authenticated'
);

