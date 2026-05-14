
-- Fix 1: Correct table name typo in calculate_c3_contributions
-- Change 'c3_bonus_policy_defaults' (plural) to 'c3_bonus_policy_default' (singular)
-- We need to replace just the faulty line in the function definition

-- We'll use a simple approach: replace the function body text
DO $$
DECLARE
  v_func_body TEXT;
BEGIN
  -- Get current function source
  SELECT prosrc INTO v_func_body
  FROM pg_proc 
  WHERE proname = 'calculate_c3_contributions'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Fix the typo
  v_func_body := REPLACE(v_func_body, 'c3_bonus_policy_defaults', 'c3_bonus_policy_default');
  
  -- Recreate the function with fixed body
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
      p_period_year INTEGER,
      p_period_month INTEGER,
      p_received_date DATE,
      p_employee_data JSONB
    ) RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$%s$func$',
    v_func_body
  );
END;
$$;

-- Fix 2: Fix get_pending_holiday_pay to use correct column names
-- Table c3_pending_holiday_pay has: source_c3_id (not source_c3_period), target_period (not target_year/target_month)
DROP FUNCTION IF EXISTS public.get_pending_holiday_pay(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_pending_holiday_pay(
  p_ssn TEXT,
  p_target_year INTEGER,
  p_target_month INTEGER  -- 1-indexed
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_records JSONB;
  v_target_period_start DATE;
  v_target_period_end DATE;
BEGIN
  -- Construct target period date range from year/month
  v_target_period_start := make_date(p_target_year, p_target_month, 1);
  v_target_period_end := (v_target_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'ssn', ssn,
    'amount', amount,
    'source_c3_period', COALESCE(source_c3_id, ''),
    'holiday_date_from', holiday_date_from,
    'holiday_date_to', holiday_date_to,
    'status', status
  )), '[]'::JSONB) INTO v_records
  FROM public.c3_pending_holiday_pay
  WHERE ssn = p_ssn
    AND target_period::DATE >= v_target_period_start
    AND target_period::DATE <= v_target_period_end
    AND status = 'pending';

  RETURN v_records;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_holiday_pay(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_holiday_pay(TEXT, INTEGER, INTEGER) TO anon;
