
ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS marked_as_evidence boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_marked_by varchar(50),
  ADD COLUMN IF NOT EXISTS evidence_marked_at timestamptz,
  ADD COLUMN IF NOT EXISTS referral_id uuid,
  ADD COLUMN IF NOT EXISTS intake_id uuid,
  ADD COLUMN IF NOT EXISTS confidentiality_level varchar(20) NOT NULL DEFAULT 'INTERNAL';

CREATE INDEX IF NOT EXISTS idx_lg_doclink_evidence ON public.lg_document_link (lg_case_id) WHERE marked_as_evidence = true;
CREATE INDEX IF NOT EXISTS idx_lg_doclink_referral ON public.lg_document_link (referral_id);
CREATE INDEX IF NOT EXISTS idx_lg_doclink_intake ON public.lg_document_link (intake_id);
