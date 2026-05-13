
-- =====================================================================
-- Add new C3 configuration entries for:
--   1) Week Start Day (configurable weekday)
--   2) Filing Window (unit type + value)
--   3) Penalty/Fine Thresholds (initial + subsequent)
-- =====================================================================

-- Add new category entries to c3_calculation_config
INSERT INTO public.c3_calculation_config (config_key, config_value, config_type, category, display_name, description, display_order, is_active)
VALUES
  ('week_start_day', 1, 'days', 'filing', 'Week Start Day', 'Day of week considered the first day for C3 week calculations. 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday, 7=Sunday', 1, true),
  ('filing_window_unit', 1, 'amount', 'filing', 'Filing Window Unit', 'Unit for measuring the allowed filing window and penalty thresholds. 1=Months, 2=Days', 2, true),
  ('filing_window_value', 1, 'amount', 'filing', 'Allowed Filing Window', 'Number of months or days (depending on unit) allowed for filing after the C3 period ends. Filing received within this window incurs no penalty.', 3, true),
  ('penalty_initial_threshold', 1, 'amount', 'filing', 'Initial Penalty Threshold', 'Threshold period (in configured unit) for applying the initial penalty/fine rate. Penalties start after the filing window and the initial rate applies up to this many additional periods.', 4, true),
  ('penalty_subsequent_threshold', 12, 'amount', 'filing', 'Subsequent Penalty Threshold', 'Maximum period (in configured unit) for applying the subsequent (additional) penalty/fine rate beyond the initial threshold.', 5, true)
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================================
-- Update calculate_c3_contributions to read filing/penalty configs
-- from c3_calculation_config and use them dynamically
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_received_date DATE,
  p_employee_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
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
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'penalty_subsequent_threshold' AND is_active = true LIMIT 1), 12)::INTEGER INTO v_penalty_subsequent_threshold;

  -- ===== Compute week-start-days in the period month (configurable) =====
  -- Convert week_start_day (1=Mon..7=Sun) to PostgreSQL DOW (0=Sun,1=Mon..6=Sat)
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
    FROM public.c3_bonus_policy_default
    WHERE is_active = true
      AND v_period_date >= date_from
      AND (date_to IS NULL OR v_period_date <= date_to)
    ORDER BY date_from DESC
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
  -- The filing deadline is calculated based on the end of the period + filing window
  IF v_filing_window_unit = 1 THEN
    -- Unit = Months: deadline = end-of-period-month + filing_window_value months
    v_filing_deadline := (v_period_date + (v_filing_window_value || ' months')::INTERVAL)::DATE;
    -- Keep last day of that month as deadline
    v_filing_deadline := (date_trunc('month', v_filing_deadline) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  ELSE
    -- Unit = Days: deadline = last day of period month + filing_window_value days
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
    -- Months-based: calendar month difference
    v_months_late_calendar := GREATEST(0, (v_received_year * 12 + v_received_month) - (v_due_year * 12 + v_due_month));
    v_delay_periods := v_months_late_calendar;
  ELSE
    -- Days-based: actual days late converted to threshold periods
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
  IF v_delay_periods > 0 THEN
    v_initial_periods := LEAST(v_delay_periods, v_penalty_initial_threshold);
    v_subsequent_periods := GREATEST(0, v_delay_periods - v_penalty_initial_threshold);
    v_subsequent_periods := LEAST(v_subsequent_periods, v_penalty_subsequent_threshold);
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
    v_pay_period_code := CASE 
      WHEN v_pay_period = 'Weekly' THEN 'W'
      WHEN v_pay_period = 'Bi-Weekly' THEN 'B'
      WHEN v_pay_period = '2 Monthly' THEN 'T'
      ELSE 'M'
    END;
    
    v_term_start_date := NULL;
    v_date_of_birth := NULL;
    
    IF v_employee->>'termStartDate' IS NOT NULL AND v_employee->>'termStartDate' != '' THEN
      v_term_start_date := (v_employee->>'termStartDate')::DATE;
    END IF;
    IF v_employee->>'dateOfBirth' IS NOT NULL AND v_employee->>'dateOfBirth' != '' THEN
      v_date_of_birth := (v_employee->>'dateOfBirth')::DATE;
    END IF;
    
    v_employee_age := 0;
    IF v_date_of_birth IS NOT NULL THEN
      v_employee_age := EXTRACT(YEAR FROM age(v_period_date, v_date_of_birth))::INTEGER;
    END IF;
    
    v_is_age_exempt_ss := v_employee_age < v_config.min_age_ss OR v_employee_age >= v_config.max_age_ss;
    v_is_age_exempt_levy := v_employee_age < v_config.min_age_levy OR v_employee_age >= v_config.max_age_levy;
    
    -- ===== HOLIDAY PAY POLICY LOOKUP =====
    v_hp_policy := NULL;
    v_hp_levy_include := false;
    v_hp_levy_method := 'merge';
    v_hp_levy_flat_enabled := false;
    v_hp_levy_flat_pct := 0;
    v_hp_levy_slab_enabled := false;
    v_hp_levy_distribution := NULL;
    v_hp_ssc_include := false;
    v_hp_ssc_employee := false;
    v_hp_ssc_employer := false;
    v_hp_ssc_eib := false;
    v_hp_include_severance := false;
    v_hp_min := 0;
    v_hp_max := 999999999;
    v_hp_eligible := false;
    v_holiday_levy := 0;
    v_holiday_has_dates := false;
    v_hp_policy_type := NULL;
    v_hp_distribution_enabled := false;
    v_holiday_distribution := NULL;
    v_hp_target_slot := NULL;
    
    IF v_holiday > 0 THEN
      SELECT row_to_json(hpe.*)::jsonb INTO v_hp_policy
      FROM public.c3_holiday_pay_policy_exceptions hpe
      WHERE hpe.is_active = true
        AND hpe.override_default = true
        AND hpe.exception_month = (p_period_month + 1)
        AND hpe.year_from <= p_period_year
        AND (hpe.year_to IS NULL OR hpe.year_to >= p_period_year)
      ORDER BY hpe.date_from DESC
      LIMIT 1;
      
      IF v_hp_policy IS NULL THEN
        SELECT row_to_json(hpd.*)::jsonb INTO v_hp_policy
        FROM public.c3_holiday_pay_policy_default hpd
        WHERE hpd.is_active = true
          AND v_period_date >= hpd.date_from
          AND (hpd.date_to IS NULL OR v_period_date <= hpd.date_to)
        ORDER BY hpd.date_from DESC
        LIMIT 1;
        IF v_hp_policy IS NOT NULL THEN v_hp_policy_type := 'default'; END IF;
      ELSE
        v_hp_policy_type := 'exception';
      END IF;
      
      IF v_hp_policy IS NOT NULL THEN
        v_hp_levy_include := COALESCE((v_hp_policy->>'include_in_levy')::BOOLEAN, false);
        v_hp_levy_method := COALESCE(v_hp_policy->>'levy_calculation_method', 'merge');
        v_hp_levy_flat_enabled := COALESCE((v_hp_policy->>'calc_flat_enabled')::BOOLEAN, false);
        v_hp_levy_flat_pct := COALESCE((v_hp_policy->>'calc_flat_percentage')::NUMERIC, 0) / 100.0;
        v_hp_levy_slab_enabled := COALESCE((v_hp_policy->>'calc_slab_enabled')::BOOLEAN, false);
        v_hp_levy_distribution := v_hp_policy->'distribution';
        v_hp_ssc_include := COALESCE((v_hp_policy->>'include_in_ss')::BOOLEAN, false);
        v_hp_ssc_employee := COALESCE((v_hp_policy->>'contrib_employee')::BOOLEAN, false);
        v_hp_ssc_employer := COALESCE((v_hp_policy->>'contrib_employer')::BOOLEAN, false);
        v_hp_ssc_eib := COALESCE((v_hp_policy->>'contrib_eir')::BOOLEAN, false);
        v_hp_include_severance := COALESCE((v_hp_policy->>'include_in_severance')::BOOLEAN, false);
        v_hp_min := COALESCE((v_hp_policy->>'min_holiday_amount')::NUMERIC, 0);
        v_hp_max := COALESCE((v_hp_policy->>'max_holiday_amount')::NUMERIC, 999999999);
        v_hp_distribution_enabled := COALESCE((v_hp_policy->>'distribution_enabled')::BOOLEAN, false);
        v_hp_eligible := (v_holiday >= v_hp_min AND v_holiday <= v_hp_max);
      END IF;
    END IF;
    
    -- ===== HOLIDAY DATE DISTRIBUTION =====
    v_hol_start := NULL;
    v_hol_end := NULL;
    v_holiday_has_dates := false;
    
    IF v_employee->>'holidayNoDates' IS NOT NULL AND v_employee->>'holidayNoDates' = 'true' THEN
      v_holiday_has_dates := false;
    ELSIF v_employee->>'holidayStartDate' IS NOT NULL AND v_employee->>'holidayStartDate' != ''
      AND v_employee->>'holidayEndDate' IS NOT NULL AND v_employee->>'holidayEndDate' != '' THEN
      v_hol_start := (v_employee->>'holidayStartDate')::DATE;
      v_hol_end := (v_employee->>'holidayEndDate')::DATE;
      v_holiday_has_dates := true;
    END IF;
    
    -- Clip holiday pay to portion within the period month
    IF v_holiday_has_dates AND v_holiday > 0 AND v_hol_start IS NOT NULL AND v_hol_end IS NOT NULL THEN
      v_month_start := v_period_date;
      v_month_end := (date_trunc('month', v_period_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
      v_total_holiday_days := (v_hol_end - v_hol_start) + 1;
      IF v_total_holiday_days > 0 THEN
        v_in_month_days := GREATEST(0,
          LEAST(v_hol_end, v_month_end)::DATE - GREATEST(v_hol_start, v_month_start)::DATE + 1
        );
        IF v_in_month_days < v_total_holiday_days THEN
          v_original_holiday := v_holiday;
          v_holiday := ROUND(v_holiday * (v_in_month_days::NUMERIC / v_total_holiday_days), 2);
        END IF;
      END IF;
    END IF;
    
    -- Distribute holiday pay into weekly slots if dates provided and distribution enabled
    IF v_holiday_has_dates AND v_hp_distribution_enabled AND v_hp_eligible AND v_holiday > 0 AND v_monday_count > 0 THEN
      v_overlap_days := ARRAY[]::INTEGER[];
      v_total_overlap := 0;
      FOR v_i IN 1..v_monday_count LOOP
        v_week_start := v_mondays[v_i];
        IF v_i < v_monday_count THEN
          v_week_end := v_mondays[v_i + 1] - 1;
        ELSE
          v_week_end := (date_trunc('month', v_period_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        END IF;
        IF v_hol_start <= v_week_end AND v_hol_end >= v_week_start THEN
          v_overlap_days := v_overlap_days || GREATEST(0, LEAST(v_hol_end, v_week_end)::DATE - GREATEST(v_hol_start, v_week_start)::DATE + 1);
        ELSE
          v_overlap_days := v_overlap_days || 0;
        END IF;
        v_total_overlap := v_total_overlap + v_overlap_days[v_i];
      END LOOP;
      
      IF v_total_overlap > 0 THEN
        v_hol_distributed := ARRAY[]::NUMERIC[];
        FOR v_i IN 1..v_monday_count LOOP
          v_hol_distributed := v_hol_distributed || ROUND(v_holiday * (v_overlap_days[v_i]::NUMERIC / v_total_overlap), 2);
        END LOOP;
        
        v_holiday_distribution := jsonb_build_object(
          'week1', COALESCE(v_hol_distributed[1], 0),
          'week2', COALESCE(v_hol_distributed[2], 0),
          'week3', COALESCE(v_hol_distributed[3], 0),
          'week4', COALESCE(v_hol_distributed[4], 0),
          'week5', COALESCE(v_hol_distributed[5], 0),
          'totalDistributed', v_holiday,
          'overlapDays', to_jsonb(v_overlap_days),
          'distributed', true
        );
      END IF;
    END IF;
    
    -- Handle holiday-as-target-slot for levy merge
    IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'merge' THEN
      IF v_holiday_has_dates AND v_hp_distribution_enabled AND v_hol_distributed IS NOT NULL THEN
        NULL;
      ELSE
        IF v_hp_levy_distribution IS NOT NULL AND v_hp_levy_distribution ? 'targetSlot' THEN
          v_hp_target_slot := (v_hp_levy_distribution->>'targetSlot')::INTEGER;
        ELSE
          v_hp_target_slot := v_monday_count;
        END IF;
      END IF;
    END IF;
    
    -- Total wages
    v_total_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5 + v_bonus + v_holiday;
    v_taxable_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5 + v_holiday;
    
    -- Bonus eligibility
    v_bonus_eligible := false;
    IF v_bonus > 0 AND v_bp_found THEN
      v_bonus_eligible := true;
      IF v_bp_min_bonus IS NOT NULL AND v_bonus < v_bp_min_bonus THEN v_bonus_eligible := false; END IF;
      IF v_bp_max_bonus IS NOT NULL AND v_bonus > v_bp_max_bonus THEN v_bonus_eligible := false; END IF;
    END IF;
    
    -- SS calculations
    v_employee_ss := 0; v_employer_ss := 0; v_employer_eib := 0; v_employer_ss_total := 0;
    v_ss_wage_base := 0; v_ss_insurable := 0;
    
    IF NOT v_is_age_exempt_ss THEN
      v_employee_ss_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_employee THEN
        v_employee_ss_base := v_employee_ss_base + v_bonus;
      END IF;
      IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_employee) THEN
        v_employee_ss_base := v_employee_ss_base - v_holiday;
      END IF;
      
      v_ss_wage_base := v_employee_ss_base;
      v_ss_insurable := LEAST(v_employee_ss_base, COALESCE(v_config.employee_ss_max_wage, 6500));
      v_employee_ss := ROUND(v_ss_insurable * v_config.employee_ss_rate, 2);
      
      v_employer_ss_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_employer THEN
        v_employer_ss_base := v_employer_ss_base + v_bonus;
      END IF;
      IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_employer) THEN
        v_employer_ss_base := v_employer_ss_base - v_holiday;
      END IF;
      v_employer_ss := ROUND(LEAST(v_employer_ss_base, COALESCE(v_config.employer_ss_max_wage, v_config.employee_ss_max_wage, 6500)) * v_config.employer_ss_rate, 2);
      
      v_employer_eib_base := v_taxable_wages;
      IF v_bonus_eligible AND v_bp_contrib_eir THEN
        v_employer_eib_base := v_employer_eib_base + v_bonus;
      END IF;
      IF v_holiday > 0 AND NOT (v_hp_eligible AND v_hp_ssc_include AND v_hp_ssc_eib) THEN
        v_employer_eib_base := v_employer_eib_base - v_holiday;
      END IF;
      v_employer_eib := ROUND(LEAST(v_employer_eib_base, COALESCE(v_config.employer_eib_max_wage, v_config.employee_ss_max_wage, 6500)) * v_config.employer_eib_rate, 2);
      
      v_employer_ss_total := v_employer_ss + v_employer_eib;
    END IF;
    
    -- Levy calculations
    v_employee_levy := 0;
    v_bonus_levy := 0;
    v_holiday_levy := 0;
    
    IF NOT v_is_age_exempt_levy THEN
      -- Bonus levy (separate)
      IF v_bonus_eligible AND v_bonus_include_in_levy AND v_bp_calculation_method = 'separate' THEN
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
      
      -- Build amounts array for weekly levy
      v_amounts_array := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5];
      
      -- Merge bonus into weekly slots if merge method
      IF v_bonus_eligible AND v_bonus_include_in_levy AND v_bp_calculation_method = 'merge' THEN
        v_merge_count := 0;
        FOR v_i IN 1..5 LOOP
          IF v_amounts_array[v_i] > 0 THEN v_merge_count := v_merge_count + 1; END IF;
        END LOOP;
        IF v_merge_count > 0 THEN
          v_per_week_bonus := ROUND(v_bonus / v_merge_count, 2);
          FOR v_i IN 1..5 LOOP
            IF v_amounts_array[v_i] > 0 THEN
              v_amounts_array[v_i] := v_amounts_array[v_i] + v_per_week_bonus;
            END IF;
          END LOOP;
        END IF;
      END IF;
      
      -- Merge holiday into weekly slots if merge method
      IF v_hp_eligible AND v_hp_levy_include AND v_hp_levy_method = 'merge' AND v_holiday > 0 THEN
        IF v_holiday_has_dates AND v_hp_distribution_enabled AND v_hol_distributed IS NOT NULL THEN
          FOR v_i IN 1..LEAST(v_monday_count, 5) LOOP
            v_amounts_array[v_i] := v_amounts_array[v_i] + COALESCE(v_hol_distributed[v_i], 0);
          END LOOP;
        ELSIF v_hp_target_slot IS NOT NULL AND v_hp_target_slot >= 1 AND v_hp_target_slot <= 5 THEN
          v_amounts_array[v_hp_target_slot] := v_amounts_array[v_hp_target_slot] + v_holiday;
        ELSE
          IF v_monday_count > 0 AND v_monday_count <= 5 THEN
            v_amounts_array[v_monday_count] := v_amounts_array[v_monday_count] + v_holiday;
          END IF;
        END IF;
      END IF;
      
      -- Monthly override check
      v_monthly_total_for_levy := 0;
      FOR v_i IN 1..5 LOOP
        v_monthly_total_for_levy := v_monthly_total_for_levy + v_amounts_array[v_i];
      END LOOP;
      v_use_monthly_override := false;
      IF COALESCE(v_config.levy_use_monthly_when_exceeded, false)
         AND v_config.levy_monthly_threshold IS NOT NULL
         AND v_monthly_total_for_levy > v_config.levy_monthly_threshold THEN
        v_use_monthly_override := true;
      END IF;
      
      IF v_use_monthly_override THEN
        -- Use NWD rate for monthly override
        IF v_config.nwd_employee_levy_rate IS NOT NULL AND v_config.nwd_employee_levy_rate > 0 THEN
          v_employee_levy := v_employee_levy + ROUND(v_monthly_total_for_levy * v_config.nwd_employee_levy_rate, 2);
        ELSE
          SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
          WHERE slab_id = v_config.levy_slab_id AND pay_period = 'M' AND is_active = true AND v_monthly_total_for_levy > over_amt
          ORDER BY over_amt DESC LIMIT 1;
          IF v_levy_slab IS NOT NULL THEN
            v_employee_levy := v_employee_levy + ROUND(v_levy_slab.base_amt + ((v_monthly_total_for_levy - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
          END IF;
        END IF;
      ELSE
        -- Per-week levy calculation
        IF v_pay_period = 'Monthly' THEN
          v_slab_code := 'M';
        ELSIF v_pay_period = '2 Monthly' THEN
          v_slab_code := 'T';
        ELSE
          v_slab_code := v_pay_period_code;
        END IF;
        
        IF v_pay_period = 'Monthly' OR v_pay_period = '2 Monthly' THEN
          v_monthly_total_for_levy := 0;
          FOR v_i IN 1..5 LOOP
            v_monthly_total_for_levy := v_monthly_total_for_levy + v_amounts_array[v_i];
          END LOOP;
          IF v_monthly_total_for_levy > 0 THEN
            SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
            WHERE slab_id = v_config.levy_slab_id AND pay_period = v_slab_code AND is_active = true AND v_monthly_total_for_levy > over_amt
            ORDER BY over_amt DESC LIMIT 1;
            IF v_levy_slab IS NOT NULL THEN
              v_employee_levy := v_employee_levy + ROUND(v_levy_slab.base_amt + ((v_monthly_total_for_levy - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
            END IF;
          END IF;
        ELSE
          FOR v_i IN 1..5 LOOP
            v_week_amount := v_amounts_array[v_i];
            IF v_week_amount > 0 THEN
              v_week_levy := 0;
              SELECT * INTO v_levy_slab FROM public.tb_levy_slab_details
              WHERE slab_id = v_config.levy_slab_id AND pay_period = v_slab_code AND is_active = true AND v_week_amount > over_amt
              ORDER BY over_amt DESC LIMIT 1;
              IF v_levy_slab IS NOT NULL THEN
                v_week_levy := ROUND(v_levy_slab.base_amt + ((v_week_amount - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
              END IF;
              v_employee_levy := v_employee_levy + v_week_levy;
            END IF;
          END LOOP;
        END IF;
      END IF;
      
      -- ===== HOLIDAY LEVY (separate method) =====
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

GRANT EXECUTE ON FUNCTION public.calculate_c3_contributions(INTEGER, INTEGER, DATE, JSONB) TO authenticated;

-- =====================================================================
-- RPC to get filing/penalty config for frontend admin display
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_c3_filing_config()
RETURNS TABLE(
  config_key TEXT,
  config_value NUMERIC,
  display_name TEXT,
  description TEXT,
  config_type TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.config_key::TEXT, c.config_value, c.display_name::TEXT, c.description::TEXT, c.config_type::TEXT
  FROM public.c3_calculation_config c
  WHERE c.category = 'filing' AND c.is_active = true
  ORDER BY c.display_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_c3_filing_config() TO authenticated;

-- =====================================================================
-- Update biweekly RPCs to use configurable week start day
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_biweekly_enabled_weeks(
  p_year integer,
  p_month integer
)
RETURNS boolean[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean[] := ARRAY[false, false, false, false, false];
  v_first_target_of_year date;
  v_first_target_of_month date;
  v_day date;
  v_target_day date;
  v_idx integer := 0;
  v_seq integer;
  v_week_start_day integer;
  v_target_dow integer;
BEGIN
  -- Read configurable week start day
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'week_start_day' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_week_start_day;
  v_target_dow := CASE WHEN v_week_start_day = 7 THEN 0 ELSE v_week_start_day END;

  -- Find first target weekday of the year
  v_day := make_date(p_year, 1, 1);
  WHILE EXTRACT(DOW FROM v_day)::INTEGER != v_target_dow LOOP
    v_day := v_day + 1;
  END LOOP;
  v_first_target_of_year := v_day;

  -- Find first target weekday of the month
  v_day := make_date(p_year, p_month, 1);
  WHILE EXTRACT(DOW FROM v_day)::INTEGER != v_target_dow LOOP
    v_day := v_day + 1;
  END LOOP;

  -- Iterate target weekdays in this month
  v_target_day := v_day;
  WHILE EXTRACT(month FROM v_target_day) = p_month AND v_idx < 5 LOOP
    v_seq := ((v_target_day - v_first_target_of_year) / 7) + 1;
    v_result[v_idx + 1] := (v_seq % 2 = 0);
    v_idx := v_idx + 1;
    v_target_day := v_target_day + 7;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_biweekly_valid_weeks(p_year integer)
RETURNS TABLE(week_number integer, week_start date, week_end date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day date;
  v_seq integer := 0;
  v_week_start_day integer;
  v_target_dow integer;
BEGIN
  -- Read configurable week start day
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'week_start_day' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_week_start_day;
  v_target_dow := CASE WHEN v_week_start_day = 7 THEN 0 ELSE v_week_start_day END;

  v_day := make_date(p_year, 1, 1);
  WHILE EXTRACT(DOW FROM v_day)::INTEGER != v_target_dow LOOP
    v_day := v_day + 1;
  END LOOP;

  WHILE EXTRACT(year FROM v_day) = p_year LOOP
    v_seq := v_seq + 1;
    IF v_seq % 2 = 0 THEN
      week_number := v_seq;
      week_start := v_day;
      week_end := (v_day + '6 days'::interval)::date;
      RETURN NEXT;
    END IF;
    v_day := v_day + 7;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_biweekly_week(
  p_year integer,
  p_month integer,
  p_week_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_target_of_year date;
  v_first_target_of_month date;
  v_target_monday date;
  v_day date;
  v_seq integer;
  v_week_start_day integer;
  v_target_dow integer;
BEGIN
  SELECT COALESCE((SELECT config_value FROM public.c3_calculation_config WHERE config_key = 'week_start_day' AND is_active = true LIMIT 1), 1)::INTEGER INTO v_week_start_day;
  v_target_dow := CASE WHEN v_week_start_day = 7 THEN 0 ELSE v_week_start_day END;

  v_day := make_date(p_year, 1, 1);
  WHILE EXTRACT(DOW FROM v_day)::INTEGER != v_target_dow LOOP
    v_day := v_day + 1;
  END LOOP;
  v_first_target_of_year := v_day;

  v_day := make_date(p_year, p_month, 1);
  WHILE EXTRACT(DOW FROM v_day)::INTEGER != v_target_dow LOOP
    v_day := v_day + 1;
  END LOOP;
  v_first_target_of_month := v_day;

  v_target_monday := v_first_target_of_month + (p_week_index * 7);

  IF EXTRACT(month FROM v_target_monday) != p_month THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Week index %s does not exist in %s/%s', p_week_index, p_year, p_month),
      'monday_number', null
    );
  END IF;

  v_seq := ((v_target_monday - v_first_target_of_year) / 7) + 1;

  RETURN jsonb_build_object(
    'valid', (v_seq % 2 = 0),
    'monday_number', v_seq,
    'monday_date', v_target_monday::text,
    'error', CASE WHEN v_seq % 2 != 0
      THEN format('Week #%s in %s is not a valid bi-weekly payment week. Only even-numbered weeks are allowed.', v_seq, p_year)
      ELSE null
    END
  );
END;
$$;
