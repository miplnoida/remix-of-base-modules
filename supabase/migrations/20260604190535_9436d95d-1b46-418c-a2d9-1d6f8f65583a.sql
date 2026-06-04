
-- 1. New table: bn_product_channel_config
CREATE TABLE IF NOT EXISTS public.bn_product_channel_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.bn_product(id) ON DELETE CASCADE,
  product_version_id uuid NOT NULL REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  channel_code varchar(20) NOT NULL CHECK (channel_code IN ('ONLINE','OFFLINE')),
  is_enabled boolean NOT NULL DEFAULT true,
  screen_template_id uuid NULL REFERENCES public.bn_screen_template(id),
  workflow_template_id uuid NULL REFERENCES public.bn_workflow_template(id),
  workflow_definition_id uuid NULL,
  document_profile_id uuid NULL REFERENCES public.bn_document_profile(id),
  default_source varchar(30),
  allow_save_draft boolean NOT NULL DEFAULT true,
  allow_upload_later boolean NOT NULL DEFAULT false,
  requires_identity_verification boolean NOT NULL DEFAULT false,
  requires_email_or_phone_otp boolean NOT NULL DEFAULT false,
  requires_staff_review_before_acceptance boolean NOT NULL DEFAULT false,
  blocks_submission_if_documents_missing boolean NOT NULL DEFAULT false,
  blocks_submission_if_precheck_fails boolean NOT NULL DEFAULT true,
  confirmation_template_id uuid NULL,
  correction_allowed boolean NOT NULL DEFAULT true,
  correction_deadline_days integer NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bn_product_channel_config_unique UNIQUE (product_version_id, channel_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_channel_config TO authenticated;
GRANT ALL ON public.bn_product_channel_config TO service_role;
-- RLS intentionally NOT enabled per project policy (role-based security only).

CREATE INDEX IF NOT EXISTS idx_bn_pcc_version ON public.bn_product_channel_config(product_version_id);
CREATE INDEX IF NOT EXISTS idx_bn_pcc_product ON public.bn_product_channel_config(product_id);

-- 2. Extend bn_doc_requirement
ALTER TABLE public.bn_doc_requirement
  ADD COLUMN IF NOT EXISTS channel_code varchar(20) NOT NULL DEFAULT 'BOTH',
  ADD COLUMN IF NOT EXISTS public_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS internal_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blocks_submission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocks_decision boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blocks_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condition_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. Extend bn_claim
ALTER TABLE public.bn_claim
  ADD COLUMN IF NOT EXISTS channel_code varchar(20),
  ADD COLUMN IF NOT EXISTS submitted_via varchar(30),
  ADD COLUMN IF NOT EXISTS screen_template_id uuid NULL,
  ADD COLUMN IF NOT EXISTS workflow_definition_id uuid NULL,
  ADD COLUMN IF NOT EXISTS channel_config_id uuid NULL REFERENCES public.bn_product_channel_config(id);
