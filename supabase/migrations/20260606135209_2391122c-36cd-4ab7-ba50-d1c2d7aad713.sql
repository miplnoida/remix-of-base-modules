CREATE TABLE IF NOT EXISTS public.bn_product_participant_task_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  participant_kind VARCHAR(20) NOT NULL CHECK (participant_kind IN ('CLAIMANT','EMPLOYER','DOCTOR','OTHER')),
  task_code VARCHAR(50) NOT NULL,
  task_title TEXT NOT NULL,
  task_description TEXT,
  screen_template_code VARCHAR(50),
  due_offset_days INTEGER NOT NULL DEFAULT 7,
  blocks_workflow BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  configured_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_version_id, task_code)
);

CREATE INDEX IF NOT EXISTS idx_bn_pptc_version ON public.bn_product_participant_task_config(product_version_id);
CREATE INDEX IF NOT EXISTS idx_bn_pptc_kind ON public.bn_product_participant_task_config(participant_kind, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_participant_task_config TO authenticated;
GRANT SELECT ON public.bn_product_participant_task_config TO anon;
GRANT ALL ON public.bn_product_participant_task_config TO service_role;

-- RLS stays disabled per project memory (role-based security only)
ALTER TABLE public.bn_product_participant_task_config DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_bn_pptc_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_pptc_touch ON public.bn_product_participant_task_config;
CREATE TRIGGER trg_bn_pptc_touch
  BEFORE UPDATE ON public.bn_product_participant_task_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_bn_pptc_updated_at();