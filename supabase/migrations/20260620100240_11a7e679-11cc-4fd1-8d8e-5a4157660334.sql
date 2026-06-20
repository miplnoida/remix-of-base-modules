
-- 1) Rename tables (FKs, indexes, sequences follow automatically)
ALTER TABLE IF EXISTS public.bn_reference_group RENAME TO core_reference_group;
ALTER TABLE IF EXISTS public.bn_reference_value RENAME TO core_reference_value;

-- 2) Spec parity column on values: value_description (kept in sync with description)
ALTER TABLE public.core_reference_value
  ADD COLUMN IF NOT EXISTS value_description text;

UPDATE public.core_reference_value
   SET value_description = description
 WHERE value_description IS NULL AND description IS NOT NULL;

-- Keep them in sync going forward
CREATE OR REPLACE FUNCTION public.core_reference_value_sync_description()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.value_description IS DISTINCT FROM OLD.value_description
     AND NEW.value_description IS NOT NULL
     AND (NEW.description IS NULL OR NEW.description = OLD.description) THEN
    NEW.description := NEW.value_description;
  ELSIF NEW.description IS DISTINCT FROM OLD.description
     AND NEW.description IS NOT NULL
     AND (NEW.value_description IS NULL OR NEW.value_description = OLD.value_description) THEN
    NEW.value_description := NEW.description;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_core_reference_value_sync_desc ON public.core_reference_value;
CREATE TRIGGER trg_core_reference_value_sync_desc
  BEFORE UPDATE OR INSERT ON public.core_reference_value
  FOR EACH ROW EXECUTE FUNCTION public.core_reference_value_sync_description();

-- 3) GRANTs on renamed tables (rename keeps prior grants, but be explicit)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_group TO authenticated;
GRANT ALL ON public.core_reference_group TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_value TO authenticated;
GRANT ALL ON public.core_reference_value TO service_role;

-- 4) Backward-compatibility views (transitional)
CREATE OR REPLACE VIEW public.bn_reference_group
  WITH (security_invoker = true)
  AS SELECT * FROM public.core_reference_group;

CREATE OR REPLACE VIEW public.bn_reference_value
  WITH (security_invoker = true)
  AS SELECT * FROM public.core_reference_value;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_reference_group TO authenticated;
GRANT ALL ON public.bn_reference_group TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_reference_value TO authenticated;
GRANT ALL ON public.bn_reference_value TO service_role;

COMMENT ON TABLE public.core_reference_group IS
  'Central reference / lookup groups shared across Benefits, Legal, Compliance, Country Pack, Payments, Documents. Module ownership is set via module_code/module_name.';
COMMENT ON TABLE public.core_reference_value IS
  'Central reference / lookup values. Joined to core_reference_group via group_id.';
COMMENT ON VIEW public.bn_reference_group IS
  'DEPRECATED transitional view — read/write goes to core_reference_group. New code must use core_reference_group.';
COMMENT ON VIEW public.bn_reference_value IS
  'DEPRECATED transitional view — read/write goes to core_reference_value. New code must use core_reference_value.';
