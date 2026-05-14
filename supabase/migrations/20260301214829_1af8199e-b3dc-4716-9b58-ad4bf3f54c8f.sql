
-- 1. Update get_c3_records_filtered to default to DFT+PEN when no status is specified
CREATE OR REPLACE FUNCTION public.get_c3_records_filtered(
  p_payer_type text DEFAULT NULL,
  p_payer_id text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_entered_by text DEFAULT NULL,
  p_verified_by text DEFAULT NULL,
  p_period_month integer DEFAULT NULL,
  p_period_year integer DEFAULT NULL,
  p_date_received text DEFAULT NULL,
  p_date_entered text DEFAULT NULL,
  p_schedule_no integer DEFAULT NULL,
  p_exclude_deleted boolean DEFAULT true,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_result json;
  v_total bigint;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  SELECT count(*) INTO v_total
  FROM cn_c3_reported c
  WHERE
    (p_payer_type IS NULL OR c.payer_type = p_payer_type)
    AND (p_payer_id IS NULL OR c.payer_id ILIKE '%' || p_payer_id || '%')
    AND (
      -- When a specific status is provided, filter by it
      (p_status IS NOT NULL AND c.posting_status = p_status)
      OR
      -- When no status specified, default to DFT + PEN only
      (p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))
    )
    AND (p_entered_by IS NULL OR c.entered_by = p_entered_by)
    AND (p_verified_by IS NULL OR c.verified_by = p_verified_by)
    AND (p_period_month IS NULL OR EXTRACT(MONTH FROM c.period) = p_period_month)
    AND (p_period_year IS NULL OR EXTRACT(YEAR FROM c.period) = p_period_year)
    AND (p_date_received IS NULL OR c.date_received::date = p_date_received::date)
    AND (p_date_entered IS NULL OR c.date_entered::date = p_date_entered::date)
    AND (p_schedule_no IS NULL OR c.sequence_no = p_schedule_no)
    AND (
      p_exclude_deleted = false
      OR (c.posting_status IS DISTINCT FROM 'DEL' AND c.posting_status IS DISTINCT FROM 'D')
    );

  SELECT json_build_object(
    'data', COALESCE((
      SELECT json_agg(row_to_json(r))
      FROM (
        SELECT c.*
        FROM cn_c3_reported c
        WHERE
          (p_payer_type IS NULL OR c.payer_type = p_payer_type)
          AND (p_payer_id IS NULL OR c.payer_id ILIKE '%' || p_payer_id || '%')
          AND (
            (p_status IS NOT NULL AND c.posting_status = p_status)
            OR
            (p_status IS NULL AND c.posting_status IN ('DFT', 'PEN'))
          )
          AND (p_entered_by IS NULL OR c.entered_by = p_entered_by)
          AND (p_verified_by IS NULL OR c.verified_by = p_verified_by)
          AND (p_period_month IS NULL OR EXTRACT(MONTH FROM c.period) = p_period_month)
          AND (p_period_year IS NULL OR EXTRACT(YEAR FROM c.period) = p_period_year)
          AND (p_date_received IS NULL OR c.date_received::date = p_date_received::date)
          AND (p_date_entered IS NULL OR c.date_entered::date = p_date_entered::date)
          AND (p_schedule_no IS NULL OR c.sequence_no = p_schedule_no)
          AND (
            p_exclude_deleted = false
            OR (c.posting_status IS DISTINCT FROM 'DEL' AND c.posting_status IS DISTINCT FROM 'D')
          )
        ORDER BY c.period DESC, c.date_entered DESC
        LIMIT p_page_size OFFSET v_offset
      ) r
    ), '[]'::json),
    'total', v_total
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2. Update verify_c3_record to enforce is_verified check + duplicate SSN check
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

    -- Validation 1: All ip_wages rows must have is_verified = true
    IF v_record.payer_type = 'ER' THEN
        SELECT COUNT(*) INTO v_unverified_wages
        FROM ip_wages
        WHERE c3_id = p_c3_id AND (is_verified IS NULL OR is_verified = false);
        
        IF v_unverified_wages > 0 THEN
            RAISE EXCEPTION 'Cannot verify C3 record. % employee wage row(s) are not yet verified. Please verify all wage rows first.', v_unverified_wages;
        END IF;
    END IF;

    -- Validation 2: No duplicate SSNs within this C3
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
        'message', 'C3 record verified successfully'
    );
END;
$function$;

-- 3. Add unique constraint on cn_c3_reported for payer_id, payer_type, sequence_no, period (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cn_c3_reported_payer_period_unique'
  ) THEN
    ALTER TABLE public.cn_c3_reported 
    ADD CONSTRAINT cn_c3_reported_payer_period_unique 
    UNIQUE (payer_id, payer_type, sequence_no, period);
  END IF;
END $$;

-- 4. Add session_timeout_minutes to system_settings if not exists
INSERT INTO public.system_settings (setting_key, setting_value, setting_type, display_name, description, category, is_editable, created_by)
SELECT 'session_timeout_minutes', '480', 'number', 'Session Timeout (Minutes)', 'Maximum session duration in minutes before auto-logout. Range: 15 to 480 (8 hours).', 'Security', true, 'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE setting_key = 'session_timeout_minutes');
