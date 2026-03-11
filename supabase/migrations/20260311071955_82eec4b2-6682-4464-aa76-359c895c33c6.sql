
-- First restore the original function from the last known good version,
-- then patch ONLY the filing deadline calculation.

DO $$
DECLARE
  v_func_body TEXT;
  v_old_block TEXT;
  v_new_block TEXT;
BEGIN
  -- Get current function source
  SELECT prosrc INTO v_func_body
  FROM pg_proc 
  WHERE proname = 'calculate_c3_contributions'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  -- Define the old (buggy) filing deadline block to find
  v_old_block := 'IF v_filing_window_unit = 1 THEN
    v_filing_deadline := (v_due_date + (v_filing_window_value || '' months'')::INTERVAL)::DATE;
  ELSE
    v_filing_deadline := v_due_date + v_filing_window_value;
  END IF;';

  -- Define the new (fixed) filing deadline block
  -- Compute filing deadline directly from the period, NOT from v_due_date
  -- For Feb 2025 (p_period_month=1) with filing_window=1 month:
  --   target month (1-indexed) = 1 + 1 + 1 = 3 (March)
  --   filing deadline = last day of March = March 31, 2025
  v_new_block := 'IF v_filing_window_unit = 1 THEN
    -- FIXED: Compute filing deadline directly from period to avoid double-counting.
    -- p_period_month is 0-indexed. Target 1-indexed month = p_period_month + v_filing_window_value + 1
    DECLARE
      v_fl_target_month INTEGER;
      v_fl_target_year INTEGER;
    BEGIN
      v_fl_target_month := p_period_month + v_filing_window_value + 1;
      v_fl_target_year := p_period_year;
      WHILE v_fl_target_month > 12 LOOP
        v_fl_target_month := v_fl_target_month - 12;
        v_fl_target_year := v_fl_target_year + 1;
      END LOOP;
      v_filing_deadline := (make_date(v_fl_target_year, v_fl_target_month, 1) + INTERVAL ''1 month'' - INTERVAL ''1 day'')::DATE;
    END;
  ELSE
    v_filing_deadline := (make_date(p_period_year, p_period_month + 1, 1) + INTERVAL ''1 month'' - INTERVAL ''1 day'')::DATE + v_filing_window_value;
  END IF;';

  -- Check if the old block exists
  IF v_func_body LIKE '%v_filing_deadline := (v_due_date + (v_filing_window_value%' THEN
    v_func_body := replace(v_func_body, v_old_block, v_new_block);
    
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
        p_period_year INTEGER,
        p_period_month INTEGER,
        p_received_date DATE,
        p_employee_data JSONB
      ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$%s$fn$',
      v_func_body
    );
    
    RAISE NOTICE 'Filing deadline calculation patched successfully';
  ELSE
    RAISE NOTICE 'Old filing deadline pattern not found - function may already be patched or have different structure';
  END IF;
END;
$$;
