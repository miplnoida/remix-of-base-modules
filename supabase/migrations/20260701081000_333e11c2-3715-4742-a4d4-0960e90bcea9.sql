
-- Add document_type_code column expected by frontend; keep legacy doc_type_code for any callers.
ALTER TABLE public.lg_stage_document_rule
  ADD COLUMN IF NOT EXISTS document_type_code text;

-- Backfill from legacy column if present
UPDATE public.lg_stage_document_rule
   SET document_type_code = doc_type_code
 WHERE document_type_code IS NULL AND doc_type_code IS NOT NULL;

-- Keep them in sync going forward via trigger (either column can be written)
CREATE OR REPLACE FUNCTION public.lg_stage_doc_rule_sync_type_codes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.document_type_code IS NULL AND NEW.doc_type_code IS NOT NULL THEN
    NEW.document_type_code := NEW.doc_type_code;
  ELSIF NEW.doc_type_code IS NULL AND NEW.document_type_code IS NOT NULL THEN
    NEW.doc_type_code := NEW.document_type_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lg_stage_doc_rule_sync ON public.lg_stage_document_rule;
CREATE TRIGGER trg_lg_stage_doc_rule_sync
  BEFORE INSERT OR UPDATE ON public.lg_stage_document_rule
  FOR EACH ROW EXECUTE FUNCTION public.lg_stage_doc_rule_sync_type_codes();

-- Notify PostgREST to refresh its schema cache immediately
NOTIFY pgrst, 'reload schema';
