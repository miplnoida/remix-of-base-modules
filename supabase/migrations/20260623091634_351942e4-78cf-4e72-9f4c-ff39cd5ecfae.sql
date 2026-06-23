
-- Extend lg_document_link with source-module attribution so Legal can show
-- and track source-department documents without duplicating files.
ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS source_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS is_legally_relevant BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lg_document_link_source
  ON public.lg_document_link (source_module, source_entity_type, source_entity_id);

CREATE INDEX IF NOT EXISTS idx_lg_document_link_case_source
  ON public.lg_document_link (lg_case_id, document_source);

COMMENT ON COLUMN public.lg_document_link.source_module IS
  'Originating module when document_source = SOURCE_MODULE (COMPLIANCE/BENEFITS/CLAIMS/EMPLOYER_SERVICES/INSURED_PERSON_SERVICES/MEETINGS).';
COMMENT ON COLUMN public.lg_document_link.source_entity_type IS
  'Source-side entity type (e.g. CE_CASE, CE_AUDIT, BN_CLAIM, EMPLOYER, INSURED_PERSON, PAYMENT_ARRANGEMENT).';
COMMENT ON COLUMN public.lg_document_link.source_entity_id IS
  'Source-side entity identifier (UUID or business code, stored as text).';
COMMENT ON COLUMN public.lg_document_link.is_legally_relevant IS
  'Marked by Legal users while reviewing intake / linking source documents.';
