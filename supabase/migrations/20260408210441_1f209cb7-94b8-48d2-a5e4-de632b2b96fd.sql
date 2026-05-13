-- Add governance columns to ia_audit_plan_templates
DO $$
BEGIN
  -- is_house_default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ia_audit_plan_templates' AND column_name = 'is_house_default'
  ) THEN
    ALTER TABLE public.ia_audit_plan_templates ADD COLUMN is_house_default boolean NOT NULL DEFAULT false;
  END IF;

  -- status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ia_audit_plan_templates' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.ia_audit_plan_templates ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;

  -- version
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ia_audit_plan_templates' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.ia_audit_plan_templates ADD COLUMN version integer NOT NULL DEFAULT 1;
  END IF;

  -- cloned_from_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ia_audit_plan_templates' AND column_name = 'cloned_from_id'
  ) THEN
    ALTER TABLE public.ia_audit_plan_templates ADD COLUMN cloned_from_id uuid;
  END IF;

  -- cloned_from_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ia_audit_plan_templates' AND column_name = 'cloned_from_name'
  ) THEN
    ALTER TABLE public.ia_audit_plan_templates ADD COLUMN cloned_from_name text;
  END IF;
END $$;

-- Add check constraint for status values
ALTER TABLE public.ia_audit_plan_templates
  DROP CONSTRAINT IF EXISTS chk_template_status;

-- Use a trigger instead of CHECK for status validation
CREATE OR REPLACE FUNCTION public.validate_template_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid template status: %. Must be draft, published, or archived.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_template_status ON public.ia_audit_plan_templates;
CREATE TRIGGER trg_validate_template_status
  BEFORE INSERT OR UPDATE ON public.ia_audit_plan_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_template_status();

-- Update existing system templates to published + set house default
UPDATE public.ia_audit_plan_templates
SET status = 'published', version = 1
WHERE is_system = true AND status = 'draft';

UPDATE public.ia_audit_plan_templates
SET is_house_default = true
WHERE template_key = 'audit_blue_minimal' AND is_system = true
  AND NOT EXISTS (SELECT 1 FROM public.ia_audit_plan_templates WHERE is_house_default = true);