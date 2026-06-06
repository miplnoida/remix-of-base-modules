
CREATE POLICY "Authenticated users can upload bn evidence" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bn-evidence');
CREATE POLICY "Authenticated users can read bn evidence" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bn-evidence');
CREATE POLICY "Authenticated users can update bn evidence" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bn-evidence');
CREATE POLICY "Authenticated users can delete bn evidence" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bn-evidence');
