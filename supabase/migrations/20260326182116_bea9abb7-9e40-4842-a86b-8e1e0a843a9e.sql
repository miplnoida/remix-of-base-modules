
-- 1. Create analyze_filing_config_change RPC
CREATE OR REPLACE FUNCTION public.analyze_filing_config_change(
  p_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_week_start_day INTEGER DEFAULT 1,
  p_filing_window_unit INTEGER DEFAULT 1,
  p_filing_window_value INTEGER DEFAULT 1,
  p_penalty_initial_threshold INTEGER DEFAULT 1,
  p_penalty_subsequent_threshold INTEGER DEFAULT 12
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_of_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_last_prev_month DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_existing RECORD;
  v_overlap_count INTEGER;
  v_open_ended_count INTEGER;
  v_effective_date_from DATE;
  v_effective_date_to DATE;
BEGIN
  IF p_date_from IS NULL THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Date From is required.');
  END IF;

  IF p_date_to IS NOT NULL AND p_date_to < p_date_from THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Date To must be on or after Date From.');
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM c3_filing_config_periods WHERE id = p_id AND is_active = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('action', 'error', 'message', 'Configuration period not found or is inactive.');
    END IF;
  END IF;

  -- EDIT existing record whose date_from is before 1st of current month => split
  IF p_id IS NOT NULL AND v_existing.date_from < v_first_of_month THEN
    v_effective_date_from := v_first_of_month;
    v_effective_date_to := p_date_to;

    SELECT COUNT(*) INTO v_overlap_count
    FROM c3_filing_config_periods
    WHERE is_active = true
      AND id != p_id
      AND date_from <= COALESCE(v_effective_date_to, '9999-12-31'::DATE)
      AND COALESCE(date_to, '9999-12-31'::DATE) >= v_effective_date_from;

    IF v_overlap_count > 0 THEN
      RETURN jsonb_build_object('action', 'error', 'message', 
        'The new configuration period (starting from ' || v_effective_date_from::TEXT || ') would overlap with an existing period.');
    END IF;

    IF v_effective_date_to IS NULL THEN
      SELECT COUNT(*) INTO v_open_ended_count
      FROM c3_filing_config_periods
      WHERE is_active = true AND id != p_id AND date_to IS NULL;

      IF v_open_ended_count > 0 THEN
        RETURN jsonb_build_object('action', 'error', 'message', 
          'Only one open-ended configuration period is allowed. Please set an end date.');
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'action', 'split',
      'old_record_id', p_id,
      'old_record_original_from', v_existing.date_from::TEXT,
      'old_record_original_to', COALESCE(v_existing.date_to::TEXT, 'Open-ended'),
      'old_record_new_end', v_last_prev_month::TEXT,
      'new_record_start', v_first_of_month::TEXT,
      'new_record_end', COALESCE(p_date_to::TEXT, 'Open-ended'),
      'original_values', jsonb_build_object(
        'week_start_day', v_existing.week_start_day,
        'filing_window_unit', v_existing.filing_window_unit,
        'filing_window_value', v_existing.filing_window_value,
        'penalty_initial_threshold', v_existing.penalty_initial_threshold,
        'penalty_subsequent_threshold', v_existing.penalty_subsequent_threshold
      ),
      'new_values', jsonb_build_object(
        'week_start_day', p_week_start_day,
        'filing_window_unit', p_filing_window_unit,
        'filing_window_value', p_filing_window_value,
        'penalty_initial_threshold', p_penalty_initial_threshold,
        'penalty_subsequent_threshold', p_penalty_subsequent_threshold
      )
    );
  END IF;

  -- CREATE new record with date_from before current month => blocked
  IF p_id IS NULL AND p_date_from < v_first_of_month THEN
    RETURN jsonb_build_object('action', 'error', 'message', 
      'Cannot create a new configuration period starting before ' || v_first_of_month::TEXT || '. Historical periods are protected.');
  END IF;

  -- Normal: validate overlap and open-ended
  SELECT COUNT(*) INTO v_overlap_count
  FROM c3_filing_config_periods
  WHERE is_active = true
    AND (p_id IS NULL OR id != p_id)
    AND date_from <= COALESCE(p_date_to, '9999-12-31'::DATE)
    AND COALESCE(date_to, '9999-12-31'::DATE) >= p_date_from;

  IF v_overlap_count > 0 THEN
    RETURN jsonb_build_object('action', 'error', 'message', 
      'This period overlaps with an existing configuration period. Please adjust the date range.');
  END IF;

  IF p_date_to IS NULL THEN
    SELECT COUNT(*) INTO v_open_ended_count
    FROM c3_filing_config_periods
    WHERE is_active = true
      AND (p_id IS NULL OR id != p_id)
      AND date_to IS NULL;

    IF v_open_ended_count > 0 THEN
      RETURN jsonb_build_object('action', 'error', 'message', 
        'Only one open-ended configuration period is allowed. Please set an end date or close the existing open-ended period first.');
    END IF;
  END IF;

  RETURN jsonb_build_object('action', 'normal');
END;
$$;

-- 2. Replace upsert_filing_config_period with split support
CREATE OR REPLACE FUNCTION public.upsert_filing_config_period(
  p_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_week_start_day INTEGER DEFAULT 1,
  p_filing_window_unit INTEGER DEFAULT 1,
  p_filing_window_value INTEGER DEFAULT 1,
  p_penalty_initial_threshold INTEGER DEFAULT 1,
  p_penalty_subsequent_threshold INTEGER DEFAULT 12,
  p_is_active BOOLEAN DEFAULT true,
  p_user_code TEXT DEFAULT NULL,
  p_force_split BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_of_month DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_last_prev_month DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_existing RECORD;
  v_new_id UUID;
  v_user_id UUID;
BEGIN
  IF p_user_code IS NOT NULL AND p_user_code != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE raw_user_meta_data->>'user_code' = p_user_code LIMIT 1;
  END IF;

  -- SPLIT MODE
  IF p_force_split = true AND p_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM c3_filing_config_periods WHERE id = p_id AND is_active = true;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Configuration period not found or is inactive.');
    END IF;

    IF v_existing.date_from >= v_first_of_month THEN
      RETURN jsonb_build_object('success', false, 'error', 'This record does not require a split operation.');
    END IF;

    -- Close old record at end of previous month
    UPDATE c3_filing_config_periods
    SET date_to = v_last_prev_month,
        updated_by = v_user_id,
        updated_at = NOW()
    WHERE id = p_id;

    -- Insert new record from 1st of current month
    INSERT INTO c3_filing_config_periods (
      date_from, date_to, week_start_day, filing_window_unit, filing_window_value,
      penalty_initial_threshold, penalty_subsequent_threshold, is_active,
      created_by, updated_by
    ) VALUES (
      v_first_of_month, p_date_to, p_week_start_day, p_filing_window_unit, p_filing_window_value,
      p_penalty_initial_threshold, p_penalty_subsequent_threshold, true,
      v_user_id, v_user_id
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id, 'split', true, 'old_record_closed_at', v_last_prev_month::TEXT);
  END IF;

  -- NORMAL MODE
  IF p_id IS NOT NULL THEN
    UPDATE c3_filing_config_periods
    SET date_from = p_date_from,
        date_to = p_date_to,
        week_start_day = p_week_start_day,
        filing_window_unit = p_filing_window_unit,
        filing_window_value = p_filing_window_value,
        penalty_initial_threshold = p_penalty_initial_threshold,
        penalty_subsequent_threshold = p_penalty_subsequent_threshold,
        is_active = p_is_active,
        updated_by = v_user_id,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id);
  ELSE
    INSERT INTO c3_filing_config_periods (
      date_from, date_to, week_start_day, filing_window_unit, filing_window_value,
      penalty_initial_threshold, penalty_subsequent_threshold, is_active,
      created_by, updated_by
    ) VALUES (
      p_date_from, p_date_to, p_week_start_day, p_filing_window_unit, p_filing_window_value,
      p_penalty_initial_threshold, p_penalty_subsequent_threshold, p_is_active,
      v_user_id, v_user_id
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
  END IF;
END;
$$;
