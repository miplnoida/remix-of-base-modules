DO $$
DECLARE
  v_func_body TEXT;
  v_old_text TEXT;
  v_new_text TEXT;
BEGIN
  SELECT prosrc INTO v_func_body
  FROM pg_proc 
  WHERE proname = 'calculate_c3_contributions'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Fix: When age-exempt for SS, still calculate EIB
  -- Old: zeroes everything including EIB
  v_old_text := E'IF v_is_age_exempt_ss THEN\n      v_ss_wage_base := 0; v_ss_insurable := 0;\n      v_employee_ss := 0; v_employer_ss := 0; v_employer_eib := 0; v_employer_ss_total := 0;';
  
  v_new_text := E'IF v_is_age_exempt_ss THEN\n      v_ss_wage_base := 0; v_ss_insurable := 0;\n      v_employee_ss := 0; v_employer_ss := 0;\n      -- EIB is still calculated for age-exempt employees per business rules\n      v_employer_eib_base := v_taxable_wages;\n      IF v_bonus_eligible AND v_bp_contrib_eir THEN\n        v_employer_eib_base := v_employer_eib_base + v_bonus;\n      END IF;\n      IF v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_eib THEN\n        v_employer_eib_base := v_employer_eib_base + v_holiday;\n      END IF;\n      v_employer_eib := ROUND(LEAST(v_employer_eib_base, v_config.employer_eib_max_wage) * v_config.employer_eib_rate, 2);\n      v_employer_ss_total := v_employer_eib;';

  v_func_body := REPLACE(v_func_body, v_old_text, v_new_text);

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