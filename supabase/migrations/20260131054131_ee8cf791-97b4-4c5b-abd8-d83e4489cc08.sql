-- Update submit_c3_record function to use new status codes (DFT -> PEN)
CREATE OR REPLACE FUNCTION public.submit_c3_record(p_c3_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_record RECORD;
    v_user_name TEXT;
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
    
    -- Check for Draft status (DFT or legacy Z)
    IF v_record.posting_status NOT IN ('DFT', 'Z') THEN
        RAISE EXCEPTION 'Only draft records can be submitted. Current status: %', v_record.posting_status;
    END IF;
    
    -- Update C3 record status to Pending (PEN)
    UPDATE cn_c3_reported
    SET posting_status = 'PEN',
        date_entered = COALESCE(date_entered, NOW()),
        entered_by = COALESCE(entered_by, v_user_name),
        modified_date = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE id = p_c3_id;
    
    -- Update all associated wage records
    UPDATE ip_wages
    SET posting_status = 'PEN',
        date_entered = COALESCE(date_entered, NOW()),
        entered_by = COALESCE(entered_by, v_user_name),
        date_modified = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE c3_id = p_c3_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'c3_id', p_c3_id,
        'old_status', v_record.posting_status,
        'new_status', 'PEN',
        'message', 'C3 record submitted successfully'
    );
END;
$function$;

-- Update verify_c3_record function to use new status codes (PEN -> VAC)
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
    
    -- Check all wage records are verified first (for employers)
    IF v_record.payer_type = 'ER' THEN
        SELECT COUNT(*) INTO v_unverified_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id AND posting_status NOT IN ('VAC', 'V');
        
        IF v_unverified_wages > 0 THEN
            RAISE EXCEPTION 'Cannot verify C3 record. Please verify all wage records first. % wage records are not verified.', v_unverified_wages;
        END IF;
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
    
    RETURN jsonb_build_object(
        'success', true,
        'c3_id', p_c3_id,
        'old_status', v_record.posting_status,
        'new_status', 'VAC',
        'message', 'C3 record verified successfully'
    );
END;
$function$;

-- Create new reject_c3_record function
CREATE OR REPLACE FUNCTION public.reject_c3_record(p_c3_id uuid, p_user_id uuid DEFAULT NULL::uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_record RECORD;
    v_user_name TEXT;
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
        RAISE EXCEPTION 'Only pending records can be rejected. Current status: %', v_record.posting_status;
    END IF;
    
    -- Check if user is same as entered_by
    IF v_record.entered_by = v_user_name THEN
        RAISE EXCEPTION 'The user who entered the record cannot reject it. A different user must reject the C3 record.';
    END IF;
    
    -- Update C3 record status to Rejected (REJ)
    UPDATE cn_c3_reported
    SET posting_status = 'REJ',
        modified_date = NOW(),
        modified_by = v_user_name,
        notes = CASE 
            WHEN p_reason IS NOT NULL THEN COALESCE(notes || E'\n', '') || 'Rejection reason: ' || p_reason
            ELSE notes
        END,
        updated_at = NOW()
    WHERE id = p_c3_id;
    
    -- Update all associated wage records to rejected
    UPDATE ip_wages
    SET posting_status = 'REJ',
        date_modified = NOW(),
        modified_by = v_user_name,
        updated_at = NOW()
    WHERE c3_id = p_c3_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'c3_id', p_c3_id,
        'old_status', v_record.posting_status,
        'new_status', 'REJ',
        'message', 'C3 record rejected successfully'
    );
END;
$function$;