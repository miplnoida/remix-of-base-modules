ALTER TABLE public.ce_employer_audit_reports
  ADD COLUMN IF NOT EXISTS methodology TEXT,
  ADD COLUMN IF NOT EXISTS sampling_basis TEXT,
  ADD COLUMN IF NOT EXISTS risk_rating TEXT,
  ADD COLUMN IF NOT EXISTS dispute_instructions TEXT,
  ADD COLUMN IF NOT EXISTS internal_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS employer_pdf_url TEXT;

COMMENT ON COLUMN public.ce_employer_audit_reports.methodology IS 'Internal-only: audit procedures performed.';
COMMENT ON COLUMN public.ce_employer_audit_reports.sampling_basis IS 'Internal-only: population, sample size, and selection method.';
COMMENT ON COLUMN public.ce_employer_audit_reports.risk_rating IS 'Internal-only: overall risk rating (Low/Medium/High/Critical).';
COMMENT ON COLUMN public.ce_employer_audit_reports.dispute_instructions IS 'Employer-facing: how to dispute a violation.';
COMMENT ON COLUMN public.ce_employer_audit_reports.internal_pdf_url IS 'Stored finalized PDF — internal/working-paper variant.';
COMMENT ON COLUMN public.ce_employer_audit_reports.employer_pdf_url IS 'Stored finalized PDF — employer-facing variant.';