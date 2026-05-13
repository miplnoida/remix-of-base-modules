
-- ─── Phase 1-5: Enterprise Audit Report Schema ───

-- Extend ce_employer_audit_reports with new fields
ALTER TABLE public.ce_employer_audit_reports
  ADD COLUMN IF NOT EXISTS purpose_scope TEXT,
  ADD COLUMN IF NOT EXISTS records_reviewed TEXT,
  ADD COLUMN IF NOT EXISTS compliance_conclusion TEXT,
  ADD COLUMN IF NOT EXISTS audit_date DATE,
  ADD COLUMN IF NOT EXISTS audit_location TEXT,
  ADD COLUMN IF NOT EXISTS employer_reg_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgment_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN IF NOT EXISTS acknowledgment_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledgment_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_ref VARCHAR(100);

-- Acknowledgment status check
ALTER TABLE public.ce_employer_audit_reports
  DROP CONSTRAINT IF EXISTS ce_ear_ack_status_chk;
ALTER TABLE public.ce_employer_audit_reports
  ADD CONSTRAINT ce_ear_ack_status_chk
  CHECK (acknowledgment_status IN ('NOT_SENT','SENT','VIEWED','SIGNED','REFUSED','EXPIRED'));

-- ─── Versions table (snapshot per save/finalize) ───
CREATE TABLE IF NOT EXISTS public.ce_audit_report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.ce_employer_audit_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot_json JSONB NOT NULL,
  pdf_url TEXT,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, version_number)
);
CREATE INDEX IF NOT EXISTS ce_arv_report_idx ON public.ce_audit_report_versions(report_id);

-- ─── Signatures table ───
CREATE TABLE IF NOT EXISTS public.ce_audit_report_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.ce_employer_audit_reports(id) ON DELETE CASCADE,
  signer_role VARCHAR(30) NOT NULL,
  signer_name VARCHAR(200) NOT NULL,
  signer_designation VARCHAR(150),
  signer_email VARCHAR(150),
  signature_type VARCHAR(20) NOT NULL,
  signature_image_url TEXT,
  typed_name TEXT,
  attestation_text TEXT,
  comments TEXT,
  refusal_reason TEXT,
  signed_at TIMESTAMPTZ,
  ip_address VARCHAR(64),
  user_agent TEXT,
  captured_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ce_ars_role_chk CHECK (signer_role IN ('EMPLOYER_REP','INSPECTOR','SUPERVISOR','WITNESS')),
  CONSTRAINT ce_ars_type_chk CHECK (signature_type IN ('PHYSICAL','ELECTRONIC','TYPED_ATTESTATION','REFUSED','UNAVAILABLE','UPLOADED'))
);
CREATE INDEX IF NOT EXISTS ce_ars_report_idx ON public.ce_audit_report_signatures(report_id);
CREATE INDEX IF NOT EXISTS ce_ars_role_idx ON public.ce_audit_report_signatures(signer_role);

-- ─── Acknowledgment delivery (tokenized link for deferred e-sign) ───
CREATE TABLE IF NOT EXISTS public.ce_audit_report_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.ce_employer_audit_reports(id) ON DELETE CASCADE,
  recipient_name VARCHAR(200) NOT NULL,
  recipient_email VARCHAR(150),
  recipient_designation VARCHAR(150),
  link_token VARCHAR(100) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_viewed_at TIMESTAMPTZ,
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  signature_id UUID REFERENCES public.ce_audit_report_signatures(id) ON DELETE SET NULL,
  created_by VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ce_ara_status_chk CHECK (status IN ('PENDING','VIEWED','SIGNED','REFUSED','EXPIRED','REVOKED'))
);
CREATE INDEX IF NOT EXISTS ce_ara_report_idx ON public.ce_audit_report_acknowledgments(report_id);
CREATE INDEX IF NOT EXISTS ce_ara_token_idx ON public.ce_audit_report_acknowledgments(link_token);
