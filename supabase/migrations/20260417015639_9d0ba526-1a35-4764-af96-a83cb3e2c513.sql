-- Auto-generate inspection_number on insert if not provided
CREATE OR REPLACE FUNCTION public.ce_inspections_set_inspection_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inspection_number IS NULL OR NEW.inspection_number = '' THEN
    NEW.inspection_number := 'INS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_inspections_set_number ON public.ce_inspections;
CREATE TRIGGER trg_ce_inspections_set_number
BEFORE INSERT ON public.ce_inspections
FOR EACH ROW
EXECUTE FUNCTION public.ce_inspections_set_inspection_number();