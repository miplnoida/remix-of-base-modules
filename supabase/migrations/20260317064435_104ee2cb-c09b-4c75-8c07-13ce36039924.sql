
-- Fix DATE::INTEGER cast error in calculate_c3_contributions
-- The overlap calculation incorrectly casts DATE to INTEGER. 
-- Fix: subtract dates to get interval, then extract days.
-- Line: v_overlap_days[v_i] := GREATEST(0, LEAST(v_hol_end, v_week_end)::INTEGER - GREATEST(v_hol_start, v_week_start)::INTEGER + 1);
-- Should be: LEAST(v_hol_end, v_week_end) - GREATEST(v_hol_start, v_week_start) + 1

DO $$
DECLARE
  v_func_body TEXT;
BEGIN
  SELECT prosrc INTO v_func_body
  FROM pg_proc 
  WHERE proname = 'calculate_c3_contributions'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Replace the broken DATE::INTEGER cast with proper date subtraction
  v_func_body := REPLACE(
    v_func_body,
    'LEAST(v_hol_end, v_week_end)::INTEGER - GREATEST(v_hol_start, v_week_start)::INTEGER + 1',
    '(LEAST(v_hol_end, v_week_end) - GREATEST(v_hol_start, v_week_start))::INTEGER + 1'
  );
  
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
      p_period_year INTEGER,
      p_period_month INTEGER,
      p_received_date DATE,
      p_employee_data JSONB
    ) RETURNS JSONB LANGUAGE plpgsql AS $fn$%s$fn$',
    v_func_body
  );
END;
$$;
