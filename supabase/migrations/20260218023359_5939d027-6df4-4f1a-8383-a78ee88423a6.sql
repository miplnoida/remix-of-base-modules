
-- ============================================================
-- Fix: check_vc_residency_change trigger references
-- OLD.place_of_residence_code which was removed in the
-- column consolidation migration (20260216220510).
-- The canonical column is place_of_residence.
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_vc_residency_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_residence VARCHAR;
  v_new_residence VARCHAR;
  v_has_active_vc BOOLEAN;
BEGIN
  -- Use canonical column place_of_residence only
  -- (place_of_residence_code was removed in column consolidation)
  v_old_residence := OLD.place_of_residence;
  v_new_residence := NEW.place_of_residence;

  -- Only proceed if residence changed
  IF v_old_residence IS DISTINCT FROM v_new_residence THEN
    -- Check if the new residence is NOT STK or NEV
    IF v_new_residence NOT IN ('STK', 'NEV') THEN
      -- Check if person has active VC status
      SELECT EXISTS (
        SELECT 1 FROM public.ip_vol_contrib 
        WHERE ssn = NEW.ssn AND date_ceased IS NULL
      ) INTO v_has_active_vc;
      
      IF v_has_active_vc THEN
        -- Automatically cease voluntary contributor status
        PERFORM public.cease_voluntary_contributor(NEW.ssn, 'RESIDENCY_CHANGE');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger (it already exists, this ensures the updated function is used)
DROP TRIGGER IF EXISTS trigger_check_vc_residency ON public.ip_master;
CREATE TRIGGER trigger_check_vc_residency
  AFTER UPDATE ON public.ip_master
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vc_residency_change();
