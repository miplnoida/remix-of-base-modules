
-- Phase A: Root Cause Analysis fields on ia_findings
ALTER TABLE public.ia_findings ADD COLUMN IF NOT EXISTS root_cause_category TEXT;
ALTER TABLE public.ia_findings ADD COLUMN IF NOT EXISTS preventive_action TEXT;
ALTER TABLE public.ia_findings ADD COLUMN IF NOT EXISTS corrective_action_description TEXT;

-- Phase B: Historical risk adjustment DB function
CREATE OR REPLACE FUNCTION public.calculate_historical_risk_adjustment(p_function_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  adjustment NUMERIC := 0;
  high_count INTEGER := 0;
  medium_count INTEGER := 0;
  low_count INTEGER := 0;
BEGIN
  -- Count findings from closed audits linked to this function's department
  SELECT
    COALESCE(SUM(CASE WHEN f.risk_rating = 'High' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.risk_rating = 'Medium' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN f.risk_rating = 'Low' THEN 1 ELSE 0 END), 0)
  INTO high_count, medium_count, low_count
  FROM ia_findings f
  JOIN ia_department_audits da ON f.department_audit_id = da.id
  JOIN ia_department_functions df ON df.department_id = da.department_id
  WHERE df.id = p_function_id
    AND f.status = 'Closed';

  adjustment := (high_count * 5) + (medium_count * 3) + (low_count * 1);
  RETURN adjustment;
END;
$$;

-- Trigger function to update historical_risk_adjustment when findings close
CREATE OR REPLACE FUNCTION public.update_historical_risk_on_finding_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id UUID;
  v_func RECORD;
BEGIN
  -- Only act when status changes to 'Closed'
  IF NEW.status = 'Closed' AND (OLD.status IS NULL OR OLD.status <> 'Closed') THEN
    -- Get department_id from the finding
    v_dept_id := NEW.department_id;
    IF v_dept_id IS NULL AND NEW.department_audit_id IS NOT NULL THEN
      SELECT department_id INTO v_dept_id FROM ia_department_audits WHERE id = NEW.department_audit_id;
    END IF;
    
    IF v_dept_id IS NOT NULL THEN
      -- Update all functions in this department
      FOR v_func IN SELECT id FROM ia_department_functions WHERE department_id = v_dept_id
      LOOP
        UPDATE ia_department_functions
        SET historical_risk_adjustment = calculate_historical_risk_adjustment(v_func.id)
        WHERE id = v_func.id;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_risk_on_finding_close ON public.ia_findings;
CREATE TRIGGER trg_update_risk_on_finding_close
AFTER UPDATE ON public.ia_findings
FOR EACH ROW
EXECUTE FUNCTION public.update_historical_risk_on_finding_close();

-- Phase C: Config change requests table
CREATE TABLE IF NOT EXISTS public.ia_config_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_type TEXT NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);
