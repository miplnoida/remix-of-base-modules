-- Drop the existing unique constraint that enforces global uniqueness
DROP INDEX IF EXISTS idx_ip_employer_unique_employment;

-- Update the trigger function to check only consecutive records
CREATE OR REPLACE FUNCTION public.process_c3_employer_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_wage_record RECORD;
  v_latest_employer RECORD;
  v_current_occupation VARCHAR(10);
  v_verifier_code VARCHAR(10);
BEGIN
  -- Only process when posting_status changes to 'VAC' and payer_type is 'ER'
  IF NEW.posting_status = 'VAC' AND NEW.payer_type = 'ER' AND 
     (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    
    -- Get the verifier's user code
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');
    
    -- Loop through all wage records for this C3
    FOR v_wage_record IN
      SELECT DISTINCT ssn
      FROM public.ip_wages
      WHERE payer_id = NEW.payer_id
        AND sequence_no = NEW.sequence_no
        AND period = NEW.period
        AND ssn IS NOT NULL
    LOOP
      -- Get current occupation from ip_master
      SELECT COALESCE(occupation, primary_occup) INTO v_current_occupation
      FROM public.ip_master
      WHERE ssn = v_wage_record.ssn
      LIMIT 1;
      
      -- Get the LATEST (most recent) employer record for this SSN
      SELECT * INTO v_latest_employer
      FROM public.ip_employer
      WHERE ssn = v_wage_record.ssn
      ORDER BY date_entered DESC, created_at DESC
      LIMIT 1;
      
      -- Only insert if:
      -- 1. No previous record exists, OR
      -- 2. The latest record has different employer_id or occupation
      IF v_latest_employer.id IS NULL OR
         v_latest_employer.employer_id IS DISTINCT FROM NEW.payer_id OR
         COALESCE(v_latest_employer.occupation, '') IS DISTINCT FROM COALESCE(v_current_occupation, '') THEN
        
        INSERT INTO public.ip_employer (
          ssn,
          employer_id,
          occupation,
          source,
          posting_status,
          entered_by,
          date_entered,
          term_start_date
        ) VALUES (
          v_wage_record.ssn,
          NEW.payer_id,
          v_current_occupation,
          'C3',
          'VAC',
          v_verifier_code,
          NOW() AT TIME ZONE 'UTC',
          NEW.period
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create a reusable function for checking consecutive duplicates (can be used by other workflows)
CREATE OR REPLACE FUNCTION public.insert_ip_employer_if_not_consecutive_duplicate(
  p_ssn VARCHAR,
  p_employer_id VARCHAR,
  p_occupation VARCHAR,
  p_source VARCHAR DEFAULT 'MANUAL',
  p_posting_status VARCHAR DEFAULT 'VAC',
  p_entered_by VARCHAR DEFAULT 'SYSTEM',
  p_term_start_date DATE DEFAULT NULL,
  p_term_end_date DATE DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_latest_employer RECORD;
  v_new_id UUID;
BEGIN
  -- Get the LATEST (most recent) employer record for this SSN
  SELECT * INTO v_latest_employer
  FROM public.ip_employer
  WHERE ssn = p_ssn
  ORDER BY date_entered DESC, created_at DESC
  LIMIT 1;
  
  -- Check if this would be a consecutive duplicate
  IF v_latest_employer.id IS NOT NULL AND
     v_latest_employer.employer_id = p_employer_id AND
     COALESCE(v_latest_employer.occupation, '') = COALESCE(p_occupation, '') THEN
    -- Consecutive duplicate - do not insert
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'consecutive_duplicate',
      'message', 'Record not inserted: same employer and occupation as the most recent record',
      'existing_record_id', v_latest_employer.id
    );
  END IF;
  
  -- Not a consecutive duplicate - insert the new record
  INSERT INTO public.ip_employer (
    ssn,
    employer_id,
    occupation,
    source,
    posting_status,
    entered_by,
    date_entered,
    term_start_date,
    term_end_date
  ) VALUES (
    p_ssn,
    p_employer_id,
    p_occupation,
    p_source,
    p_posting_status,
    p_entered_by,
    NOW() AT TIME ZONE 'UTC',
    p_term_start_date,
    p_term_end_date
  )
  RETURNING id INTO v_new_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reason', 'inserted',
    'message', 'New employment record created',
    'new_record_id', v_new_id
  );
END;
$function$;