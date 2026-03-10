DO $$
DECLARE
  v_func_body TEXT;
BEGIN
  SELECT prosrc INTO v_func_body
  FROM pg_proc 
  WHERE proname = 'calculate_c3_contributions'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  v_func_body := REPLACE(v_func_body, 
    E'FROM public.c3_bonus_policy_default\n    WHERE is_active = true\n    ORDER BY created_at DESC',
    E'FROM public.c3_bonus_policy_default\n    WHERE is_active = true\n    ORDER BY created_on DESC');

  v_func_body := REPLACE(v_func_body, 'c3_holiday_pay_policy_defaults', 'c3_holiday_pay_policy_default');
  
  v_func_body := REPLACE(v_func_body,
    E'FROM public.c3_holiday_pay_policy_default\n        WHERE is_active = true\n        ORDER BY created_at DESC',
    E'FROM public.c3_holiday_pay_policy_default\n        WHERE is_active = true\n        ORDER BY created_on DESC');

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

DROP FUNCTION IF EXISTS public.get_pending_holiday_pay(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_pending_holiday_pay(
  p_ssn TEXT,
  p_target_year INTEGER,
  p_target_month INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_records JSONB;
  v_target_period_start DATE;
  v_target_period_end DATE;
BEGIN
  v_target_period_start := make_date(p_target_year, p_target_month, 1);
  v_target_period_end := (v_target_period_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'ssn', ssn,
    'amount', amount,
    'source_c3_period', COALESCE(source_c3_id::TEXT, ''),
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