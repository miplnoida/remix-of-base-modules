
-- ============================================================
-- analyze_c3_config_change: Centralized overlap/split analysis
-- ============================================================
CREATE OR REPLACE FUNCTION public.analyze_c3_config_change(
  p_table_name TEXT,
  p_id TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_scope_filter JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_tables TEXT[] := ARRAY[
    'c3_config_periods', 'c3_bonus_policy_default',
    'c3_holiday_pay_policy_default', 'c3_income_code_policy_default',
    'tb_levy_slabs'
  ];
  v_date_from DATE;
  v_date_to DATE;
  v_first_of_month DATE;
  v_last_prev_month DATE;
  v_existing RECORD;
  v_date_from_col TEXT;
  v_date_to_col TEXT;
  v_overlap_query TEXT;
  v_scope_clause TEXT := '';
BEGIN
  -- Validate table name
  IF NOT (p_table_name = ANY(v_allowed_tables)) THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Invalid table: ' || p_table_name);
  END IF;

  -- Parse dates (all params are TEXT per RPC standards)
  v_date_from := CASE WHEN p_date_from IS NOT NULL AND p_date_from != '' THEN p_date_from::DATE ELSE NULL END;
  v_date_to := CASE WHEN p_date_to IS NOT NULL AND p_date_to != '' THEN p_date_to::DATE ELSE NULL END;

  IF v_date_from IS NULL THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Date From is required.');
  END IF;

  IF v_date_to IS NOT NULL AND v_date_to < v_date_from THEN
    RETURN jsonb_build_object('action', 'error', 'message', 'Date To cannot be earlier than Date From.');
  END IF;

  -- Determine column names based on table
  IF p_table_name = 'c3_config_periods' THEN
    v_date_from_col := 'start_date';
    v_date_to_col := 'end_date';
  ELSE
    v_date_from_col := CASE 
      WHEN p_table_name = 'tb_levy_slabs' THEN 'start_date'
      ELSE 'date_from'
    END;
    v_date_to_col := CASE 
      WHEN p_table_name = 'tb_levy_slabs' THEN 'end_date'
      ELSE 'date_to'
    END;
  END IF;

  -- Build scope filter clause (e.g. policy_type, income_code_id)
  IF p_scope_filter IS NOT NULL THEN
    DECLARE
      k TEXT;
      v TEXT;
    BEGIN
      FOR k, v IN SELECT * FROM jsonb_each_text(p_scope_filter)
      LOOP
        v_scope_clause := v_scope_clause || format(' AND %I = %L', k, v);
      END LOOP;
    END;
  END IF;

  -- Check for overlapping records
  v_overlap_query := format(
    'SELECT id::TEXT, %I::TEXT AS date_from_val, COALESCE(%I::TEXT, ''open-ended'') AS date_to_val '
    'FROM %I '
    'WHERE ($1 IS NULL OR id != $1::UUID) '
    'AND %I <= COALESCE($3, ''9999-12-31''::DATE) '
    'AND COALESCE(%I, ''9999-12-31''::DATE) >= $2 '
    '%s '
    'LIMIT 1',
    v_date_from_col, v_date_to_col,
    p_table_name,
    v_date_from_col,
    v_date_to_col,
    v_scope_clause
  );

  EXECUTE v_overlap_query INTO v_existing USING p_id, v_date_from, v_date_to;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'message', format(
        'The selected period overlaps with an existing configuration (%s – %s). Please adjust the date range.',
        v_existing.date_from_val, v_existing.date_to_val
      )
    );
  END IF;

  -- Date boundary check for split logic
  v_first_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  v_last_prev_month := v_first_of_month - INTERVAL '1 day';

  -- For edits: check if the existing record starts before current month
  IF p_id IS NOT NULL THEN
    DECLARE
      v_old_from DATE;
      v_old_to_text TEXT;
    BEGIN
      EXECUTE format(
        'SELECT %I::DATE, COALESCE(%I::TEXT, ''open-ended'') FROM %I WHERE id = $1::UUID',
        v_date_from_col, v_date_to_col, p_table_name
      ) INTO v_old_from, v_old_to_text USING p_id;

      IF v_old_from IS NOT NULL AND v_old_from < v_first_of_month THEN
        RETURN jsonb_build_object(
          'action', 'split',
          'message', format(
            'This configuration started before the current month. The existing record will be truncated to end on %s, and a new record will be created starting %s with your updated values.',
            to_char(v_last_prev_month, 'DD Mon YYYY'),
            to_char(v_first_of_month, 'DD Mon YYYY')
          ),
          'old_record_id', p_id,
          'old_record_original_from', to_char(v_old_from, 'YYYY-MM-DD'),
          'old_record_original_to', v_old_to_text,
          'old_record_new_end', to_char(v_last_prev_month, 'YYYY-MM-DD'),
          'new_record_start', to_char(v_first_of_month, 'YYYY-MM-DD'),
          'new_record_end', COALESCE(p_date_to, v_old_to_text)
        );
      END IF;
    END;
  END IF;

  -- For new records: cannot create before 1st of current month
  IF p_id IS NULL AND v_date_from < v_first_of_month THEN
    RETURN jsonb_build_object(
      'action', 'error',
      'message', format(
        'Cannot create a configuration starting before %s. The earliest allowed start date is %s.',
        to_char(v_first_of_month, 'DD Mon YYYY'),
        to_char(v_first_of_month, 'DD Mon YYYY')
      )
    );
  END IF;

  RETURN jsonb_build_object('action', 'normal', 'message', 'No conflicts detected.');
END;
$$;

-- ============================================================
-- upsert_c3_config_with_split: Generic upsert with split support
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_c3_config_with_split(
  p_table_name TEXT,
  p_id TEXT DEFAULT NULL,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_values_json JSONB DEFAULT '{}'::JSONB,
  p_user_code TEXT DEFAULT NULL,
  p_force_split BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_tables TEXT[] := ARRAY[
    'c3_config_periods', 'c3_bonus_policy_default',
    'c3_holiday_pay_policy_default', 'c3_income_code_policy_default',
    'tb_levy_slabs'
  ];
  v_date_from DATE;
  v_date_to DATE;
  v_first_of_month DATE;
  v_last_prev_month DATE;
  v_date_from_col TEXT;
  v_date_to_col TEXT;
  v_new_id UUID;
  v_old_from DATE;
  v_old_to DATE;
  v_set_clause TEXT := '';
  v_cols TEXT := '';
  v_vals TEXT := '';
  k TEXT;
  v TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF NOT (p_table_name = ANY(v_allowed_tables)) THEN
    RETURN jsonb_build_object('error', 'Invalid table: ' || p_table_name);
  END IF;

  v_date_from := CASE WHEN p_date_from IS NOT NULL AND p_date_from != '' THEN p_date_from::DATE ELSE NULL END;
  v_date_to := CASE WHEN p_date_to IS NOT NULL AND p_date_to != '' THEN p_date_to::DATE ELSE NULL END;
  v_first_of_month := date_trunc('month', CURRENT_DATE)::DATE;
  v_last_prev_month := v_first_of_month - INTERVAL '1 day';

  -- Column name mapping
  IF p_table_name IN ('c3_config_periods', 'tb_levy_slabs') THEN
    v_date_from_col := 'start_date';
    v_date_to_col := 'end_date';
  ELSE
    v_date_from_col := 'date_from';
    v_date_to_col := 'date_to';
  END IF;

  -- SPLIT MODE
  IF p_force_split AND p_id IS NOT NULL THEN
    -- Get old record dates
    EXECUTE format('SELECT %I::DATE, %I FROM %I WHERE id = $1::UUID', v_date_from_col, v_date_to_col, p_table_name)
      INTO v_old_from, v_old_to USING p_id;

    -- Truncate old record
    EXECUTE format(
      'UPDATE %I SET %I = $1, modified_by = $2, modified_on = $3 WHERE id = $4::UUID',
      p_table_name, v_date_to_col
    ) USING v_last_prev_month, p_user_code, v_now, p_id;

    -- Log truncation to audit trail
    INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_name, after_value, payload_json, timestamp, severity)
    VALUES (
      'update', p_table_name, p_id, 'C3 Configuration',
      COALESCE(p_user_code, 'SYSTEM'),
      jsonb_build_object('truncated_end_date', to_char(v_last_prev_month, 'YYYY-MM-DD')),
      jsonb_build_object('operation', 'split_truncate', 'original_from', to_char(v_old_from, 'YYYY-MM-DD'), 'original_to', COALESCE(to_char(v_old_to, 'YYYY-MM-DD'), 'open-ended')),
      v_now, 'info'
    );

    -- Build INSERT for new record with values from JSON
    v_new_id := gen_random_uuid();
    v_cols := 'id, ' || v_date_from_col || ', ' || v_date_to_col || ', created_by, modified_by, created_on, modified_on';
    v_vals := format('%L::UUID, %L::DATE, %L, %L, %L, %L::TIMESTAMPTZ, %L::TIMESTAMPTZ',
      v_new_id, v_first_of_month,
      CASE WHEN v_date_to IS NOT NULL THEN v_date_to::TEXT ELSE NULL END,
      p_user_code, p_user_code, v_now, v_now
    );

    -- Add extra columns from values JSON
    FOR k, v IN SELECT * FROM jsonb_each_text(p_values_json)
    LOOP
      v_cols := v_cols || ', ' || quote_ident(k);
      v_vals := v_vals || ', ' || quote_literal(v);
    END LOOP;

    EXECUTE format('INSERT INTO %I (%s) VALUES (%s)', p_table_name, v_cols, v_vals);

    -- Log new record to audit trail
    INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_name, after_value, payload_json, timestamp, severity)
    VALUES (
      'create', p_table_name, v_new_id::TEXT, 'C3 Configuration',
      COALESCE(p_user_code, 'SYSTEM'),
      p_values_json,
      jsonb_build_object('operation', 'split_create', 'split_from_record', p_id),
      v_now, 'info'
    );

    RETURN jsonb_build_object('success', true, 'split', true, 'new_id', v_new_id::TEXT, 'truncated_id', p_id);
  END IF;

  -- NORMAL UPDATE
  IF p_id IS NOT NULL THEN
    v_set_clause := format('%I = %L::DATE, %I = %L, modified_by = %L, modified_on = %L::TIMESTAMPTZ',
      v_date_from_col, v_date_from,
      v_date_to_col, v_date_to,
      p_user_code, v_now
    );

    FOR k, v IN SELECT * FROM jsonb_each_text(p_values_json)
    LOOP
      v_set_clause := v_set_clause || format(', %I = %L', k, v);
    END LOOP;

    EXECUTE format('UPDATE %I SET %s WHERE id = %L::UUID', p_table_name, v_set_clause, p_id);

    INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_name, after_value, timestamp, severity)
    VALUES ('update', p_table_name, p_id, 'C3 Configuration', COALESCE(p_user_code, 'SYSTEM'), p_values_json, v_now, 'info');

    RETURN jsonb_build_object('success', true, 'id', p_id);
  END IF;

  -- NORMAL INSERT
  v_new_id := gen_random_uuid();
  v_cols := 'id, ' || v_date_from_col || ', ' || v_date_to_col || ', created_by, modified_by, created_on, modified_on';
  v_vals := format('%L::UUID, %L::DATE, %L, %L, %L, %L::TIMESTAMPTZ, %L::TIMESTAMPTZ',
    v_new_id, v_date_from, v_date_to, p_user_code, p_user_code, v_now, v_now
  );

  FOR k, v IN SELECT * FROM jsonb_each_text(p_values_json)
  LOOP
    v_cols := v_cols || ', ' || quote_ident(k);
    v_vals := v_vals || ', ' || quote_literal(v);
  END LOOP;

  EXECUTE format('INSERT INTO %I (%s) VALUES (%s)', p_table_name, v_cols, v_vals);

  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_name, after_value, timestamp, severity)
  VALUES ('create', p_table_name, v_new_id::TEXT, 'C3 Configuration', COALESCE(p_user_code, 'SYSTEM'), p_values_json, v_now, 'info');

  RETURN jsonb_build_object('success', true, 'id', v_new_id::TEXT);
END;
$$;

-- ============================================================
-- create_c3_config_period: Create period + details atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_c3_config_period(
  p_start_date TEXT,
  p_end_date TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_details_json JSONB DEFAULT '{}'::JSONB,
  p_user_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_first_of_month DATE;
  v_period_id UUID;
  v_detail_id UUID;
  v_existing RECORD;
  v_now TIMESTAMPTZ := now();
  k TEXT;
  v TEXT;
  v_cols TEXT;
  v_vals TEXT;
BEGIN
  v_start := p_start_date::DATE;
  v_end := CASE WHEN p_end_date IS NOT NULL AND p_end_date != '' THEN p_end_date::DATE ELSE NULL END;
  v_first_of_month := date_trunc('month', CURRENT_DATE)::DATE;

  -- Validate dates
  IF v_end IS NOT NULL AND v_end < v_start THEN
    RETURN jsonb_build_object('error', 'End date cannot be before start date.');
  END IF;

  IF v_start < v_first_of_month THEN
    RETURN jsonb_build_object('error', format('Start date cannot be before %s.', to_char(v_first_of_month, 'DD Mon YYYY')));
  END IF;

  -- Check overlap
  SELECT id INTO v_existing FROM c3_config_periods
  WHERE start_date <= COALESCE(v_end, '9999-12-31'::DATE)
    AND COALESCE(end_date, '9999-12-31'::DATE) >= v_start
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'The date range overlaps with an existing configuration period.');
  END IF;

  -- Create period
  v_period_id := gen_random_uuid();
  INSERT INTO c3_config_periods (id, start_date, end_date, description, is_active, created_by, created_on, modified_by, modified_on)
  VALUES (v_period_id, v_start, v_end, p_description, TRUE, p_user_code, v_now, p_user_code, v_now);

  -- Create details
  v_detail_id := gen_random_uuid();
  v_cols := 'id, config_period_id, created_by, created_on, modified_by, modified_on';
  v_vals := format('%L::UUID, %L::UUID, %L, %L::TIMESTAMPTZ, %L, %L::TIMESTAMPTZ',
    v_detail_id, v_period_id, p_user_code, v_now, p_user_code, v_now
  );

  FOR k, v IN SELECT * FROM jsonb_each_text(p_details_json)
  LOOP
    v_cols := v_cols || ', ' || quote_ident(k);
    v_vals := v_vals || ', ' || quote_literal(v);
  END LOOP;

  EXECUTE format('INSERT INTO c3_config_details (%s) VALUES (%s)', v_cols, v_vals);

  -- Audit trail
  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_name, after_value, payload_json, timestamp, severity)
  VALUES (
    'create', 'c3_config_periods', v_period_id::TEXT, 'C3 Configuration',
    COALESCE(p_user_code, 'SYSTEM'),
    jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date, 'description', p_description),
    p_details_json,
    v_now, 'info'
  );

  RETURN jsonb_build_object('success', true, 'period_id', v_period_id::TEXT, 'detail_id', v_detail_id::TEXT);
END;
$$;
