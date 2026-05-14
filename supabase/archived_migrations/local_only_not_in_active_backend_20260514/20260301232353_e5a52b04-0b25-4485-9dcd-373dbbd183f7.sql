
-- Trigger to prevent editing C3 records when posting_status is not DFT or PEN
-- This enforces backend-level protection against unauthorized edits
-- Note: Workflow transitions (approve/reject) update posting_status itself, so we allow
-- updates that ONLY change posting_status (and audit fields) to pass through.

CREATE OR REPLACE FUNCTION public.enforce_c3_edit_restriction()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if old status is DFT or PEN (record is editable)
  IF OLD.posting_status IN ('DFT', 'PEN') THEN
    RETURN NEW;
  END IF;

  -- Allow workflow-driven status transitions (only posting_status and audit fields change)
  -- This permits approve/reject/query actions that change posting_status from VAC/REJ etc.
  IF NEW.posting_status IS DISTINCT FROM OLD.posting_status THEN
    RETURN NEW;
  END IF;

  -- Allow soft-delete (status change to DEL)
  IF NEW.posting_status = 'DEL' THEN
    RETURN NEW;
  END IF;

  -- Block all other updates when posting_status is not DFT or PEN
  RAISE EXCEPTION 'C3 cannot be edited when posting_status is %', OLD.posting_status;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_enforce_c3_edit_restriction ON public.cn_c3_reported;

CREATE TRIGGER trg_enforce_c3_edit_restriction
  BEFORE UPDATE ON public.cn_c3_reported
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_c3_edit_restriction();
