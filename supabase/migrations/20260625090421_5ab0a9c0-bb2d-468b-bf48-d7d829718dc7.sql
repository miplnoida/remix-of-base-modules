
ALTER TABLE public.lg_contract_review
  ADD COLUMN IF NOT EXISTS has_financial_value boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS value_type text;

UPDATE public.lg_contract_review SET has_financial_value = true WHERE contract_value IS NOT NULL AND has_financial_value = false;
UPDATE public.lg_contract_review SET value_type = 'FIXED_AMOUNT' WHERE has_financial_value = true AND value_type IS NULL;

ALTER TABLE public.lg_contract_review_document
  ADD COLUMN IF NOT EXISTS document_role text,
  ADD COLUMN IF NOT EXISTS ai_analysis_allowed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text;

UPDATE public.lg_contract_review_document
  SET document_role = CASE document_kind
    WHEN 'CONTRACT_DRAFT' THEN 'ORIGINAL_DRAFT'
    WHEN 'SUPPORTING' THEN 'SUPPORTING_DOCUMENT'
    WHEN 'COUNTERPARTY' THEN 'COUNTERPARTY_VERSION'
    WHEN 'REVIEWED' THEN 'LEGAL_REVIEWED_VERSION'
    WHEN 'SIGNED' THEN 'SIGNED_VERSION'
    ELSE 'SUPPORTING_DOCUMENT' END
  WHERE document_role IS NULL;

ALTER TABLE public.lg_contract_ai_analysis
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.lg_contract_review_document(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by_legal_user_code text,
  ADD COLUMN IF NOT EXISTS accepted_by_legal boolean;
