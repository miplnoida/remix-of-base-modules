-- 1) Storage bucket for audit report signatures (public read for embedding in PDFs/print)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-signatures', 'audit-signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies: anyone authenticated can upload, public can read
DROP POLICY IF EXISTS "audit_sig_public_read" ON storage.objects;
CREATE POLICY "audit_sig_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'audit-signatures');

DROP POLICY IF EXISTS "audit_sig_auth_insert" ON storage.objects;
CREATE POLICY "audit_sig_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audit-signatures');

DROP POLICY IF EXISTS "audit_sig_auth_update" ON storage.objects;
CREATE POLICY "audit_sig_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audit-signatures');

-- 2) Add employer representative fields to the report header
ALTER TABLE public.ce_employer_audit_reports
  ADD COLUMN IF NOT EXISTS employer_rep_name text,
  ADD COLUMN IF NOT EXISTS employer_rep_designation text;