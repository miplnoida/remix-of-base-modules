
-- Phase 1: SSB Master Logo schema extensions

-- Extend comm_media_asset with parent/derived/usage model
ALTER TABLE public.comm_media_asset
  ADD COLUMN IF NOT EXISTS asset_type TEXT NOT NULL DEFAULT 'STANDALONE'
    CHECK (asset_type IN ('MASTER_LOGO','DERIVED','STANDALONE')),
  ADD COLUMN IF NOT EXISTS parent_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS derived_from_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS usage_slot TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replaced_by_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_comm_media_asset_usage_slot ON public.comm_media_asset(usage_slot);
CREATE INDEX IF NOT EXISTS idx_comm_media_asset_parent ON public.comm_media_asset(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_comm_media_asset_asset_type ON public.comm_media_asset(asset_type);

-- Single active default per usage_slot
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_media_asset_active_default_slot
  ON public.comm_media_asset(usage_slot)
  WHERE is_default = true AND is_active = true AND usage_slot IS NOT NULL;

-- Organization branding defaults
ALTER TABLE public.core_organization
  ADD COLUMN IF NOT EXISTS default_logo_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_small_logo_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_favicon_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_letterhead_logo_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_email_header_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_watermark_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_qr_logo_asset_id UUID REFERENCES public.comm_media_asset(id) ON DELETE SET NULL;
