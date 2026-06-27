
-- Extend comm_media_asset with signature/stamp-specific metadata
ALTER TABLE public.comm_media_asset
  ADD COLUMN IF NOT EXISTS linked_user_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS linked_designation TEXT,
  ADD COLUMN IF NOT EXISTS transparent_background_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS usage_restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_document_confidentiality_allowed TEXT,
  ADD COLUMN IF NOT EXISTS reason_required_for_use BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_comm_media_asset_linked_user_code
  ON public.comm_media_asset(linked_user_code) WHERE linked_user_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_media_asset_category_status
  ON public.comm_media_asset(category, approval_status);

-- Signature / stamp usage audit log
CREATE TABLE IF NOT EXISTS public.core_document_signature_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_generation_id UUID,
  template_id UUID,
  template_version_no INTEGER,
  signature_asset_id UUID,
  stamp_asset_id UUID,
  seal_asset_id UUID,
  approval_stamp_asset_id UUID,
  generated_by_user_code VARCHAR(50),
  signature_user_code VARCHAR(50),
  approval_user_code VARCHAR(50),
  channel TEXT NOT NULL DEFAULT 'PDF',
  is_test_print BOOLEAN NOT NULL DEFAULT false,
  is_draft BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_document_signature_usage TO authenticated;
GRANT ALL ON public.core_document_signature_usage TO service_role;
CREATE INDEX IF NOT EXISTS idx_csu_doc_gen ON public.core_document_signature_usage(document_generation_id);
CREATE INDEX IF NOT EXISTS idx_csu_template ON public.core_document_signature_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_csu_sig_asset ON public.core_document_signature_usage(signature_asset_id);
CREATE INDEX IF NOT EXISTS idx_csu_stamp_asset ON public.core_document_signature_usage(stamp_asset_id);

-- Test print log
CREATE TABLE IF NOT EXISTS public.core_document_test_print_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID,
  template_version_no INTEGER,
  performed_by_user_code VARCHAR(50),
  mode TEXT NOT NULL DEFAULT 'PLACEHOLDER',
  signature_asset_id UUID,
  stamp_asset_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_document_test_print_log TO authenticated;
GRANT ALL ON public.core_document_test_print_log TO service_role;
CREATE INDEX IF NOT EXISTS idx_ctp_template ON public.core_document_test_print_log(template_id);
