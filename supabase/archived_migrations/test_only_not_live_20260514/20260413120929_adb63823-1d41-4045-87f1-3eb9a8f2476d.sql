-- 1. Fix the trigger variable size in process_c3_employer_verification
CREATE OR REPLACE FUNCTION process_c3_employer_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wage_row RECORD;
  v_verifier_code VARCHAR(50);
  v_current_occupation VARCHAR(50);
BEGIN
  -- Only process when posting_status changes to 'VAC'
  IF NEW.posting_status = 'VAC' AND (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');

    -- Update all related ip_wages rows
    FOR v_wage_row IN
      SELECT iw.id, iw.ssn
      FROM ip_wages iw
      WHERE iw.c3_id = NEW.id
    LOOP
      -- Get current occupation from ip_employer
      SELECT occupation INTO v_current_occupation
      FROM ip_employer
      WHERE ssn = v_wage_row.ssn
        AND status = 'C'
      ORDER BY start_date DESC
      LIMIT 1;

      -- Update the wage record
      UPDATE ip_wages
      SET posting_status = 'VAC',
          verified_by = v_verifier_code,
          date_verified = NOW(),
          occupation = COALESCE(v_current_occupation, occupation)
      WHERE id = v_wage_row.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Reset the broken workflow instance for employer 658852 Sep 2026
UPDATE workflow_instances
SET status = 'InProgress', completed_at = NULL
WHERE id = '08240b18-078f-419d-8f35-3747b8abd953';

UPDATE workflow_tasks
SET status = 'Pending', action_taken = NULL, comments = NULL
WHERE instance_id = '08240b18-078f-419d-8f35-3747b8abd953';