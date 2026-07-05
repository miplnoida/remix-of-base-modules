
ALTER TABLE public.core_reference_group
  ADD COLUMN IF NOT EXISTS business_owner text,
  ADD COLUMN IF NOT EXISTS technical_owner text,
  ADD COLUMN IF NOT EXISTS steward text,
  ADD COLUMN IF NOT EXISTS scope_default text,
  ADD COLUMN IF NOT EXISTS version_strategy text,
  ADD COLUMN IF NOT EXISTS documentation_url text,
  ADD COLUMN IF NOT EXISTS governance_notes text;

ALTER TABLE public.core_reference_category
  ADD COLUMN IF NOT EXISTS is_platform_category boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'ACTIVE';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_category TO authenticated;
GRANT ALL ON public.core_reference_category TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_group TO authenticated;
GRANT ALL ON public.core_reference_group TO service_role;
