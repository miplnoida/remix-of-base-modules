
CREATE POLICY "legal_docs_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legal-documents');
CREATE POLICY "legal_docs_auth_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal-documents');
CREATE POLICY "legal_docs_auth_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'legal-documents');
CREATE POLICY "legal_docs_auth_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'legal-documents');
