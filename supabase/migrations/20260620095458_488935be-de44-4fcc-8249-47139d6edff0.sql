
-- 1) bn_workflow_template: channel + executable flag
ALTER TABLE public.bn_workflow_template
  ADD COLUMN IF NOT EXISTS channel_code text,
  ADD COLUMN IF NOT EXISTS is_executable boolean GENERATED ALWAYS AS (workflow_definition_id IS NOT NULL) STORED;

CREATE INDEX IF NOT EXISTS idx_bn_workflow_template_channel_active
  ON public.bn_workflow_template (channel_code, is_active);

COMMENT ON COLUMN public.bn_workflow_template.channel_code IS
  'Application channel from bn_reference_value group BN_APPLICATION_CHANNEL (ONLINE_PORTAL, OFFICE_ASSISTED, BACK_OFFICE, PAPER, API)';
COMMENT ON COLUMN public.bn_workflow_template.is_executable IS
  'True when a workflow_definition_id is linked. Templates without a definition are configuration-only.';

-- 2) bn_product_version_workflow: per-channel mapping
CREATE TABLE IF NOT EXISTS public.bn_product_version_workflow (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_version_id    uuid NOT NULL REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  channel_code          text NOT NULL,
  workflow_template_id  uuid NOT NULL REFERENCES public.bn_workflow_template(id) ON DELETE RESTRICT,
  is_default            boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  effective_from        date,
  effective_to          date,
  created_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_version_workflow TO authenticated;
GRANT ALL ON public.bn_product_version_workflow TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_pvw_version_channel_eff
  ON public.bn_product_version_workflow (product_version_id, channel_code, COALESCE(effective_from, DATE '1900-01-01'));

-- only one default per product version (active rows)
CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_pvw_one_default_per_version
  ON public.bn_product_version_workflow (product_version_id)
  WHERE is_default = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_bn_pvw_lookup
  ON public.bn_product_version_workflow (product_version_id, channel_code, is_active);

-- updated_at trigger (reuse existing helper)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bn_pvw_updated_at'
  ) THEN
    CREATE TRIGGER trg_bn_pvw_updated_at
      BEFORE UPDATE ON public.bn_product_version_workflow
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.bn_product_version_workflow IS
  'Per-channel workflow mapping for a benefit product version. Resolution: channel match -> default -> bn_product_version.workflow_template_id fallback.';
