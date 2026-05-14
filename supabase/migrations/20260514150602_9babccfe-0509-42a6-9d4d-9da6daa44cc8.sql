-- Restrict audit-signatures storage bucket policies to authenticated users
DROP POLICY IF EXISTS "audit_sig_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "audit_sig_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "audit_sig_public_read" ON storage.objects;

CREATE POLICY "audit_sig_auth_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audit-signatures');

CREATE POLICY "audit_sig_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audit-signatures')
  WITH CHECK (bucket_id = 'audit-signatures');

CREATE POLICY "audit_sig_auth_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'audit-signatures');