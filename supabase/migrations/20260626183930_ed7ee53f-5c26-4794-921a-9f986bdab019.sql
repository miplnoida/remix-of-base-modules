
-- Asset category enum
DO $$ BEGIN
  CREATE TYPE public.comm_asset_category AS ENUM (
    'logo','logo_small','favicon','letterhead_header','letterhead_footer',
    'signature','stamp','seal','qr_code','watermark','certificate_background',
    'email_header','email_footer','login_logo','login_background','dashboard_banner',
    'announcement_banner','maintenance_banner','app_icon','app_splash','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.comm_asset_source AS ENUM ('upload','external_url');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.comm_asset_scope AS ENUM ('global','organization','department','location');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.comm_media_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.comm_asset_category NOT NULL,
  source public.comm_asset_source NOT NULL DEFAULT 'upload',
  scope public.comm_asset_scope NOT NULL DEFAULT 'global',
  storage_path TEXT,
  external_url TEXT,
  preview_url TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  width_px INTEGER,
  height_px INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  organization_id UUID,
  department_id UUID,
  location_id UUID,
  usage_location TEXT,
  expiry_date DATE,
  remarks TEXT,
  uploaded_by TEXT,
  link_last_checked_at TIMESTAMPTZ,
  link_last_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (source = 'upload' AND storage_path IS NOT NULL) OR
    (source = 'external_url' AND external_url IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_media_asset TO authenticated, anon;
GRANT ALL ON public.comm_media_asset TO service_role;

CREATE INDEX IF NOT EXISTS ix_comm_media_asset_category ON public.comm_media_asset(category);
CREATE INDEX IF NOT EXISTS ix_comm_media_asset_scope ON public.comm_media_asset(scope, organization_id, department_id, location_id);
CREATE INDEX IF NOT EXISTS ix_comm_media_asset_active ON public.comm_media_asset(is_active);

CREATE TABLE IF NOT EXISTS public.comm_media_asset_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.comm_media_asset(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  source public.comm_asset_source NOT NULL,
  storage_path TEXT,
  external_url TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  changed_by TEXT,
  change_reason TEXT,
  snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_media_asset_version TO authenticated, anon;
GRANT ALL ON public.comm_media_asset_version TO service_role;

CREATE INDEX IF NOT EXISTS ix_comm_media_asset_version_asset ON public.comm_media_asset_version(asset_id, version DESC);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_comm_media_asset_updated_at ON public.comm_media_asset;
CREATE TRIGGER trg_comm_media_asset_updated_at
  BEFORE UPDATE ON public.comm_media_asset
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-version trigger: when storage_path/external_url/source/version changes, record a snapshot
CREATE OR REPLACE FUNCTION public.tg_comm_media_asset_versioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.comm_media_asset_version
      (asset_id, version, source, storage_path, external_url, mime_type, file_size_bytes, changed_by, change_reason, snapshot)
    VALUES
      (NEW.id, NEW.version, NEW.source, NEW.storage_path, NEW.external_url, NEW.mime_type, NEW.file_size_bytes,
       NEW.uploaded_by, 'initial', to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF (TG_OP = 'UPDATE') AND (
    NEW.storage_path IS DISTINCT FROM OLD.storage_path OR
    NEW.external_url IS DISTINCT FROM OLD.external_url OR
    NEW.source       IS DISTINCT FROM OLD.source
  ) THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
    INSERT INTO public.comm_media_asset_version
      (asset_id, version, source, storage_path, external_url, mime_type, file_size_bytes, changed_by, change_reason, snapshot)
    VALUES
      (NEW.id, NEW.version, NEW.source, NEW.storage_path, NEW.external_url, NEW.mime_type, NEW.file_size_bytes,
       NEW.uploaded_by, 'asset replaced', to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comm_media_asset_versioning ON public.comm_media_asset;
CREATE TRIGGER trg_comm_media_asset_versioning
  BEFORE INSERT OR UPDATE ON public.comm_media_asset
  FOR EACH ROW EXECUTE FUNCTION public.tg_comm_media_asset_versioning();

-- Storage policies for comm-assets bucket (no RLS on objects per project rule; rely on app-layer auth)
-- The bucket is private; reads use createSignedUrl from the app layer.
