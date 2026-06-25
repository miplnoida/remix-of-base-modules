-- Storage RLS policies for legal-contract-docs bucket
CREATE POLICY "Upload legal contract docs" ON storage.objects FOR INSERT TO authenticated, anon WITH CHECK (bucket_id = 'legal-contract-docs');
CREATE POLICY "Read legal contract docs" ON storage.objects FOR SELECT TO authenticated, anon USING (bucket_id = 'legal-contract-docs');
CREATE POLICY "Update legal contract docs" ON storage.objects FOR UPDATE TO authenticated, anon USING (bucket_id = 'legal-contract-docs');
CREATE POLICY "Delete legal contract docs" ON storage.objects FOR DELETE TO authenticated, anon USING (bucket_id = 'legal-contract-docs');