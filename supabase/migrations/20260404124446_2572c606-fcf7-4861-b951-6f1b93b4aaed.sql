
-- ============================================================
-- Benefit Documents & Evidence Module
-- ============================================================

-- 1. bn_service_doc_type
CREATE TABLE public.bn_service_doc_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code VARCHAR(30) NOT NULL UNIQUE,
  type_name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL DEFAULT 'IDENTITY',
  default_expiry_days INT NULL,
  requires_witness BOOLEAN NOT NULL DEFAULT false,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50) NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50) NULL,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. bn_doc_requirement (product_version_id is a plain UUID, no FK since bn_product_version doesn't exist yet)
CREATE TABLE public.bn_doc_requirement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_version_id UUID NULL,
  product_id UUID NULL,
  document_type_code VARCHAR(30) NOT NULL,
  stage VARCHAR(30) NOT NULL DEFAULT 'INTAKE',
  requirement_level VARCHAR(20) NOT NULL DEFAULT 'MANDATORY',
  allowed_extensions TEXT[] DEFAULT '{pdf,jpg,jpeg,png}',
  max_file_size_mb NUMERIC(6,2) NOT NULL DEFAULT 10,
  expiry_days INT NULL,
  requires_notarization BOOLEAN NOT NULL DEFAULT false,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50) NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50) NULL,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. bn_claim_evidence
CREATE TABLE public.bn_claim_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  requirement_id UUID NULL,
  document_type_code VARCHAR(30) NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  file_name VARCHAR(300) NULL,
  file_path TEXT NULL,
  file_size INT NULL,
  mime_type VARCHAR(100) NULL,
  storage_bucket VARCHAR(100) NULL DEFAULT 'bn-evidence',
  checksum_sha256 VARCHAR(64) NULL,
  source VARCHAR(20) NOT NULL DEFAULT 'UPLOAD',
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  status_reason TEXT NULL,
  verified_by VARCHAR(50) NULL,
  verified_at TIMESTAMPTZ NULL,
  rejected_by VARCHAR(50) NULL,
  rejected_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  waived_by VARCHAR(50) NULL,
  waived_at TIMESTAMPTZ NULL,
  waiver_reason TEXT NULL,
  waiver_authority_level INT NULL,
  expires_at DATE NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  entered_by VARCHAR(50) NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50) NULL,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. bn_evidence_audit
CREATE TABLE public.bn_evidence_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.bn_claim_evidence(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  reason TEXT NULL,
  performed_by VARCHAR(50) NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. bn_evidence_checklist
CREATE TABLE public.bn_evidence_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.bn_doc_requirement(id),
  evidence_id UUID NULL REFERENCES public.bn_claim_evidence(id),
  status VARCHAR(20) NOT NULL DEFAULT 'OUTSTANDING',
  is_blocking BOOLEAN NOT NULL DEFAULT true,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bn_doc_req_version ON public.bn_doc_requirement(product_version_id);
CREATE INDEX idx_bn_doc_req_product ON public.bn_doc_requirement(product_id);
CREATE INDEX idx_bn_doc_req_stage ON public.bn_doc_requirement(stage);
CREATE INDEX idx_bn_evidence_claim ON public.bn_claim_evidence(claim_id);
CREATE INDEX idx_bn_evidence_status ON public.bn_claim_evidence(status);
CREATE INDEX idx_bn_evidence_audit_claim ON public.bn_evidence_audit(claim_id);
CREATE INDEX idx_bn_evidence_checklist_claim ON public.bn_evidence_checklist(claim_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('bn-evidence', 'bn-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Seed bn_service_doc_type
INSERT INTO public.bn_service_doc_type (type_code, type_name, category, default_expiry_days, requires_witness, description) VALUES
  ('LIFE_CERT', 'Life Certificate', 'PERIODIC', 365, false, 'Annual proof-of-life certificate for pension continuation'),
  ('DEATH_CERT', 'Death Certificate', 'IDENTITY', NULL, false, 'Official death certificate issued by registrar'),
  ('SCHOOL_CERT', 'School/College Certificate', 'PERIODIC', 365, false, 'Proof of enrollment for dependent children education'),
  ('BANK_EFT', 'Bank/EFT Authorization Form', 'FINANCIAL', NULL, false, 'Bank account details for electronic funds transfer'),
  ('EMPLOYER_CONF', 'Employer Confirmation', 'EMPLOYMENT', 90, false, 'Employer confirmation of employment and wages'),
  ('MEDICAL_CERT', 'Medical Certificate', 'MEDICAL', 90, false, 'Medical certificate from authorized practitioner'),
  ('PROOF_RELATION', 'Proof of Relationship', 'RELATIONSHIP', NULL, true, 'Document proving family relationship'),
  ('BIRTH_CERT', 'Birth Certificate', 'IDENTITY', NULL, false, 'Official birth certificate'),
  ('ID_CARD', 'National ID Card', 'IDENTITY', NULL, false, 'Government-issued identification card'),
  ('MARRIAGE_CERT', 'Marriage Certificate', 'RELATIONSHIP', NULL, false, 'Official marriage certificate'),
  ('POLICE_REPORT', 'Police Report', 'IDENTITY', NULL, false, 'Police report for incident or injury claims'),
  ('INJURY_REPORT', 'Injury/Incident Report', 'EMPLOYMENT', 30, false, 'Employer-filed injury or incident report'),
  ('SURVIVOR_CERT', 'Survivor Certificate', 'RELATIONSHIP', NULL, true, 'Certificate confirming survivor status')
ON CONFLICT (type_code) DO NOTHING;

-- Audit triggers
CREATE TRIGGER trg_bn_service_doc_type_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_service_doc_type
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER trg_bn_doc_requirement_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_doc_requirement
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER trg_bn_claim_evidence_audit_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_claim_evidence
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();

CREATE TRIGGER trg_bn_evidence_checklist_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_evidence_checklist
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
