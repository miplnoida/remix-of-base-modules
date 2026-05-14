-- 1. Add missing audit columns to ip_vol_contrib_wages
ALTER TABLE public.ip_vol_contrib_wages 
  ADD COLUMN IF NOT EXISTS entered_by VARCHAR(10),
  ADD COLUMN IF NOT EXISTS date_entered TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS modified_by VARCHAR(10),
  ADD COLUMN IF NOT EXISTS date_modified TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Fix the process_c3_voluntary_verification trigger function
CREATE OR REPLACE FUNCTION public.process_c3_voluntary_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_verifier_code VARCHAR(10);
BEGIN
  -- Only process when posting_status changes to 'VAC' and payer_type is 'VC'
  IF NEW.posting_status = 'VAC' AND NEW.payer_type = 'VC' AND 
     (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    
    -- Get the verifier's user code
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');
    
    -- Insert into ip_vol_contrib_wages
    INSERT INTO public.ip_vol_contrib_wages (
      ssn,
      payment_sequence_no,
      period,
      contrib_amt,
      entered_by,
      date_entered,
      created_at,
      updated_at
    ) VALUES (
      NEW.payer_id,
      NEW.sequence_no,
      NEW.period,
      NEW.emp_ss_amt_calc,
      v_verifier_code,
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC'
    )
    ON CONFLICT (ssn, payment_sequence_no, period) 
    DO UPDATE SET
      contrib_amt = EXCLUDED.contrib_amt,
      modified_by = v_verifier_code,
      date_modified = NOW() AT TIME ZONE 'UTC',
      updated_at = NOW() AT TIME ZONE 'UTC';
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Update verify_c3_record to enforce verification-before-approval for ALL C3 types
CREATE OR REPLACE FUNCTION public.verify_c3_record(p_c3_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_record RECORD;
    v_user_name TEXT;
    v_unverified_wages INT;
    v_total_wages INT;
    v_duplicate_ssn_count INT;
BEGIN
    -- Get user name if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM profiles WHERE id = p_user_id;
    END IF;

    -- Lock the record
    SELECT * INTO v_record
    FROM cn_c3_reported
    WHERE id = p_c3_id
    FOR UPDATE;
    
    IF v_record IS NULL THEN
        RAISE EXCEPTION 'C3 record not found';
    END IF;
    
    -- Check for Pending status (PEN or legacy P)
    IF v_record.posting_status NOT IN ('PEN', 'P') THEN
        RAISE EXCEPTION 'Only pending records can be verified. Current status: %', v_record.posting_status;
    END IF;
    
    -- Check if user is same as entered_by
    IF v_record.entered_by = v_user_name THEN
        RAISE EXCEPTION 'The user who entered the record cannot verify it. A different user must verify the C3 record.';
    END IF;

    -- Validation for EMPLOYER C3: All ip_wages rows must have is_verified = true
    IF v_record.payer_type = 'ER' THEN
        SELECT COUNT(*) INTO v_unverified_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id AND (is_verified IS NULL OR is_verified = false);
        
        IF v_unverified_wages > 0 THEN
            RAISE EXCEPTION 'Cannot approve C3 record. % employee wage row(s) are not yet verified. Please verify all employee detail lines first.', v_unverified_wages;
        END IF;
        
        -- Ensure there is at least one wage record
        SELECT COUNT(*) INTO v_total_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id;
        
        IF v_total_wages = 0 THEN
            RAISE EXCEPTION 'Cannot approve C3 record. No employee detail lines found. At least one employee must be added before approval.';
        END IF;
    END IF;

    -- Validation for SELF-EMPLOYED C3: The ip_wages row must be verified
    IF v_record.payer_type = 'SE' THEN
        SELECT COUNT(*) INTO v_unverified_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id AND (is_verified IS NULL OR is_verified = false);
        
        IF v_unverified_wages > 0 THEN
            RAISE EXCEPTION 'Cannot approve Self-Employed C3. The wage record is not yet verified. Please verify the C3 details first.';
        END IF;
        
        SELECT COUNT(*) INTO v_total_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id;
        
        IF v_total_wages = 0 THEN
            RAISE EXCEPTION 'Cannot approve Self-Employed C3. No wage record found.';
        END IF;
    END IF;

    -- Validation for VOLUNTARY CONTRIBUTOR C3: The ip_wages row must be verified
    IF v_record.payer_type = 'VC' THEN
        SELECT COUNT(*) INTO v_unverified_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id AND (is_verified IS NULL OR is_verified = false);
        
        IF v_unverified_wages > 0 THEN
            RAISE EXCEPTION 'Cannot approve Voluntary Contributor C3. The wage record is not yet verified. Please verify the C3 details first.';
        END IF;
        
        SELECT COUNT(*) INTO v_total_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id;
        
        IF v_total_wages = 0 THEN
            RAISE EXCEPTION 'Cannot approve Voluntary Contributor C3. No wage record found.';
        END IF;
    END IF;

    -- Validation: No duplicate SSNs within this C3
    SELECT COUNT(*) INTO v_duplicate_ssn_count
    FROM (
        SELECT ssn FROM ip_wages WHERE c3_id = p_c3_id GROUP BY ssn HAVING COUNT(*) > 1
    ) dups;
    
    IF v_duplicate_ssn_count > 0 THEN
        RAISE EXCEPTION 'Cannot verify C3 record. Duplicate SSN entries found in wage records. Each SSN must appear only once per C3.';
    END IF;
    
    -- Update C3 record status to Verified/Approved (VAC)
    UPDATE cn_c3_reported
    SET posting_status = 'VAC',
        date_verified = NOW(),
        verified_by = v_user_name,
        modified_date = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE id = p_c3_id;

    -- Update all associated wage records status
    UPDATE ip_wages
    SET posting_status = 'VAC',
        date_verified = NOW(),
        verified_by = v_user_name,
        date_modified = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE c3_id = p_c3_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'c3_id', p_c3_id,
        'old_status', v_record.posting_status,
        'new_status', 'VAC',
        'message', 'C3 record verified and approved successfully'
    );
END;
$function$;