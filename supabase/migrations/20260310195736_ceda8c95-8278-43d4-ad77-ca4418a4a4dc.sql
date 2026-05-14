CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_received_date DATE,
  p_employee_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_period_date DATE;
  v_due_date DATE;
  v_days_late INTEGER;
  v_additional_30_periods INTEGER;
  v_months_late INTEGER;
  v_months_late_calendar INTEGER;
  v_employee JSONB;
  v_employee_result JSONB;
  v_employees_result JSONB := '[]'::JSONB;
  v_totals JSONB;
  v_employee_age INTEGER;
  v_week1 NUMERIC; v_week2 NUMERIC; v_week3 NUMERIC; v_week4 NUMERIC; v_week5 NUMERIC;
  v_bonus NUMERIC; v_holiday NUMERIC;
  v_total_wages NUMERIC; v_taxable_wages NUMERIC;
  v_pay_period VARCHAR; v_pay_period_code VARCHAR;
  v_term_start_date DATE; v_date_of_birth DATE;
  v_is_december_start BOOLEAN;
  v_ss_wage_base NUMERIC; v_ss_insurable NUMERIC;
  v_employee_ss NUMERIC; v_employer_ss NUMERIC; v_employer_eib NUMERIC; v_employer_ss_total NUMERIC;
  v_employee_levy NUMERIC; v_bonus_levy NUMERIC;
  v_employer_levy NUMERIC; v_employer_severance NUMERIC;
  v_is_age_exempt_ss BOOLEAN; v_is_age_exempt_levy BOOLEAN;
  v_levy_slab RECORD;
  v_week_amount NUMERIC; v_week_levy NUMERIC;
  v_i INTEGER;
  v_amounts_array NUMERIC[];
  v_monthly_total_for_levy NUMERIC;
  v_use_monthly_override BOOLEAN;
  -- Bonus policy fields
  v_bonus_include_in_levy BOOLEAN;
  v_bonus_flat_rate_raw NUMERIC;
  v_bonus_flat_rate NUMERIC;
  v_bp_calculation_method VARCHAR;
  v_bp_calc_flat_enabled BOOLEAN;
  v_bp_calc_slab_enabled BOOLEAN;
  v_bp_distribution JSONB;
  v_bp_min_bonus NUMERIC;
  v_bp_max_bonus NUMERIC;
  v_bp_contrib_employee BOOLEAN;
  v_bp_contrib_employer BOOLEAN;
  v_bp_contrib_eir BOOLEAN;
  v_bp_contrib_severance BOOLEAN;
  v_bp_include_in_severance BOOLEAN;
  v_bonus_eligible BOOLEAN;
  v_merged_amounts NUMERIC[];
  v_merge_total NUMERIC;
  v_employer_ss_base NUMERIC;
  v_employer_eib_base NUMERIC;
  v_employer_levy_base NUMERIC;
  v_severance_base NUMERIC;
  v_employee_ss_base NUMERIC;
  v_merge_count INTEGER;
  v_per_week_bonus NUMERIC;
  v_bp_found BOOLEAN := false;
  -- Holiday pay policy fields
  v_hp_policy JSONB;
  v_hp_levy_include BOOLEAN;
  v_hp_levy_method VARCHAR;
  v_hp_levy_flat_enabled BOOLEAN;
  v_hp_levy_flat_pct NUMERIC;
  v_hp_levy_slab_enabled BOOLEAN;
  v_hp_levy_distribution JSONB;
  v_hp_ssc_include BOOLEAN;
  v_hp_ssc_employee BOOLEAN;
  v_hp_ssc_employer BOOLEAN;
  v_hp_ssc_eib BOOLEAN;
  v_hp_include_severance BOOLEAN;
  v_hp_min NUMERIC;
  v_hp_max NUMERIC;
  v_hp_eligible BOOLEAN;
  v_holiday_levy NUMERIC;
  v_holiday_has_dates BOOLEAN;
  v_hp_policy_type TEXT;
  -- Holiday distribution fields
  v_hol_start DATE;
  v_hol_end DATE;
  v_monday DATE;
  v_week_start DATE;
  v_week_end DATE;
  v_mondays DATE[];
  v_monday_count INTEGER;
  v_overlap_days INTEGER[];
  v_total_overlap INTEGER;
  v_hol_distributed NUMERIC[];
  v_holiday_distribution JSONB;
  v_hp_distribution_enabled BOOLEAN;
  -- Monthly holiday clipping fields
  v_month_start DATE;
  v_month_end DATE;
  v_total_holiday_days INTEGER;
  v_in_month_days INTEGER;
  v_original_holiday NUMERIC;
  -- Holiday target slot for levy merge
  v_hp_target_slot INTEGER;
  v_period1_amount NUMERIC;
  v_period2_amount NUMERIC;
  -- Totals
  v_sum_period_gross NUMERIC := 0; v_sum_taxable_wages NUMERIC := 0;
  v_sum_employee_ss NUMERIC := 0; v_sum_employer_ss NUMERIC := 0;
  v_sum_employee_levy NUMERIC := 0; v_sum_employer_levy NUMERIC := 0;
  v_sum_employer_severance NUMERIC := 0;
  -- Penalties
  v_levy_penalty NUMERIC := 0; v_severance_penalty NUMERIC := 0;
  v_ss_fine NUMERIC := 0; v_total_late_charges NUMERIC := 0;
  v_levy_penalty_base NUMERIC := 0; v_severance_penalty_base NUMERIC := 0; v_ss_fine_base NUMERIC := 0;
  v_due_year INTEGER; v_due_month INTEGER; v_received_year INTEGER; v_received_month INTEGER;
  v_slab_code VARCHAR;
  -- NEW: configurable filing/penalty variables
  v_week_start_day INTEGER;
  v_filing_window_unit INTEGER;  -- 1=Months, 2=Days
  v_filing_window_value INTEGER;
  v_penalty_initial_threshold INTEGER;
  v_penalty_subsequent_threshold INTEGER;
  v_filing_deadline DATE;
  v_delay_periods NUMERIC;
  v_initial_periods NUMERIC;
  v_subsequent_periods NUMERIC;
  v_target_dow INTEGER;
BEGIN
  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  
  SELECT * INTO v_config FROM public.get_c3_config_for_period(v_period_date);
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No active configuration found for period %', v_period_date;
  END IF;

  -- ===== Read configurable filing/penalty parameters from c3_calculation_config =====
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'week_start_day' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_week_start_day;
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'filing_window_unit' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_filing_window_unit;
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'filing_window_value' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_filing_window_value;
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'penalty_initial_threshold' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_penalty_initial_threshold;
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'penalty_subsequent_threshold' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_penalty_subsequent_threshold;

  -- ===== Compute week-start-days in the period month (configurable) =====
  v_target_dow := CASE WHEN v_week_start_day = 7 THEN 0 ELSE v_week_start_day END;
  
  v_mondays := ARRAY[]::DATE[];
  v_monday := v_period_date;
  WHILE EXTRACT(DOW FROM v_monday)::INTEGER != v_target_dow LOOP
    v_monday := v_monday + 1;
  END LOOP;
  WHILE EXTRACT(MONTH FROM v_monday) = (p_period_month + 1) LOOP
    v_mondays := v_mondays || v_monday;
    v_monday := v_monday + 7;
  END LOOP;
  v_monday_count := array_length(v_mondays, 1);
  IF v_monday_count IS NULL THEN v_monday_count := 0; END IF;

  -- ===== BONUS POLICY: exception first (by month/year match), then default =====
  SELECT include_in_levy, calc_flat_percentage, calculation_method,
         calc_flat_enabled, calc_slab_enabled, distribution::jsonb,
         min_bonus_amount, max_bonus_amount,
         COALESCE(contrib_employee, false), COALESCE(contrib_employer, false),
         COALESCE(contrib_eir, false), COALESCE(contrib_severance, false),
         COALESCE(include_in_severance, false)
  INTO v_bonus_include_in_levy, v_bonus_flat_rate_raw, v_bp_calculation_method,
       v_bp_calc_flat_enabled, v_bp_calc_slab_enabled, v_bp_distribution,
       v_bp_min_bonus, v_bp_max_bonus,
       v_bp_contrib_employee, v_bp_contrib_employer, v_bp_contrib_eir, v_bp_contrib_severance,
       v_bp_include_in_severance
  FROM public.c3_bonus_policy_exceptions
  WHERE is_active = true
    AND override_default = true
    AND exception_month = (p_period_month + 1)
    AND year_from <= p_period_year
    AND (year_to IS NULL OR year_to >= p_period_year)
  ORDER BY date_from DESC
  LIMIT 1;
  
  IF FOUND THEN v_bp_found := true; END IF;
  
  IF NOT v_bp_found THEN
    SELECT include_in_levy, calc_flat_percentage, calculation_method,
           calc_flat_enabled, calc_slab_enabled, distribution::jsonb,
           min_bonus_amount, max_bonus_amount,
           COALESCE(contrib_employee, false), COALESCE(contrib_employer, false),
           COALESCE(contrib_eir, false), COALESCE(contrib_severance, false),
           COALESCE(include_in_severance, false)
    INTO v_bonus_include_in_levy, v_bonus_flat_rate_raw, v_bp_calculation_method,
         v_bp_calc_flat_enabled, v_bp_calc_slab_enabled, v_bp_distribution,
         v_bp_min_bonus, v_bp_max_bonus,
         v_bp_contrib_employee, v_bp_contrib_employer, v_bp_contrib_eir, v_bp_contrib_severance,
         v_bp_include_in_severance
    FROM public.c3_bonus_policy_defaults
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  v_bonus_include_in_levy := COALESCE(v_bonus_include_in_levy, false);
  v_bonus_flat_rate := COALESCE(v_bonus_flat_rate_raw, 0) / 100.0;
  v_bp_calculation_method := COALESCE(v_bp_calculation_method, 'merge');
  v_bp_calc_flat_enabled := COALESCE(v_bp_calc_flat_enabled, false);
  v_bp_calc_slab_enabled := COALESCE(v_bp_calc_slab_enabled, false);
  v_bp_contrib_employee := COALESCE(v_bp_contrib_employee, false);
  v_bp_contrib_employer := COALESCE(v_bp_contrib_employer, false);
  v_bp_contrib_eir := COALESCE(v_bp_contrib_eir, false);
  v_bp_contrib_severance := COALESCE(v_bp_contrib_severance, false);
  v_bp_include_in_severance := COALESCE(v_bp_include_in_severance, false);
  
  -- ===== Due date / Filing deadline (configurable) =====
  IF v_filing_window_unit = 1 THEN
    v_filing_deadline := (v_period_date + (v_filing_window_value || ' months')::INTERVAL)::DATE;
    v_filing_deadline := (date_trunc('month', v_filing_deadline) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_filing_deadline := ((date_trunc('month', v_period_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE + v_filing_window_value);
  END IF;

  -- Legacy due date (still used for backward-compat display)
  IF v_config.submission_due_day = 0 THEN
    v_due_date := (make_date(
      CASE WHEN p_period_month + 1 > 11 THEN p_period_year + 1 ELSE p_period_year END,
      CASE WHEN p_period_month + 1 > 11 THEN 1 ELSE p_period_month + 2 END,
      1
    ) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_due_date := make_date(
      CASE WHEN p_period_month + 1 > 11 THEN p_period_year + 1 ELSE p_period_year END,
      CASE WHEN p_period_month + 1 > 11 THEN 1 ELSE p_period_month + 2 END,
      LEAST(v_config.submission_due_day, 28)
    );
  END IF;
  
  v_days_late := GREATEST(0, p_received_date - v_filing_deadline);
  v_due_year := EXTRACT(YEAR FROM v_filing_deadline)::INTEGER;
  v_due_month := EXTRACT(MONTH FROM v_filing_deadline)::INTEGER;
  v_received_year := EXTRACT(YEAR FROM p_received_date)::INTEGER;
  v_received_month := EXTRACT(MONTH FROM p_received_date)::INTEGER;
  
  -- Calculate delay periods based on configured unit
  IF v_filing_window_unit = 1 THEN
    v_months_late_calendar := GREATEST(0, (v_received_year * 12 + v_received_month) - (v_due_year * 12 + v_due_month));
    v_delay_periods := v_months_late_calendar;
  ELSE
    v_months_late_calendar := GREATEST(0, (v_received_year * 12 + v_received_month) - (v_due_year * 12 + v_due_month));
    v_delay_periods := v_days_late;
  END IF;
  
  IF v_days_late > 30 THEN
    v_additional_30_periods := CEIL((v_days_late - 30)::NUMERIC / 30);
  ELSE
    v_additional_30_periods := 0;
  END IF;
  IF v_days_late > 0 THEN
    v_months_late := CEIL(v_days_late::NUMERIC / 30);
  ELSE
    v_months_late := 0;
  END IF;
  
  -- Calculate initial and subsequent penalty periods
  -- Initial penalty applies up to the initial threshold
  -- Subsequent penalty applies for ALL remaining periods beyond the initial threshold (no cap)
  -- v_penalty_subsequent_threshold defines the period length for each subsequent penalty application
  IF v_delay_periods > 0 THEN
    v_initial_periods := LEAST(v_delay_periods, v_penalty_initial_threshold);
    v_subsequent_periods := GREATEST(0, v_delay_periods - v_penalty_initial_threshold);
    -- No cap on subsequent periods - penalty applies for all periods until C3 is submitted
  ELSE
    v_initial_periods := 0;
    v_subsequent_periods := 0;
  END IF;

  -- ===== PROCESS EMPLOYEES =====
  FOR v_employee IN SELECT * FROM jsonb_array_elements(p_employee_data)
  LOOP
    v_week1 := COALESCE((v_employee->>'week1')::NUMERIC, (v_employee->'weeklyWages'->>0)::NUMERIC, 0);
    v_week2 := COALESCE((v_employee->>'week2')::NUMERIC, (v_employee->'weeklyWages'->>1)::NUMERIC, 0);
    v_week3 := COALESCE((v_employee->>'week3')::NUMERIC, (v_employee->'weeklyWages'->>2)::NUMERIC, 0);
    v_week4 := COALESCE((v_employee->>'week4')::NUMERIC, (v_employee->'weeklyWages'->>3)::NUMERIC, 0);
    v_week5 := COALESCE((v_employee->>'week5')::NUMERIC, (v_employee->'weeklyWages'->>4)::NUMERIC, 0);
    v_bonus := COALESCE((v_employee->>'bonus')::NUMERIC, (v_employee->'weeklyWages'->>5)::NUMERIC, 0);
    v_holiday := COALESCE((v_employee->>'holiday')::NUMERIC, (v_employee->'weeklyWages'->>6)::NUMERIC, 0);
    v_pay_period := COALESCE(v_employee->>'payPeriod', 'Monthly');
    v_term_start_date := CASE WHEN v_employee->>'termStartDate' IS NOT NULL AND v_employee->>'termStartDate' != '' THEN (v_employee->>'termStartDate')::DATE ELSE NULL END;
    v_date_of_birth := CASE WHEN v_employee->>'dateOfBirth' IS NOT NULL AND v_employee->>'dateOfBirth' != '' THEN (v_employee->>'dateOfBirth')::DATE ELSE NULL END;
    
    -- Calculate age
    IF v_date_of_birth IS NOT NULL THEN
      v_employee_age := EXTRACT(YEAR FROM age(v_period_date, v_date_of_birth))::INTEGER;
    ELSE
      v_employee_age := 30;
    END IF;
    
    -- Total wages
    v_total_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5 + v_bonus + v_holiday;
    v_taxable_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5;
    
    -- Age exemptions
    v_is_age_exempt_ss := (v_employee_age < v_config.min_age_ss) OR (v_employee_age >= v_config.max_age_ss);
    v_is_age_exempt_levy := (v_employee_age < v_config.min_age_levy) OR (v_employee_age >= v_config.max_age_levy);
    
    -- ===== BONUS eligibility =====
    v_bonus_eligible := v_bonus > 0;
    IF v_bonus_eligible AND v_bp_min_bonus IS NOT NULL AND v_bonus < v_bp_min_bonus THEN
      v_bonus_eligible := false;
    END IF;
    IF v_bonus_eligible AND v_bp_max_bonus IS NOT NULL AND v_bonus > v_bp_max_bonus THEN
      v_bonus_eligible := false;
    END IF;
    
    -- ===== HOLIDAY PAY POLICY =====
    v_hp_eligible := v_holiday > 0;
    v_holiday_levy := 0;
    v_hp_policy := NULL;
    v_hp_policy_type := NULL;
    v_hp_distribution_enabled := false;
    v_holiday_distribution := NULL;
    v_hp_levy_include := false;
    v_hp_ssc_include := false;
    v_hp_include_severance := false;
    v_hp_ssc_employee := false;
    v_hp_ssc_employer := false;
    v_hp_ssc_eib := false;
    
    IF v_hp_eligible THEN
      -- Check for exception first
      SELECT jsonb_build_object(
        'id', id, 'levy_include', levy_include, 'levy_method', levy_method,
        'levy_flat_enabled', levy_flat_enabled, 'levy_flat_percentage', levy_flat_percentage,
        'levy_slab_enabled', levy_slab_enabled, 'levy_distribution', levy_distribution::jsonb,
        'ssc_include', ssc_include, 'ssc_employee', ssc_employee, 'ssc_employer', ssc_employer, 'ssc_eib', ssc_eib,
        'include_in_severance', include_in_severance,
        'min_holiday_amount', min_holiday_amount, 'max_holiday_amount', max_holiday_amount,
        'distribution_enabled', distribution_enabled
      ) INTO v_hp_policy
      FROM public.c3_holiday_pay_policy_exceptions
      WHERE is_active = true AND override_default = true
        AND exception_month = (p_period_month + 1)
        AND year_from <= p_period_year
        AND (year_to IS NULL OR year_to >= p_period_year)
      ORDER BY date_from DESC LIMIT 1;
      
      IF v_hp_policy IS NOT NULL THEN
        v_hp_policy_type := 'exception';
      ELSE
        SELECT jsonb_build_object(
          'id', id, 'levy_include', levy_include, 'levy_method', levy_method,
          'levy_flat_enabled', levy_flat_enabled, 'levy_flat_percentage', levy_flat_percentage,
          'levy_slab_enabled', levy_slab_enabled, 'levy_distribution', levy_distribution::jsonb,
          'ssc_include', ssc_include, 'ssc_employee', ssc_employee, 'ssc_employer', ssc_employer, 'ssc_eib', ssc_eib,
          'include_in_severance', include_in_severance,
          'min_holiday_amount', min_holiday_amount, 'max_holiday_amount', max_holiday_amount,
          'distribution_enabled', distribution_enabled
        ) INTO v_hp_policy
        FROM public.c3_holiday_pay_policy_defaults
        WHERE is_active = true
        ORDER BY created_at DESC LIMIT 1;
        
        IF v_hp_policy IS NOT NULL THEN
          v_hp_policy_type := 'default';
        END IF;
      END IF;
      
      IF v_hp_policy IS NOT NULL THEN
        v_hp_levy_include := COALESCE((v_hp_policy->>'levy_include')::BOOLEAN, false);
        v_hp_levy_method := COALESCE(v_hp_policy->>'levy_method', 'flat');
        v_hp_levy_flat_enabled := COALESCE((v_hp_policy->>'levy_flat_enabled')::BOOLEAN, false);
        v_hp_levy_flat_pct := COALESCE((v_hp_policy->>'levy_flat_percentage')::NUMERIC, 0) / 100.0;
        v_hp_levy_slab_enabled := COALESCE((v_hp_policy->>'levy_slab_enabled')::BOOLEAN, false);
        v_hp_levy_distribution := v_hp_policy->'levy_distribution';
        v_hp_ssc_include := COALESCE((v_hp_policy->>'ssc_include')::BOOLEAN, false);
        v_hp_ssc_employee := COALESCE((v_hp_policy->>'ssc_employee')::BOOLEAN, false);
        v_hp_ssc_employer := COALESCE((v_hp_policy->>'ssc_employer')::BOOLEAN, false);
        v_hp_ssc_eib := COALESCE((v_hp_policy->>'ssc_eib')::BOOLEAN, false);
        v_hp_include_severance := COALESCE((v_hp_policy->>'include_in_severance')::BOOLEAN, false);
        v_hp_min := (v_hp_policy->>'min_holiday_amount')::NUMERIC;
        v_hp_max := (v_hp_policy->>'max_holiday_amount')::NUMERIC;
        v_hp_distribution_enabled := COALESCE((v_hp_policy->>'distribution_enabled')::BOOLEAN, false);
        
        IF v_hp_min IS NOT NULL AND v_holiday < v_hp_min THEN v_hp_eligible := false; END IF;
        IF v_hp_max IS NOT NULL AND v_holiday > v_hp_max THEN v_hp_eligible := false; END IF;
      END IF;
    END IF;
    
    -- ===== HOLIDAY DISTRIBUTION (date-based) =====
    v_holiday_has_dates := false;
    IF v_hp_eligible AND v_hp_distribution_enabled AND v_holiday > 0 THEN
      v_hol_start := CASE WHEN v_employee->>'holidayStartDate' IS NOT NULL AND v_employee->>'holidayStartDate' != '' THEN (v_employee->>'holidayStartDate')::DATE ELSE NULL END;
      v_hol_end := CASE WHEN v_employee->>'holidayEndDate' IS NOT NULL AND v_employee->>'holidayEndDate' != '' THEN (v_employee->>'holidayEndDate')::DATE ELSE NULL END;
      
      IF v_hol_start IS NOT NULL AND v_hol_end IS NOT NULL AND v_hol_end >= v_hol_start THEN
        v_holiday_has_dates := true;
        
        -- Clip holiday dates to the period month
        v_month_start := v_period_date;
        v_month_end := (date_trunc('month', v_period_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        v_total_holiday_days := (v_hol_end - v_hol_start) + 1;
        
        IF v_hol_start < v_month_start THEN v_hol_start := v_month_start; END IF;
        IF v_hol_end > v_month_end THEN v_hol_end := v_month_end; END IF;
        v_in_month_days := GREATEST(0, (v_hol_end - v_hol_start) + 1);
        
        IF v_in_month_days < v_total_holiday_days AND v_total_holiday_days > 0 THEN
          v_original_holiday := v_holiday;
          v_holiday := ROUND(v_holiday * (v_in_month_days::NUMERIC / v_total_holiday_days::NUMERIC), 2);
        END IF;
        
        v_overlap_days := ARRAY[]::INTEGER[];
        v_hol_distributed := ARRAY[0,0,0,0,0]::NUMERIC[];
        v_total_overlap := 0;
        
        FOR v_i IN 1..v_monday_count LOOP
          v_week_start := v_mondays[v_i];
          v_week_end := v_week_start + 6;
          IF v_week_end > v_month_end THEN v_week_end := v_month_end; END IF;
          
          IF v_hol_start <= v_week_end AND v_hol_end >= v_week_start THEN
            v_overlap_days := v_overlap_days || GREATEST(0, LEAST(v_hol_end, v_week_end)::DATE - GREATEST(v_hol_start, v_week_start)::DATE + 1);
            v_total_overlap := v_total_overlap + v_overlap_days[v_i];
          ELSE
            v_overlap_days := v_overlap_days || 0;
          END IF;
        END LOOP;
        
        IF v_total_overlap > 0 THEN
          FOR v_i IN 1..v_monday_count LOOP
            v_hol_distributed[v_i] := ROUND(v_holiday * (v_overlap_days[v_i]::NUMERIC / v_total_overlap::NUMERIC), 2);
          END LOOP;
        END IF;
        
        v_holiday_distribution := jsonb_build_object(
          'week1', v_hol_distributed[1], 'week2', v_hol_distributed[2],
          'week3', v_hol_distributed[3], 'week4', v_hol_distributed[4],
          'week5', COALESCE(v_hol_distributed[5], 0),
          'totalDistributed', v_hol_distributed[1]+v_hol_distributed[2]+v_hol_distributed[3]+v_hol_distributed[4]+COALESCE(v_hol_distributed[5],0),
          'overlapDays', to_jsonb(v_overlap_days),
          'distributed', true
        );
      END IF;
      
      -- Handle "no dates" flag
      IF COALESCE(v_employee->>'holidayNoDates', 'false') = 'true' THEN
        v_holiday_has_dates := false;
        v_holiday_distribution := NULL;
      END IF;
    END IF;
    
    -- ===== SOCIAL SECURITY =====
    IF v_is_age_exempt_ss THEN
      v_ss_wage_base := 0; v_ss_insurable := 0;
      v_employee_ss := 0; v_employer_ss := 0; v_employer_eib := 0; v_employer_ss_total := 0;
    ELSE
      v_ss_wage_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_employee THEN
        v_ss_wage_base := v_ss_wage_base + v_bonus;
      END IF;
      IF v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_employee THEN
        v_ss_wage_base := v_ss_wage_base + v_holiday;
      END IF;
      v_ss_insurable := LEAST(v_ss_wage_base, v_config.employee_ss_max_wage);
      v_employee_ss := ROUND(v_ss_insurable * v_config.employee_ss_rate, 2);
      
      v_employer_ss_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_employer THEN
        v_employer_ss_base := v_employer_ss_base + v_bonus;
      END IF;
      IF v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_employer THEN
        v_employer_ss_base := v_employer_ss_base + v_holiday;
      END IF;
      v_employer_ss := ROUND(LEAST(v_employer_ss_base, v_config.employee_ss_max_wage) * v_config.employer_ss_rate, 2);
      
      v_employer_eib_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_eir THEN
        v_employer_eib_base := v_employer_eib_base + v_bonus;
      END IF;
      IF v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_eib THEN
        v_employer_eib_base := v_employer_eib_base + v_holiday;
      END IF;
      v_employer_eib := ROUND(LEAST(v_employer_eib_base, v_config.employer_eib_max_wage) * v_config.employer_eib_rate, 2);
      v_employer_ss_total := v_employer_ss + v_employer_eib;
    END IF;
    
    -- ===== LEVY =====
    v_employee_levy := 0;
    v_bonus_levy := 0;
    v_holiday_levy := 0;
    
    IF v_is_age_exempt_levy THEN
      v_employee_levy := 0;
    ELSE
      -- Build the amounts array based on policy
      IF v_bp_calculation_method = 'merge' AND v_bonus_eligible AND v_bonus_include_in_levy THEN
        v_merged_amounts := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5];
        v_merge_total := v_bonus;
        v_merge_count := 0;
        FOR v_i IN 1..5 LOOP
          IF v_merged_amounts[v_i] > 0 THEN v_merge_count := v_merge_count + 1; END IF;
        END LOOP;
        IF v_merge_count > 0 THEN
          v_per_week_bonus := ROUND(v_merge_total / v_merge_count, 2);
          FOR v_i IN 1..5 LOOP
            IF v_merged_amounts[v_i] > 0 THEN
              v_merged_amounts[v_i] := v_merged_amounts[v_i] + v_per_week_bonus;
            END IF;
          END LOOP;
        END IF;
        v_amounts_array := v_merged_amounts;
      ELSE
        v_amounts_array := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5];
      END IF;
      
      -- Holiday merge into levy if policy says so
      IF v_hp_eligible AND v_hp_levy_include THEN
        IF v_holiday_has_dates AND v_hp_distribution_enabled AND v_holiday_distribution IS NOT NULL THEN
          FOR v_i IN 1..5 LOOP
            v_amounts_array[v_i] := v_amounts_array[v_i] + COALESCE((v_holiday_distribution->>'week' || v_i)::NUMERIC, 0);
          END LOOP;
        ELSE
          -- No dates or distribution disabled: add to highest week
          v_hp_target_slot := 1;
          FOR v_i IN 2..5 LOOP
            IF v_amounts_array[v_i] > v_amounts_array[v_hp_target_slot] THEN
              v_hp_target_slot := v_i;
            END IF;
          END LOOP;
          v_amounts_array[v_hp_target_slot] := v_amounts_array[v_hp_target_slot] + v_holiday;
        END IF;
      END IF;
      
      -- Monthly-total override check
      v_monthly_total_for_levy := 0;
      FOR v_i IN 1..5 LOOP
        v_monthly_total_for_levy := v_monthly_total_for_levy + v_amounts_array[v_i];
      END LOOP;
      
      v_use_monthly_override := false;
      SELECT slab_code INTO v_slab_code
      FROM public.c3_levy_slabs
      WHERE slab_code = 'M' AND is_active = true AND v_monthly_total_for_levy >= min_wage AND v_monthly_total_for_levy <= COALESCE(max_wage, 999999999)
      LIMIT 1;
      IF FOUND THEN
        v_use_monthly_override := true;
      END IF;
      
      IF v_use_monthly_override THEN
        SELECT COALESCE(levy_rate, 0) INTO v_week_levy
        FROM public.c3_levy_slabs
        WHERE slab_code = 'M' AND is_active = true AND v_monthly_total_for_levy >= min_wage AND v_monthly_total_for_levy <= COALESCE(max_wage, 999999999)
        LIMIT 1;
        v_employee_levy := ROUND(v_monthly_total_for_levy * v_week_levy, 2);
      ELSE
        FOR v_i IN 1..5 LOOP
          v_week_amount := v_amounts_array[v_i];
          IF v_week_amount > 0 THEN
            SELECT COALESCE(levy_rate, 0) INTO v_week_levy
            FROM public.c3_levy_slabs
            WHERE slab_code = 'W' AND is_active = true AND v_week_amount >= min_wage AND v_week_amount <= COALESCE(max_wage, 999999999)
            LIMIT 1;
            IF NOT FOUND THEN v_week_levy := 0; END IF;
            v_employee_levy := v_employee_levy + ROUND(v_week_amount * v_week_levy, 2);
          END IF;
        END LOOP;
      END IF;
      
      -- Separate bonus levy (flat rate) if not merged
      IF v_bonus_eligible AND v_bonus_include_in_levy AND v_bp_calculation_method = 'separate' THEN
        IF v_bp_calc_flat_enabled THEN
          v_bonus_levy := ROUND(v_bonus * v_bonus_flat_rate, 2);
        ELSE
          SELECT COALESCE(levy_rate, 0) INTO v_week_levy
          FROM public.c3_levy_slabs
          WHERE slab_code = 'W' AND is_active = true AND v_bonus >= min_wage AND v_bonus <= COALESCE(max_wage, 999999999)
          LIMIT 1;
          IF NOT FOUND THEN v_week_levy := 0; END IF;
          v_bonus_levy := ROUND(v_bonus * v_week_levy, 2);
        END IF;
        v_employee_levy := v_employee_levy + v_bonus_levy;
      END IF;
      
      -- Separate holiday levy if not merged
      IF v_hp_eligible AND v_hp_levy_include AND NOT v_holiday_has_dates AND NOT v_hp_distribution_enabled THEN
        -- Already merged above
      ELSIF v_hp_eligible AND NOT v_hp_levy_include THEN
        -- Not included, no holiday levy
      END IF;
    END IF;
    
    -- Employer levy
    v_employer_levy_base := v_taxable_wages;
    IF v_bonus_eligible AND v_bonus_include_in_levy THEN
      v_employer_levy_base := v_employer_levy_base + v_bonus;
    END IF;
    IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_levy_include) THEN
      v_employer_levy_base := v_employer_levy_base - v_holiday;
    END IF;
    v_employer_levy := ROUND(v_employer_levy_base * v_config.employer_levy_rate, 2);
    
    -- Employer severance
    v_severance_base := v_taxable_wages;
    IF v_bonus_eligible AND (v_bp_include_in_severance OR v_bp_contrib_severance) THEN
      v_severance_base := v_severance_base + v_bonus;
    END IF;
    IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_include_severance) THEN
      v_severance_base := v_severance_base - v_holiday;
    END IF;
    v_employer_severance := ROUND(v_severance_base * v_config.employer_severance_rate, 2);
    
    -- Build employee result
    v_employee_result := jsonb_build_object(
      'ssn', v_employee->>'ssn', 'name', v_employee->>'name',
      'totalWages', v_total_wages, 'taxableWages', v_taxable_wages,
      'employeeAge', v_employee_age,
      'isAgeExemptSS', v_is_age_exempt_ss, 'isAgeExemptLevy', v_is_age_exempt_levy,
      'ssWageBase', v_ss_wage_base, 'ssInsurable', v_ss_insurable,
      'employeeSS', v_employee_ss, 'employerSS', v_employer_ss,
      'employerEIB', v_employer_eib, 'employerSSTotal', v_employer_ss_total,
      'employeeLevy', v_employee_levy, 'bonusLevy', v_bonus_levy,
      'holidayLevy', v_holiday_levy,
      'employerLevy', v_employer_levy, 'employerSeverance', v_employer_severance,
      'periodGross', v_total_wages,
      'totalWagesPlusEmployeeLevyPlusSS', v_total_wages + v_employee_levy + v_employee_ss,
      'employersThreePercentLevyPlusSS', v_employer_levy + v_employer_ss_total,
      'employersOnePercentSeverancePay', v_employer_severance,
      'holidayPolicyApplied', CASE WHEN v_hp_policy IS NOT NULL AND v_hp_eligible THEN v_hp_policy->>'id' ELSE NULL END,
      'holidayPolicyType', CASE WHEN v_hp_policy IS NOT NULL THEN v_hp_policy_type ELSE NULL END,
      'holidayDistribution', COALESCE(v_holiday_distribution, NULL)
    );
    
    v_employees_result := v_employees_result || v_employee_result;
    v_sum_period_gross := v_sum_period_gross + v_total_wages;
    v_sum_taxable_wages := v_sum_taxable_wages + v_taxable_wages;
    v_sum_employee_ss := v_sum_employee_ss + v_employee_ss;
    v_sum_employer_ss := v_sum_employer_ss + v_employer_ss_total;
    v_sum_employee_levy := v_sum_employee_levy + v_employee_levy;
    v_sum_employer_levy := v_sum_employer_levy + v_employer_levy;
    v_sum_employer_severance := v_sum_employer_severance + v_employer_severance;
  END LOOP;
  
  -- ===== PENALTIES (configurable thresholds) =====
  IF v_delay_periods > 0 THEN
    v_levy_penalty_base := COALESCE(v_sum_employee_levy, 0) + COALESCE(v_sum_employer_levy, 0);
    v_levy_penalty := ROUND(
      v_levy_penalty_base * v_config.levy_penalty_initial_rate * v_initial_periods +
      v_levy_penalty_base * v_config.levy_penalty_subsequent_rate * v_subsequent_periods, 2);
    
    v_severance_penalty_base := COALESCE(v_sum_employer_severance, 0);
    v_severance_penalty := ROUND(
      v_severance_penalty_base * v_config.severance_penalty_initial_rate * v_initial_periods +
      v_severance_penalty_base * v_config.severance_penalty_subsequent_rate * v_subsequent_periods, 2);
    
    v_ss_fine_base := COALESCE(v_sum_employee_ss, 0) + COALESCE(v_sum_employer_ss, 0);
    v_ss_fine := ROUND(
      v_ss_fine_base * v_config.ss_fine_initial_rate * v_initial_periods +
      v_ss_fine_base * COALESCE(v_config.ss_fine_subsequent_rate, v_config.ss_fine_initial_rate) * v_subsequent_periods, 2);
    
    v_total_late_charges := v_levy_penalty + v_severance_penalty + v_ss_fine;
  END IF;
  
  -- Build totals
  v_totals := jsonb_build_object(
    'periodGross', ROUND(v_sum_period_gross, 2),
    'taxableWages', ROUND(v_sum_taxable_wages, 2),
    'employeeSS', ROUND(v_sum_employee_ss, 2),
    'employerSS', ROUND(v_sum_employer_ss, 2),
    'employeeLevy', ROUND(v_sum_employee_levy, 2),
    'employerLevy', ROUND(v_sum_employer_levy, 2),
    'employerSeverance', ROUND(v_sum_employer_severance, 2),
    'totalWagesPlusEmployeeLevyPlusSS', ROUND(v_sum_period_gross + v_sum_employee_levy + v_sum_employee_ss, 2),
    'employersThreePercentLevyPlusSS', ROUND(v_sum_employer_levy + v_sum_employer_ss, 2),
    'employersOnePercentSeverancePay', ROUND(v_sum_employer_severance, 2),
    'dueDate', v_due_date,
    'filingDeadline', v_filing_deadline,
    'daysLate', v_days_late,
    'additional30DayPeriods', v_additional_30_periods,
    'monthsLate', v_months_late_calendar,
    'delayPeriods', v_delay_periods,
    'initialPenaltyPeriods', v_initial_periods,
    'subsequentPenaltyPeriods', v_subsequent_periods,
    'filingWindowUnit', CASE WHEN v_filing_window_unit = 1 THEN 'months' ELSE 'days' END,
    'filingWindowValue', v_filing_window_value,
    'penaltyInitialThreshold', v_penalty_initial_threshold,
    'penaltySubsequentThreshold', v_penalty_subsequent_threshold,
    'weekStartDay', v_week_start_day,
    'levyPenaltyBase', v_levy_penalty_base,
    'severancePenaltyBase', v_severance_penalty_base,
    'ssFinBase', v_ss_fine_base,
    'levyPenalty', v_levy_penalty,
    'severancePenalty', v_severance_penalty,
    'ssFine', v_ss_fine,
    'totalLateCharges', v_total_late_charges
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'config', jsonb_build_object(
      'periodId', v_config.config_period_id,
      'startDate', v_config.start_date,
      'endDate', v_config.end_date,
      'minAgeSS', v_config.min_age_ss,
      'maxAgeSS', v_config.max_age_ss,
      'minAgeLevy', v_config.min_age_levy,
      'maxAgeLevy', v_config.max_age_levy,
      'employeeSSRate', v_config.employee_ss_rate,
      'employeeSSMaxWage', v_config.employee_ss_max_wage,
      'employerSSRate', v_config.employer_ss_rate,
      'employerEIBRate', v_config.employer_eib_rate,
      'employerLevyRate', v_config.employer_levy_rate,
      'employerSeveranceRate', v_config.employer_severance_rate,
      'weekStartDay', v_week_start_day,
      'filingWindowUnit', CASE WHEN v_filing_window_unit = 1 THEN 'months' ELSE 'days' END,
      'filingWindowValue', v_filing_window_value
    ),
    'employees', v_employees_result,
    'totals', v_totals
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;