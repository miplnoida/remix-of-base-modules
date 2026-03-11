
-- Add backward-compatible 'monthsLate' key to the calculate_c3_contributions output
-- The wrapper RPC reads v_totals->>'monthsLate' so we need this key present.
-- This is a minimal fix: just re-create the function with 'monthsLate' added to the summary output.

DO $$
DECLARE
  v_func_body TEXT;
BEGIN
  -- Get current function source
  SELECT prosrc INTO v_func_body
  FROM pg_proc 
  WHERE proname = 'calculate_c3_contributions'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Replace the summary output to add monthsLate key after monthsLateCalendar
  v_func_body := replace(
    v_func_body,
    '''monthsLateCalendar'', v_months_late_calendar,',
    '''monthsLate'', v_months_late_calendar, ''monthsLateCalendar'', v_months_late_calendar,'
  );
  
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
      p_period_year INTEGER,
      p_period_month INTEGER,
      p_received_date DATE,
      p_employee_data JSONB
    ) RETURNS JSONB LANGUAGE plpgsql STABLE AS $fn$%s$fn$',
    v_func_body
  );
END;
$$;
