-- Make ia-artifacts bucket public for downloads
UPDATE storage.buckets SET public = true WHERE id = 'ia-artifacts';

-- Allow authenticated users to upload to ia-artifacts
CREATE POLICY "Authenticated users can upload ia-artifacts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ia-artifacts');

-- Allow authenticated users to read ia-artifacts
CREATE POLICY "Authenticated users can read ia-artifacts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ia-artifacts');

-- Allow authenticated users to update ia-artifacts
CREATE POLICY "Authenticated users can update ia-artifacts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ia-artifacts');

-- Allow authenticated users to delete ia-artifacts
CREATE POLICY "Authenticated users can delete ia-artifacts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ia-artifacts');