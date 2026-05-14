
-- Restore the original calculate_c3_contributions function from 20260310214532
-- with ONLY the filing deadline calculation fixed.
-- The fix: compute filing deadline directly from the period instead of from v_due_date.

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
  v_hp_target_slot INTEGER;
  v_sum_period_gross NUMERIC := 0; v_sum_taxable_wages NUMERIC := 0;
  v_sum_employee_ss NUMERIC := 0; v_sum_employer_ss NUMERIC := 0;
  v_sum_employee_levy NUMERIC := 0; v_sum_employer_levy NUMERIC := 0;
  v_sum_employer_severance NUMERIC := 0;
  v_levy_penalty NUMERIC := 0; v_severance_penalty NUMERIC := 0;
  v_ss_fine NUMERIC := 0; v_total_late_charges NUMERIC := 0;
  v_levy_penalty_base NUMERIC := 0; v_severance_penalty_base NUMERIC := 0; v_ss_fine_base NUMERIC := 0;
  v_due_year INTEGER; v_due_month INTEGER; v_received_year INTEGER; v_received_month INTEGER;
  v_slab_code VARCHAR;
  v_week_start_day INTEGER;
  v_filing_window_unit INTEGER;
  v_filing_window_value INTEGER;
  v_penalty_initial_threshold INTEGER;
  v_penalty_subsequent_threshold INTEGER;
  v_filing_deadline DATE;
  v_delay_periods INTEGER;
  v_initial_penalty_periods INTEGER;
  v_subsequent_penalty_periods INTEGER;
  v_pg_dow INTEGER;
BEGIN
  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  
  SELECT * INTO v_config FROM public.get_c3_config_for_period(v_period_date);
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No active configuration found for period %', v_period_date;
  END IF;
  
  SELECT COALESCE((SELECT config_value FROM c3_calculation_config WHERE config_key = 'week_start_day' AND is_active = true), 1)::INTEGER INTO v_week_start_day;
  SELECT COALESCE((SELECT config_value FROM c3_calculation_config WHERE config_key = 'filing_window_unit' AND is_active = true), 1)::INTEGER INTO v_filing_window_unit;
  SELECT COALESCE((SELECT config_value FROM c3_calculation_config WHERE config_key = 'filing_window_value' AND is_active = true), 1)::INTEGER INTO v_filing_window_value;
  SELECT COALESCE((SELECT config_value FROM c3_calculation_config WHERE config_key = 'penalty_initial_threshold' AND is_active = true), 1)::INTEGER INTO v_penalty_initial_threshold;
  SELECT COALESCE((SELECT config_value FROM c3_calculation_config WHERE config_key = 'penalty_subsequent_threshold' AND is_active = true), 1)::INTEGER INTO v_penalty_subsequent_threshold;
  
  IF v_week_start_day = 7 THEN v_pg_dow := 0; ELSE v_pg_dow := v_week_start_day; END IF;

  v_mondays := ARRAY[]::DATE[];
  v_monday := v_period_date;
  WHILE EXTRACT(DOW FROM v_monday)::INTEGER != v_pg_dow LOOP
    v_monday := v_monday + 1;
  END LOOP;
  WHILE EXTRACT(MONTH FROM v_monday) = (p_period_month + 1) LOOP
    v_mondays := v_mondays || v_monday;
    v_monday := v_monday + 7;
  END LOOP;
  v_monday_count := array_length(v_mondays, 1);
  IF v_monday_count IS NULL THEN v_monday_count := 0; END IF;

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
  WHERE is_active = true AND override_default = true
    AND exception_month = (p_period_month + 1)
    AND year_from <= p_period_year
    AND (year_to IS NULL OR year_to >= p_period_year)
  ORDER BY date_from DESC LIMIT 1;
  
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
    FROM public.c3_bonus_policy_default
    WHERE is_active = true AND v_period_date >= date_from AND (date_to IS NULL OR v_period_date <= date_to)
    ORDER BY created_on DESC LIMIT 1;
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
  
  -- ===== DUE DATE (legacy, kept for display) =====
  IF v_config.submission_due_day = 0 THEN
    v_due_date := (make_date(
      CASE WHEN p_period_month + 1 > 11 THEN p_period_year + 1 ELSE p_period_year END,
      CASE WHEN p_period_month + 1 > 11 THEN 1 ELSE p_period_month + 2 END, 1
    ) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    v_due_date := make_date(
      CASE WHEN p_period_month + 1 > 11 THEN p_period_year + 1 ELSE p_period_year END,
      CASE WHEN p_period_month + 1 > 11 THEN 1 ELSE p_period_month + 2 END,
      LEAST(v_config.submission_due_day, 28)
    );
  END IF;
  
  -- ===== FIXED FILING DEADLINE =====
  -- Compute directly from period to avoid double-counting.
  -- p_period_month is 0-indexed. Target 1-indexed month = p_period_month + v_filing_window_value + 1
  IF v_filing_window_unit = 1 THEN
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
      v_filing_deadline := (make_date(v_fl_target_year, v_fl_target_month, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END;
  ELSE
    -- Days-based: add days to the last day of the period month
    v_filing_deadline := (make_date(p_period_year, p_period_month + 1, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE + v_filing_window_value;
  END IF;
  
  v_days_late := GREATEST(0, p_received_date - v_filing_deadline);
  v_due_year := EXTRACT(YEAR FROM v_filing_deadline)::INTEGER;
  v_due_month := EXTRACT(MONTH FROM v_filing_deadline)::INTEGER;
  v_received_year := EXTRACT(YEAR FROM p_received_date)::INTEGER;
  v_received_month := EXTRACT(MONTH FROM p_received_date)::INTEGER;
  v_months_late_calendar := GREATEST(0, (v_received_year * 12 + v_received_month) - (v_due_year * 12 + v_due_month));
  
  IF v_days_late > 30 THEN v_additional_30_periods := CEIL((v_days_late - 30)::NUMERIC / 30);
  ELSE v_additional_30_periods := 0; END IF;
  IF v_days_late > 0 THEN v_months_late := CEIL(v_days_late::NUMERIC / 30);
  ELSE v_months_late := 0; END IF;
  
  IF v_filing_window_unit = 1 THEN v_delay_periods := v_months_late_calendar;
  ELSE v_delay_periods := v_months_late; END IF;
  
  v_initial_penalty_periods := LEAST(v_delay_periods, v_penalty_initial_threshold);
  v_subsequent_penalty_periods := GREATEST(0, v_delay_periods - v_penalty_initial_threshold);
  
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
    v_term_start_date := (v_employee->>'termStartDate')::DATE;
    v_date_of_birth := (v_employee->>'dateOfBirth')::DATE;
    
    v_holiday_has_dates := (v_employee->>'holidayStartDate') IS NOT NULL 
                           AND (v_employee->>'holidayStartDate') != ''
                           AND (v_employee->>'holidayNoDates') IS DISTINCT FROM 'true';
    
    IF v_holiday_has_dates THEN v_hp_policy_type := 'with_dates';
    ELSE v_hp_policy_type := 'without_dates'; END IF;
    
    -- ===== HOLIDAY DATE-BASED DISTRIBUTION =====
    v_holiday_distribution := NULL;
    v_hol_distributed := ARRAY[0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC];
    
    IF v_holiday > 0 AND v_holiday_has_dates AND v_monday_count > 0 THEN
      v_hol_start := (v_employee->>'holidayStartDate')::DATE;
      v_hol_end := COALESCE((v_employee->>'holidayEndDate')::DATE, v_hol_start);
      
      v_hp_policy := public.resolve_holiday_pay_policy(
        v_period_date, (p_period_month + 1), p_period_year, 'with_dates'
      );
      v_hp_distribution_enabled := COALESCE((v_hp_policy->>'distribution_enabled')::BOOLEAN, true);
      
      IF v_hp_distribution_enabled THEN
        v_overlap_days := ARRAY[0, 0, 0, 0, 0];
        v_total_overlap := 0;
        
        FOR v_i IN 1..v_monday_count LOOP
          v_week_start := v_mondays[v_i];
          IF v_i < v_monday_count THEN v_week_end := v_mondays[v_i + 1] - 1;
          ELSE v_week_end := (v_period_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE; END IF;
          
          IF v_hol_start <= v_week_end AND v_hol_end >= v_week_start THEN
            v_overlap_days[v_i] := GREATEST(0, 
              LEAST(v_hol_end, v_week_end)::INTEGER - GREATEST(v_hol_start, v_week_start)::INTEGER + 1);
            v_total_overlap := v_total_overlap + v_overlap_days[v_i];
          END IF;
        END LOOP;
        
        IF v_total_overlap > 0 THEN
          FOR v_i IN 1..5 LOOP
            IF v_i <= v_monday_count AND v_overlap_days[v_i] > 0 THEN
              v_hol_distributed[v_i] := ROUND(v_holiday * v_overlap_days[v_i]::NUMERIC / v_total_overlap::NUMERIC, 2);
            END IF;
          END LOOP;
          
          DECLARE
            v_dist_sum NUMERIC := 0;
            v_last_dist_week INTEGER := 1;
          BEGIN
            FOR v_i IN 1..5 LOOP
              v_dist_sum := v_dist_sum + v_hol_distributed[v_i];
              IF v_hol_distributed[v_i] > 0 THEN v_last_dist_week := v_i; END IF;
            END LOOP;
            IF v_dist_sum != v_holiday THEN
              v_hol_distributed[v_last_dist_week] := v_hol_distributed[v_last_dist_week] + (v_holiday - v_dist_sum);
            END IF;
          END;
          
          v_week1 := v_week1 + v_hol_distributed[1];
          v_week2 := v_week2 + v_hol_distributed[2];
          v_week3 := v_week3 + v_hol_distributed[3];
          v_week4 := v_week4 + v_hol_distributed[4];
          v_week5 := v_week5 + v_hol_distributed[5];
          v_holiday := 0;
          
          v_holiday_distribution := jsonb_build_object(
            'distributed', true,
            'week1', v_hol_distributed[1], 'week2', v_hol_distributed[2],
            'week3', v_hol_distributed[3], 'week4', v_hol_distributed[4],
            'week5', v_hol_distributed[5],
            'totalDistributed', v_hol_distributed[1]+v_hol_distributed[2]+v_hol_distributed[3]+v_hol_distributed[4]+v_hol_distributed[5],
            'overlapDays', to_jsonb(v_overlap_days),
            'holidayStart', v_hol_start, 'holidayEnd', v_hol_end
          );
        END IF;
      END IF;
    END IF;
    
    IF v_date_of_birth IS NOT NULL THEN
      v_employee_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_date_of_birth))::INTEGER;
    ELSE v_employee_age := 30; END IF;
    
    v_pay_period_code := CASE v_pay_period
      WHEN 'Weekly' THEN 'W' WHEN 'Bi-Weekly' THEN 'E2W'
      WHEN '2 Monthly' THEN '2M' WHEN 'Monthly' THEN 'M' ELSE 'M'
    END;
    
    v_is_december_start := v_term_start_date IS NOT NULL AND EXTRACT(MONTH FROM v_term_start_date) = 12;
    v_total_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5 + v_bonus + v_holiday;
    v_taxable_wages := v_total_wages - v_bonus;
    v_is_age_exempt_ss := v_employee_age < v_config.min_age_ss OR v_employee_age > v_config.max_age_ss;
    v_is_age_exempt_levy := v_employee_age < v_config.min_age_levy OR v_employee_age > v_config.max_age_levy;
    
    IF v_holiday_distribution IS NULL THEN v_hp_policy := NULL; END IF;
    v_holiday_levy := 0;
    v_hp_eligible := v_holiday > 0;
    
    IF v_hp_eligible THEN
      IF v_hp_policy IS NULL THEN
        v_hp_policy := public.resolve_holiday_pay_policy(
          v_period_date, (p_period_month + 1), p_period_year, v_hp_policy_type
        );
      END IF;
    END IF;
    
    v_hp_levy_include := COALESCE((v_hp_policy->>'levy_include')::BOOLEAN, false);
    v_hp_levy_method := COALESCE(v_hp_policy->>'levy_calculation_method', 'merge');
    v_hp_levy_flat_enabled := COALESCE((v_hp_policy->>'levy_calc_flat_enabled')::BOOLEAN, false);
    v_hp_levy_flat_pct := COALESCE((v_hp_policy->>'levy_calc_flat_percentage')::NUMERIC, 0) / 100.0;
    v_hp_levy_slab_enabled := COALESCE((v_hp_policy->>'levy_calc_slab_enabled')::BOOLEAN, false);
    v_hp_levy_distribution := v_hp_policy->'levy_distribution';
    v_hp_ssc_include := COALESCE((v_hp_policy->>'ssc_include')::BOOLEAN, false);
    v_hp_ssc_employee := COALESCE((v_hp_policy->>'ssc_contrib_employee')::BOOLEAN, false);
    v_hp_ssc_employer := COALESCE((v_hp_policy->>'ssc_contrib_employer')::BOOLEAN, false);
    v_hp_ssc_eib := COALESCE((v_hp_policy->>'ssc_contrib_eib')::BOOLEAN, false);
    v_hp_include_severance := COALESCE((v_hp_policy->>'include_in_severance')::BOOLEAN, false);
    v_hp_min := (v_hp_policy->>'min_holiday_amount')::NUMERIC;
    v_hp_max := (v_hp_policy->>'max_holiday_amount')::NUMERIC;
    
    IF v_holiday_distribution IS NOT NULL THEN
      v_hp_eligible := false;
      v_hp_levy_include := false;
      v_hp_ssc_include := false;
      v_hp_include_severance := false;
    END IF;
    
    IF v_hp_eligible AND (v_hp_min IS NOT NULL OR v_hp_max IS NOT NULL) THEN
      IF v_hp_min IS NOT NULL AND v_holiday < v_hp_min THEN v_hp_eligible := false; END IF;
      IF v_hp_max IS NOT NULL AND v_holiday > v_hp_max THEN v_hp_eligible := false; END IF;
    END IF;
    
    v_hp_target_slot := 0;
    IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'merge' AND v_hp_levy_distribution IS NOT NULL THEN
      IF v_pay_period_code = 'W' THEN
        IF COALESCE((v_hp_levy_distribution->'weekly'->>'w4')::boolean, false) THEN v_hp_target_slot := 4;
        ELSIF COALESCE((v_hp_levy_distribution->'weekly'->>'w3')::boolean, false) THEN v_hp_target_slot := 3;
        ELSIF COALESCE((v_hp_levy_distribution->'weekly'->>'w2')::boolean, false) THEN v_hp_target_slot := 2;
        ELSIF COALESCE((v_hp_levy_distribution->'weekly'->>'w1')::boolean, false) THEN v_hp_target_slot := 1;
        ELSE v_hp_target_slot := 4;
        END IF;
      ELSIF v_pay_period_code = 'E2W' THEN
        IF COALESCE((v_hp_levy_distribution->'biweekly'->>'b2')::boolean, false) THEN v_hp_target_slot := 3;
        ELSIF COALESCE((v_hp_levy_distribution->'biweekly'->>'b1')::boolean, false) THEN v_hp_target_slot := 1;
        ELSE v_hp_target_slot := 3;
        END IF;
      ELSIF v_pay_period_code = '2M' THEN
        IF COALESCE((v_hp_levy_distribution->'semimonthly'->>'s2')::boolean, false) THEN v_hp_target_slot := 3;
        ELSIF COALESCE((v_hp_levy_distribution->'semimonthly'->>'s1')::boolean, false) THEN v_hp_target_slot := 1;
        ELSE v_hp_target_slot := 3;
        END IF;
      ELSE
        v_hp_target_slot := 0;
      END IF;
    END IF;
    
    v_bonus_eligible := v_bonus > 0;
    IF v_bonus_eligible AND (v_bp_min_bonus IS NOT NULL OR v_bp_max_bonus IS NOT NULL) THEN
      IF v_bp_min_bonus IS NOT NULL AND v_bonus < v_bp_min_bonus THEN v_bonus_eligible := false; END IF;
      IF v_bp_max_bonus IS NOT NULL AND v_bonus > v_bp_max_bonus THEN v_bonus_eligible := false; END IF;
    END IF;
    
    v_ss_wage_base := CASE WHEN v_is_december_start THEN v_taxable_wages ELSE v_total_wages - v_bonus END;
    
    v_employee_ss_base := v_taxable_wages;
    IF v_bonus_eligible AND v_bp_contrib_employee THEN v_employee_ss_base := v_employee_ss_base + v_bonus; END IF;
    IF v_holiday > 0 AND (NOT v_hp_ssc_include OR NOT v_hp_ssc_employee) THEN
      v_employee_ss_base := v_employee_ss_base - v_holiday;
    END IF;
    v_ss_insurable := LEAST(v_employee_ss_base, v_config.employee_ss_max_wage);
    
    IF NOT v_is_age_exempt_ss THEN
      v_employee_ss := ROUND(v_ss_insurable * v_config.employee_ss_rate, 2);
      v_employer_ss_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_employer THEN v_employer_ss_base := v_employer_ss_base + v_bonus; END IF;
      IF v_holiday > 0 AND (NOT v_hp_ssc_include OR NOT v_hp_ssc_employer) THEN
        v_employer_ss_base := v_employer_ss_base - v_holiday;
      END IF;
      v_employer_ss := ROUND(LEAST(v_employer_ss_base, v_config.employee_ss_max_wage) * v_config.employer_ss_rate, 2);
      v_employer_eib_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_eir THEN v_employer_eib_base := v_employer_eib_base + v_bonus; END IF;
      IF v_holiday > 0 AND (NOT v_hp_ssc_include OR NOT v_hp_ssc_eib) THEN
        v_employer_eib_base := v_employer_eib_base - v_holiday;
      END IF;
      v_employer_eib := ROUND(LEAST(v_employer_eib_base, v_config.employee_ss_max_wage) * v_config.employer_eib_rate, 2);
    ELSE
      v_employee_ss := 0; v_employer_ss := 0;
      v_employer_eib_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_eir THEN v_employer_eib_base := v_employer_eib_base + v_bonus; END IF;
      IF v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_eib THEN NULL;
      ELSIF v_holiday > 0 THEN v_employer_eib_base := v_employer_eib_base - v_holiday; END IF;
      v_employer_eib := ROUND(LEAST(v_employer_eib_base, v_config.employee_ss_max_wage) * v_config.employer_eib_rate, 2);
    END IF;
    v_employer_ss_total := v_employer_ss + v_employer_eib;
    
    v_employee_levy := 0;
    v_bonus_levy := 0;
    v_holiday_levy := 0;
    
    IF NOT v_is_age_exempt_levy THEN
      v_monthly_total_for_levy := v_week1 + v_week2 + v_week3 + v_week4 + v_week5;
      
      IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'merge' THEN
        v_monthly_total_for_levy := v_monthly_total_for_levy + v_holiday;
      ELSIF NOT v_hp_eligible OR NOT v_hp_levy_include THEN
        v_monthly_total_for_levy := v_monthly_total_for_levy + v_holiday;
      END IF;
      
      IF v_bonus_eligible AND v_bonus_include_in_levy AND v_bp_calculation_method = 'merge' THEN
        v_merged_amounts := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5, 0::NUMERIC];
        
        IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'merge' THEN
          IF v_hp_target_slot > 0 AND v_hp_target_slot <= 5 THEN
            v_merged_amounts[v_hp_target_slot] := v_merged_amounts[v_hp_target_slot] + v_holiday;
          ELSE
            v_merged_amounts[6] := v_holiday;
          END IF;
        ELSIF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'separate' THEN
          v_merged_amounts[6] := 0;
        ELSE
          IF v_hp_target_slot > 0 AND v_hp_target_slot <= 5 THEN
            v_merged_amounts[v_hp_target_slot] := v_merged_amounts[v_hp_target_slot] + v_holiday;
          ELSE
            v_merged_amounts[6] := v_holiday;
          END IF;
        END IF;
        
        IF v_pay_period_code = 'W' THEN
          IF v_bp_distribution IS NOT NULL AND v_bp_distribution->'weekly' IS NOT NULL
             AND COALESCE((v_bp_distribution->'weekly'->>'divide')::boolean, false) = false THEN
            v_merge_count := 0;
            IF COALESCE((v_bp_distribution->'weekly'->>'w1')::boolean, false) THEN v_merge_count := v_merge_count + 1; END IF;
            IF COALESCE((v_bp_distribution->'weekly'->>'w2')::boolean, false) THEN v_merge_count := v_merge_count + 1; END IF;
            IF COALESCE((v_bp_distribution->'weekly'->>'w3')::boolean, false) THEN v_merge_count := v_merge_count + 1; END IF;
            IF COALESCE((v_bp_distribution->'weekly'->>'w4')::boolean, false) THEN v_merge_count := v_merge_count + 1; END IF;
            IF v_merge_count = 0 THEN
              FOR v_i IN 1..5 LOOP v_merged_amounts[v_i] := v_merged_amounts[v_i] + ROUND(v_bonus / 5.0, 2); END LOOP;
            ELSIF v_merge_count = 1 THEN
              IF COALESCE((v_bp_distribution->'weekly'->>'w1')::boolean, false) THEN v_merged_amounts[1] := v_merged_amounts[1] + v_bonus; END IF;
              IF COALESCE((v_bp_distribution->'weekly'->>'w2')::boolean, false) THEN v_merged_amounts[2] := v_merged_amounts[2] + v_bonus; END IF;
              IF COALESCE((v_bp_distribution->'weekly'->>'w3')::boolean, false) THEN v_merged_amounts[3] := v_merged_amounts[3] + v_bonus; END IF;
              IF COALESCE((v_bp_distribution->'weekly'->>'w4')::boolean, false) THEN v_merged_amounts[4] := v_merged_amounts[4] + v_bonus; END IF;
            ELSE
              v_per_week_bonus := ROUND(v_bonus / v_merge_count, 2);
              IF COALESCE((v_bp_distribution->'weekly'->>'w1')::boolean, false) THEN v_merged_amounts[1] := v_merged_amounts[1] + v_per_week_bonus; END IF;
              IF COALESCE((v_bp_distribution->'weekly'->>'w2')::boolean, false) THEN v_merged_amounts[2] := v_merged_amounts[2] + v_per_week_bonus; END IF;
              IF COALESCE((v_bp_distribution->'weekly'->>'w3')::boolean, false) THEN v_merged_amounts[3] := v_merged_amounts[3] + v_per_week_bonus; END IF;
              IF COALESCE((v_bp_distribution->'weekly'->>'w4')::boolean, false) THEN v_merged_amounts[4] := v_merged_amounts[4] + v_per_week_bonus; END IF;
            END IF;
          ELSE
            FOR v_i IN 1..5 LOOP v_merged_amounts[v_i] := v_merged_amounts[v_i] + ROUND(v_bonus / 5.0, 2); END LOOP;
          END IF;
        ELSIF v_pay_period_code = 'E2W' THEN
          IF v_bp_distribution IS NOT NULL AND v_bp_distribution->'biweekly' IS NOT NULL
             AND COALESCE((v_bp_distribution->'biweekly'->>'divide')::boolean, false) THEN
            v_merged_amounts[1] := v_merged_amounts[1] + ROUND(v_bonus / 2.0, 2);
            v_merged_amounts[3] := v_merged_amounts[3] + ROUND(v_bonus / 2.0, 2);
          ELSIF v_bp_distribution IS NOT NULL AND COALESCE((v_bp_distribution->'biweekly'->>'b1')::boolean, false) THEN
            v_merged_amounts[1] := v_merged_amounts[1] + v_bonus;
          ELSIF v_bp_distribution IS NOT NULL AND COALESCE((v_bp_distribution->'biweekly'->>'b2')::boolean, false) THEN
            v_merged_amounts[3] := v_merged_amounts[3] + v_bonus;
          ELSE
            v_merged_amounts[1] := v_merged_amounts[1] + v_bonus;
          END IF;
        ELSE
          v_merged_amounts[1] := v_merged_amounts[1] + v_bonus;
        END IF;
        
        v_merge_total := v_merged_amounts[1] + v_merged_amounts[2] + v_merged_amounts[3] + v_merged_amounts[4] + v_merged_amounts[5] + v_merged_amounts[6];
        
        v_use_monthly_override := false;
        IF v_pay_period_code != 'M'
           AND COALESCE(v_config.levy_use_monthly_when_exceeded, false)
           AND v_merge_total > COALESCE(v_config.levy_monthly_threshold, 0)
           AND COALESCE(v_config.levy_monthly_threshold, 0) > 0 THEN
          v_use_monthly_override := true;
        END IF;
        
        IF v_use_monthly_override OR v_pay_period_code = 'M' THEN
          SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
          WHERE slab_id = v_config.levy_slab_id AND pay_period = 'M' AND is_active = true AND v_merge_total > over_amt
          ORDER BY over_amt DESC LIMIT 1;
          IF v_levy_slab IS NOT NULL THEN
            v_employee_levy := ROUND(v_levy_slab.base_amt + ((v_merge_total - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
          END IF;
        ELSE
          v_slab_code := v_pay_period_code;
          v_employee_levy := public.evaluate_levy_amounts(v_merged_amounts, v_config.levy_slab_id, v_slab_code);
        END IF;
        
      ELSIF v_bonus_eligible AND v_bonus_include_in_levy AND v_bp_calculation_method = 'separate' THEN
        IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'separate' THEN
          v_monthly_total_for_levy := v_monthly_total_for_levy - v_holiday;
        END IF;
        
        v_use_monthly_override := false;
        IF v_pay_period_code != 'M'
           AND COALESCE(v_config.levy_use_monthly_when_exceeded, false)
           AND v_monthly_total_for_levy > COALESCE(v_config.levy_monthly_threshold, 0)
           AND COALESCE(v_config.levy_monthly_threshold, 0) > 0 THEN
          v_use_monthly_override := true;
        END IF;
        
        IF v_use_monthly_override THEN
          SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
          WHERE slab_id = v_config.levy_slab_id AND pay_period = 'M' AND is_active = true AND v_monthly_total_for_levy > over_amt
          ORDER BY over_amt DESC LIMIT 1;
          IF v_levy_slab IS NOT NULL THEN
            v_employee_levy := ROUND(v_levy_slab.base_amt + ((v_monthly_total_for_levy - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
          END IF;
        ELSIF v_pay_period_code = 'M' THEN
          IF v_monthly_total_for_levy > 0 THEN
            SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
            WHERE slab_id = v_config.levy_slab_id AND pay_period = 'M' AND is_active = true AND v_monthly_total_for_levy > over_amt
            ORDER BY over_amt DESC LIMIT 1;
            IF v_levy_slab IS NOT NULL THEN
              v_employee_levy := ROUND(v_levy_slab.base_amt + ((v_monthly_total_for_levy - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
            END IF;
          END IF;
        ELSE
          v_slab_code := v_pay_period_code;
          v_amounts_array := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5];
          IF NOT (v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'separate') THEN
            IF v_hp_target_slot > 0 AND v_hp_target_slot <= 5 THEN
              v_amounts_array[v_hp_target_slot] := v_amounts_array[v_hp_target_slot] + v_holiday;
            ELSE
              v_amounts_array := v_amounts_array || v_holiday;
            END IF;
          END IF;
          v_employee_levy := public.evaluate_levy_amounts(v_amounts_array, v_config.levy_slab_id, v_slab_code);
        END IF;
        
        IF v_bonus > 0 THEN
          IF v_bp_calc_flat_enabled AND v_bonus_flat_rate > 0 THEN
            v_bonus_levy := ROUND(v_bonus * v_bonus_flat_rate, 2);
          ELSIF v_bp_calc_slab_enabled THEN
            SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
            WHERE slab_id = v_config.levy_slab_id AND pay_period = v_pay_period_code AND is_active = true AND v_bonus > over_amt
            ORDER BY over_amt DESC LIMIT 1;
            IF v_levy_slab IS NOT NULL THEN
              v_bonus_levy := ROUND(v_levy_slab.base_amt + ((v_bonus - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
            END IF;
          END IF;
          v_employee_levy := v_employee_levy + v_bonus_levy;
        END IF;
        
      ELSE
        IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'separate' THEN
          v_monthly_total_for_levy := v_monthly_total_for_levy - v_holiday;
        END IF;
        
        v_use_monthly_override := false;
        IF v_pay_period_code != 'M'
           AND COALESCE(v_config.levy_use_monthly_when_exceeded, false) = true
           AND v_monthly_total_for_levy > COALESCE(v_config.levy_monthly_threshold, 0)
           AND COALESCE(v_config.levy_monthly_threshold, 0) > 0 THEN
          v_use_monthly_override := true;
        END IF;
        
        IF v_use_monthly_override THEN
          SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
          WHERE slab_id = v_config.levy_slab_id AND pay_period = 'M' AND is_active = true AND v_monthly_total_for_levy > over_amt
          ORDER BY over_amt DESC LIMIT 1;
          IF v_levy_slab IS NOT NULL THEN
            v_employee_levy := ROUND(v_levy_slab.base_amt + ((v_monthly_total_for_levy - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
          END IF;
        ELSIF v_pay_period_code = 'M' THEN
          IF v_monthly_total_for_levy > 0 THEN
            SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
            WHERE slab_id = v_config.levy_slab_id AND pay_period = 'M' AND is_active = true AND v_monthly_total_for_levy > over_amt
            ORDER BY over_amt DESC LIMIT 1;
            IF v_levy_slab IS NOT NULL THEN
              v_employee_levy := ROUND(v_levy_slab.base_amt + ((v_monthly_total_for_levy - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
            END IF;
          END IF;
        ELSE
          v_slab_code := v_pay_period_code;
          v_amounts_array := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5];
          IF NOT (v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'separate') THEN
            IF v_hp_target_slot > 0 AND v_hp_target_slot <= 5 THEN
              v_amounts_array[v_hp_target_slot] := v_amounts_array[v_hp_target_slot] + v_holiday;
            ELSE
              v_amounts_array := v_amounts_array || v_holiday;
            END IF;
          END IF;
          v_employee_levy := public.evaluate_levy_amounts(v_amounts_array, v_config.levy_slab_id, v_slab_code);
        END IF;
      END IF;
      
      IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'separate' AND v_holiday > 0 THEN
        IF v_hp_levy_flat_enabled AND v_hp_levy_flat_pct > 0 THEN
          v_holiday_levy := ROUND(v_holiday * v_hp_levy_flat_pct, 2);
        ELSIF v_hp_levy_slab_enabled THEN
          SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
          WHERE slab_id = v_config.levy_slab_id AND pay_period = v_pay_period_code AND is_active = true AND v_holiday > over_amt
          ORDER BY over_amt DESC LIMIT 1;
          IF v_levy_slab IS NOT NULL THEN
            v_holiday_levy := ROUND(v_levy_slab.base_amt + ((v_holiday - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
          END IF;
        END IF;
        v_employee_levy := v_employee_levy + v_holiday_levy;
      END IF;
    END IF;
    
    v_employer_levy_base := v_taxable_wages;
    IF v_bonus_eligible AND v_bonus_include_in_levy THEN v_employer_levy_base := v_employer_levy_base + v_bonus; END IF;
    IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_levy_include) THEN
      v_employer_levy_base := v_employer_levy_base - v_holiday;
    END IF;
    v_employer_levy := ROUND(v_employer_levy_base * v_config.employer_levy_rate, 2);
    
    v_severance_base := v_taxable_wages;
    IF v_bonus_eligible AND (v_bp_include_in_severance OR v_bp_contrib_severance) THEN v_severance_base := v_severance_base + v_bonus; END IF;
    IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_include_severance) THEN
      v_severance_base := v_severance_base - v_holiday;
    END IF;
    v_employer_severance := ROUND(v_severance_base * v_config.employer_severance_rate, 2);
    
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
  
  IF v_delay_periods > 0 THEN
    v_levy_penalty_base := COALESCE(v_sum_employee_levy, 0) + COALESCE(v_sum_employer_levy, 0);
    v_levy_penalty := ROUND(
      v_levy_penalty_base * v_config.levy_penalty_initial_rate * v_initial_penalty_periods +
      v_levy_penalty_base * v_config.levy_penalty_subsequent_rate * v_subsequent_penalty_periods, 2);
    v_severance_penalty_base := COALESCE(v_sum_employer_severance, 0);
    v_severance_penalty := ROUND(
      v_severance_penalty_base * v_config.severance_penalty_initial_rate * v_initial_penalty_periods +
      v_severance_penalty_base * v_config.severance_penalty_subsequent_rate * v_subsequent_penalty_periods, 2);
    v_ss_fine_base := COALESCE(v_sum_employee_ss, 0) + COALESCE(v_sum_employer_ss, 0);
    v_ss_fine := ROUND(
      v_ss_fine_base * v_config.ss_fine_initial_rate * v_initial_penalty_periods +
      v_ss_fine_base * COALESCE(v_config.ss_fine_subsequent_rate, v_config.ss_fine_initial_rate) * v_subsequent_penalty_periods, 2);
    v_total_late_charges := v_levy_penalty + v_severance_penalty + v_ss_fine;
  END IF;
  
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
    'initialPenaltyPeriods', v_initial_penalty_periods,
    'subsequentPenaltyPeriods', v_subsequent_penalty_periods,
    'filingWindowUnit', CASE WHEN v_filing_window_unit = 1 THEN 'Months' ELSE 'Days' END,
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
      'employerSeveranceRate', v_config.employer_severance_rate
    ),
    'employees', v_employees_result,
    'totals', v_totals
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_c3_contributions(INTEGER, INTEGER, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_c3_contributions(INTEGER, INTEGER, DATE, JSONB) TO anon;
