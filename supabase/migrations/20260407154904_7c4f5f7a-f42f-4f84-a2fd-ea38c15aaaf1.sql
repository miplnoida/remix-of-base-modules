CREATE POLICY "Authenticated users can upload employer documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'employer-documents');

CREATE POLICY "Authenticated users can read employer documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'employer-documents');

CREATE POLICY "Authenticated users can update employer documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'employer-documents');

CREATE POLICY "Authenticated users can delete employer documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'employer-documents');