
-- ============================================================
-- Phase 2 — Department Profile: own department comms defaults
-- ============================================================
ALTER TABLE public.core_department_profile
  ADD COLUMN IF NOT EXISTS default_logo_asset_id          uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_small_logo_asset_id    uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_header_asset_id        uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_footer_asset_id        uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_email_header_asset_id  uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_email_footer_asset_id  uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_watermark_asset_id     uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_seal_asset_id          uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_stamp_asset_id         uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_signature_asset_id     uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_qr_asset_id            uuid REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_office_location_id     uuid REFERENCES public.core_department_location(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS secondary_office_location_id   uuid REFERENCES public.core_department_location(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_mailing_location_id    uuid REFERENCES public.core_department_location(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS primary_physical_location_id   uuid REFERENCES public.core_department_location(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS office_hours                   text,
  ADD COLUMN IF NOT EXISTS contact_fax                    text,
  ADD COLUMN IF NOT EXISTS contact_website                text,
  ADD COLUMN IF NOT EXISTS confidentiality_text_block_code text,
  ADD COLUMN IF NOT EXISTS privacy_notice_text_block_code  text,
  ADD COLUMN IF NOT EXISTS appeal_rights_text_block_code   text,
  ADD COLUMN IF NOT EXISTS payment_instructions_text_block_code text,
  ADD COLUMN IF NOT EXISTS default_communication_profile_code  text;

-- ============================================================
-- Phase 3 — Document Profile: document behaviour fields
-- ============================================================
ALTER TABLE public.core_document_profile
  ADD COLUMN IF NOT EXISTS communication_profile_code text,
  ADD COLUMN IF NOT EXISTS print_rules    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS security_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retention_days integer,
  ADD COLUMN IF NOT EXISTS dms_folder     text,
  ADD COLUMN IF NOT EXISTS required_assets text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS signature_policy text NOT NULL DEFAULT 'OPTIONAL',
  ADD COLUMN IF NOT EXISTS seal_policy      text NOT NULL DEFAULT 'OPTIONAL',
  ADD COLUMN IF NOT EXISTS qr_policy        text NOT NULL DEFAULT 'OPTIONAL',
  ADD COLUMN IF NOT EXISTS watermark_policy text NOT NULL DEFAULT 'OPTIONAL',
  ADD COLUMN IF NOT EXISTS approval_policy_code text,
  ADD COLUMN IF NOT EXISTS output_channels text[] NOT NULL DEFAULT ARRAY['PDF']::text[];

DO $$ BEGIN
  ALTER TABLE public.core_document_profile
    ADD CONSTRAINT cdp_signature_policy_chk CHECK (signature_policy IN ('NONE','OPTIONAL','REQUIRED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.core_document_profile
    ADD CONSTRAINT cdp_seal_policy_chk CHECK (seal_policy IN ('NONE','OPTIONAL','REQUIRED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.core_document_profile
    ADD CONSTRAINT cdp_qr_policy_chk CHECK (qr_policy IN ('NONE','OPTIONAL','REQUIRED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.core_document_profile
    ADD CONSTRAINT cdp_watermark_policy_chk CHECK (watermark_policy IN ('NONE','OPTIONAL','REQUIRED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed default policies for known document kinds (only if currently empty defaults)
UPDATE public.core_document_profile SET
  required_assets = ARRAY['logo','qr','footer'],
  signature_policy = 'NONE', seal_policy = 'NONE',
  qr_policy = 'REQUIRED', watermark_policy = 'OPTIONAL'
WHERE document_kind = 'RECEIPT' AND required_assets = ARRAY[]::text[];

UPDATE public.core_document_profile SET
  required_assets = ARRAY['logo','seal','signature','qr','watermark'],
  signature_policy = 'REQUIRED', seal_policy = 'REQUIRED',
  qr_policy = 'REQUIRED', watermark_policy = 'REQUIRED'
WHERE document_kind = 'CERTIFICATE' AND required_assets = ARRAY[]::text[];

UPDATE public.core_document_profile SET
  required_assets = ARRAY['logo','header','footer','signature'],
  signature_policy = 'REQUIRED', seal_policy = 'OPTIONAL',
  qr_policy = 'NONE', watermark_policy = 'OPTIONAL'
WHERE document_kind = 'NOTICE' AND required_assets = ARRAY[]::text[];

UPDATE public.core_document_profile SET
  required_assets = ARRAY['logo','header','footer','watermark'],
  signature_policy = 'OPTIONAL', seal_policy = 'NONE',
  qr_policy = 'OPTIONAL', watermark_policy = 'REQUIRED'
WHERE document_kind = 'STATEMENT' AND required_assets = ARRAY[]::text[];

UPDATE public.core_document_profile SET
  required_assets = ARRAY['logo','header','footer','signature'],
  signature_policy = 'REQUIRED', seal_policy = 'OPTIONAL',
  qr_policy = 'OPTIONAL', watermark_policy = 'OPTIONAL'
WHERE document_kind = 'LETTER' AND required_assets = ARRAY[]::text[];
