
CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_received_date DATE,
  p_employee_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  -- Config record
  v_config RECORD;
  
  -- Rate variables
  v_ss_rate_employee NUMERIC;
  v_ss_rate_employer NUMERIC;
  v_eib_rate NUMERIC;
  v_levy_rate_employee NUMERIC;
  v_levy_rate_employer NUMERIC;
  v_severance_rate NUMERIC;
  v_max_insurable_earnings NUMERIC;
  v_eib_max_wage NUMERIC;
  v_min_age INTEGER;
  v_max_age INTEGER;
  v_min_wage NUMERIC;
  
  -- Slab variables
  v_slab RECORD;
  v_slabs JSONB;
  v_slab_count INTEGER;
  v_slab_total_employee NUMERIC;
  v_slab_total_employer NUMERIC;
  v_slab_loop RECORD;
  v_slab_applicable_wage NUMERIC;
  
  -- Filing window / penalty
  v_filing_window_unit INTEGER;
  v_filing_window_value INTEGER;
  v_penalty_initial_rate_levy NUMERIC;
  v_penalty_subsequent_rate_levy NUMERIC;
  v_penalty_initial_rate_severance NUMERIC;
  v_penalty_subsequent_rate_severance NUMERIC;
  v_ss_fine_initial_rate NUMERIC;
  v_ss_fine_subsequent_rate NUMERIC;
  v_penalty_initial_threshold INTEGER;
  v_penalty_subsequent_threshold INTEGER;
  v_filing_deadline DATE;
  v_delay_periods INTEGER;
  v_initial_penalty_periods INTEGER;
  v_subsequent_penalty_periods INTEGER;
  
  -- Bonus policy
  v_bonus_include_in_levy BOOLEAN;
  v_bonus_flat_rate NUMERIC;
  v_bonus_flat_rate_raw NUMERIC;
  v_bp_calculation_method TEXT;
  v_bp_calc_flat_enabled BOOLEAN;
  v_bp_calc_slab_enabled BOOLEAN;
  v_bp_contrib_employee BOOLEAN;
  v_bp_contrib_employer BOOLEAN;
  v_bp_contrib_eir BOOLEAN;
  v_bp_contrib_severance BOOLEAN;
  v_bp_include_in_severance BOOLEAN;
  
  -- Holiday pay policy
  v_hp_distribution_method TEXT;
  v_hp_include_in_levy BOOLEAN;
  v_hp_include_in_severance BOOLEAN;
  v_hp_contrib_employee BOOLEAN;
  v_hp_contrib_employer BOOLEAN;
  v_hp_contrib_eir BOOLEAN;
  v_hp_num_weeks INTEGER;
  v_hp_calc_flat_enabled BOOLEAN;
  v_hp_calc_flat_rate NUMERIC;
  v_hp_calc_flat_rate_raw NUMERIC;
  v_hp_calc_slab_enabled BOOLEAN;
  
  -- Due date
  v_due_date DATE;
  v_period_date DATE;
  v_days_late INTEGER;
  v_additional_30_periods INTEGER;
  v_months_late INTEGER;
  v_months_late_calendar INTEGER;
  v_due_year INTEGER;
  v_due_month INTEGER;
  v_received_year INTEGER;
  v_received_month INTEGER;
  
  -- Employee loop
  v_employee RECORD;
  v_week1 NUMERIC; v_week2 NUMERIC; v_week3 NUMERIC; v_week4 NUMERIC; v_week5 NUMERIC;
  v_bonus NUMERIC; v_holiday NUMERIC;
  v_age INTEGER;
  v_dob DATE;
  v_is_under_age BOOLEAN;
  v_is_over_age BOOLEAN;
  v_total_wages NUMERIC;
  v_bonus_ss NUMERIC;
  v_bonus_levy NUMERIC;
  v_holiday_ss NUMERIC;
  v_holiday_levy NUMERIC;
  v_holiday_severance NUMERIC;
  v_holiday_distributed BOOLEAN;
  v_hp_weeks_array NUMERIC[];
  v_hp_leftover NUMERIC;
  v_hp_per_week NUMERIC;
  v_hp_idx INTEGER;
  v_hp_existing NUMERIC;
  v_hp_space NUMERIC;
  v_weeks_array NUMERIC[];
  v_num_active_weeks INTEGER;
  v_weeks_count INTEGER;
  v_insurable_wages NUMERIC[];
  v_ss_employee NUMERIC;
  v_ss_employer NUMERIC;
  v_eib_total NUMERIC;
  v_levy_employee NUMERIC;
  v_levy_employer NUMERIC;
  v_levy_employee_bonus NUMERIC;
  v_levy_employer_bonus NUMERIC;
  v_levy_employee_holiday NUMERIC;
  v_levy_employer_holiday NUMERIC;
  v_severance NUMERIC;
  v_severance_wages NUMERIC;
  v_bonus_severance NUMERIC;
  v_bonus_ss_employee NUMERIC;
  v_bonus_ss_employer NUMERIC;
  v_bonus_eib NUMERIC;
  v_holiday_ss_employee NUMERIC;
  v_holiday_ss_employer NUMERIC;
  v_holiday_eib NUMERIC;
  v_holiday_levy_employee NUMERIC;
  v_holiday_levy_employer NUMERIC;
  v_holiday_severance_amt NUMERIC;
  v_employee_result JSONB;
  v_results JSONB := '[]'::JSONB;
  v_i INTEGER;
  v_weekly_wage NUMERIC;
  v_capped NUMERIC;
  v_eib_capped NUMERIC;
  v_ss_emp_week NUMERIC;
  v_ss_emr_week NUMERIC;
  v_eib_week NUMERIC;
  
  -- Bonus slab variables
  v_bonus_slab_employee NUMERIC;
  v_bonus_slab_employer NUMERIC;
  v_bonus_slab_loop RECORD;
  v_bonus_applicable_wage NUMERIC;
  
  -- Holiday slab variables
  v_holiday_slab_employee NUMERIC;
  v_holiday_slab_employer NUMERIC;
  v_holiday_slab_loop RECORD;
  v_holiday_applicable_wage NUMERIC;
  
  -- Sums
  v_sum_total_wages NUMERIC := 0;
  v_sum_employee_ss NUMERIC := 0;
  v_sum_employer_ss NUMERIC := 0;
  v_sum_eib NUMERIC := 0;
  v_sum_employee_levy NUMERIC := 0;
  v_sum_employer_levy NUMERIC := 0;
  v_sum_employer_severance NUMERIC := 0;
  v_employee_count INTEGER := 0;
  
  -- Penalty amounts
  v_levy_penalty_base NUMERIC;
  v_severance_penalty_base NUMERIC;
  v_ss_fine_base NUMERIC;
  v_levy_penalty NUMERIC := 0;
  v_severance_penalty NUMERIC := 0;
  v_ss_fine NUMERIC := 0;
  v_total_late_charges NUMERIC := 0;
  
  -- Weeks in month
  v_weeks_in_month INTEGER;
  v_week_start_day INTEGER;
  
BEGIN
  -- ===== LOAD CONFIG =====
  SELECT * INTO v_config
  FROM c3_config_details
  WHERE period_year = p_period_year AND period_month = p_period_month
  LIMIT 1;
  
  IF v_config IS NULL THEN
    SELECT * INTO v_config
    FROM c3_config_details
    WHERE is_default = true
    LIMIT 1;
  END IF;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('error', 'No configuration found');
  END IF;
  
  -- Extract rates
  v_ss_rate_employee := COALESCE(v_config.ss_rate_employee, 5) / 100.0;
  v_ss_rate_employer := COALESCE(v_config.ss_rate_employer, 5) / 100.0;
  v_eib_rate := COALESCE(v_config.eib_rate, 1) / 100.0;
  v_levy_rate_employee := COALESCE(v_config.levy_rate_employee, 1) / 100.0;
  v_levy_rate_employer := COALESCE(v_config.levy_rate_employer, 2) / 100.0;
  v_severance_rate := COALESCE(v_config.severance_rate, 1) / 100.0;
  v_max_insurable_earnings := COALESCE(v_config.max_insurable_earnings, 6500);
  v_eib_max_wage := COALESCE(v_config.eib_max_wage, 6500);
  v_min_age := COALESCE(v_config.min_age, 16);
  v_max_age := COALESCE(v_config.max_age, 62);
  v_min_wage := COALESCE(v_config.min_wage, 0);
  
  -- Filing & penalty config
  v_filing_window_unit := COALESCE(v_config.filing_window_unit, 1);
  v_filing_window_value := COALESCE(v_config.filing_window_value, 1);
  v_penalty_initial_rate_levy := COALESCE(v_config.penalty_initial_rate_levy, 10) / 100.0;
  v_penalty_subsequent_rate_levy := COALESCE(v_config.penalty_subsequent_rate_levy, 1) / 100.0;
  v_penalty_initial_rate_severance := COALESCE(v_config.penalty_initial_rate_severance, 10) / 100.0;
  v_penalty_subsequent_rate_severance := COALESCE(v_config.penalty_subsequent_rate_severance, 1) / 100.0;
  v_ss_fine_initial_rate := COALESCE(v_config.ss_fine_initial_rate, 5) / 100.0;
  v_ss_fine_subsequent_rate := COALESCE(v_config.ss_fine_subsequent_rate, 5) / 100.0;
  v_penalty_initial_threshold := COALESCE(v_config.penalty_initial_threshold, 1);
  v_penalty_subsequent_threshold := COALESCE(v_config.penalty_subsequent_threshold, 0);
  
  -- Bonus policy
  v_bonus_include_in_levy := v_config.bonus_include_in_levy;
  v_bonus_flat_rate_raw := v_config.bonus_flat_rate;
  v_bp_calculation_method := v_config.bp_calculation_method;
  v_bp_calc_flat_enabled := v_config.bp_calc_flat_enabled;
  v_bp_calc_slab_enabled := v_config.bp_calc_slab_enabled;
  v_bp_contrib_employee := v_config.bp_contrib_employee;
  v_bp_contrib_employer := v_config.bp_contrib_employer;
  v_bp_contrib_eir := v_config.bp_contrib_eir;
  v_bp_contrib_severance := v_config.bp_contrib_severance;
  v_bp_include_in_severance := v_config.bp_include_in_severance;
  
  -- Holiday pay policy
  v_hp_distribution_method := COALESCE(v_config.hp_distribution_method, 'even');
  v_hp_include_in_levy := COALESCE(v_config.hp_include_in_levy, true);
  v_hp_include_in_severance := COALESCE(v_config.hp_include_in_severance, true);
  v_hp_contrib_employee := COALESCE(v_config.hp_contrib_employee, true);
  v_hp_contrib_employer := COALESCE(v_config.hp_contrib_employer, true);
  v_hp_contrib_eir := COALESCE(v_config.hp_contrib_eir, true);
  v_hp_num_weeks := COALESCE(v_config.hp_num_weeks, 0);
  v_hp_calc_flat_enabled := COALESCE(v_config.hp_calc_flat_enabled, false);
  v_hp_calc_flat_rate_raw := COALESCE(v_config.hp_calc_flat_rate, 0);
  v_hp_calc_slab_enabled := COALESCE(v_config.hp_calc_slab_enabled, false);
  
  v_hp_calc_flat_rate := v_hp_calc_flat_rate_raw / 100.0;
  
  -- Week start day
  v_week_start_day := COALESCE(v_config.week_start_day, 1);
  
  -- Defaults
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
  
  -- ===== DUE DATE & FILING DEADLINE =====
  -- v_due_date = last day of the month after the period (legacy, kept for display)
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
  
  -- ===== FIXED FILING DEADLINE CALCULATION =====
  -- Compute filing deadline directly from period, NOT from v_due_date.
  -- For Feb 2025 (p_period_month=1) with filing_window=1 month:
  --   filing deadline = last day of month (1 + 1) = last day of March = March 31, 2025
  -- This avoids the double-counting bug where v_due_date already added 1 month.
  IF v_filing_window_unit = 1 THEN
    -- Months-based filing window: last day of (period_month + filing_window_value)
    -- p_period_month is 0-indexed (0=Jan, 1=Feb, etc.)
    -- Target month (1-indexed) = p_period_month + v_filing_window_value + 1
    DECLARE
      v_target_month_1indexed INTEGER;
      v_target_year INTEGER;
    BEGIN
      v_target_month_1indexed := p_period_month + v_filing_window_value + 1; -- +1 to convert from 0-indexed
      v_target_year := p_period_year;
      
      -- Handle year overflow
      WHILE v_target_month_1indexed > 12 LOOP
        v_target_month_1indexed := v_target_month_1indexed - 12;
        v_target_year := v_target_year + 1;
      END LOOP;
      
      -- Last day of the target month: first day of next month minus 1 day
      v_filing_deadline := (make_date(v_target_year, v_target_month_1indexed, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    END;
  ELSE
    -- Days-based filing window: add days to the last day of the period month
    v_period_date := (make_date(p_period_year, p_period_month + 1, 1) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    v_filing_deadline := v_period_date + v_filing_window_value;
  END IF;
  
  -- ===== LATENESS CALCULATIONS =====
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
  
  -- ===== LOAD SLABS =====
  SELECT jsonb_agg(
    jsonb_build_object(
      'min_wage', slab_min_wage,
      'max_wage', slab_max_wage,
      'employee_rate', slab_employee_rate,
      'employer_rate', slab_employer_rate
    ) ORDER BY slab_min_wage
  )
  INTO v_slabs
  FROM c3_ss_contribution_slabs
  WHERE config_id = v_config.id AND is_active = true;
  
  v_slab_count := COALESCE(jsonb_array_length(v_slabs), 0);
  
  -- ===== WEEKS IN MONTH =====
  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  SELECT count(*) INTO v_weeks_in_month
  FROM generate_series(
    v_period_date,
    (v_period_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
    '1 day'::INTERVAL
  ) d
  WHERE EXTRACT(ISODOW FROM d) = v_week_start_day;
  
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
    
    -- Age
    v_dob := NULL;
    IF v_employee->>'dateOfBirth' IS NOT NULL AND v_employee->>'dateOfBirth' != '' THEN
      BEGIN v_dob := (v_employee->>'dateOfBirth')::DATE; EXCEPTION WHEN OTHERS THEN v_dob := NULL; END;
    END IF;
    
    v_is_under_age := false;
    v_is_over_age := false;
    IF v_dob IS NOT NULL THEN
      v_age := EXTRACT(YEAR FROM age(make_date(p_period_year, p_period_month + 1, 1), v_dob))::INTEGER;
      v_is_under_age := v_age < v_min_age;
      v_is_over_age := v_age >= v_max_age;
    END IF;
    
    -- Build weeks array based on weeks in month
    v_weeks_array := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5];
    
    -- ===== HOLIDAY PAY DISTRIBUTION =====
    v_holiday_distributed := false;
    v_holiday_ss := 0;
    v_holiday_levy := 0;
    v_holiday_severance := 0;
    v_holiday_ss_employee := 0;
    v_holiday_ss_employer := 0;
    v_holiday_eib := 0;
    v_holiday_levy_employee := 0;
    v_holiday_levy_employer := 0;
    v_holiday_severance_amt := 0;
    
    IF v_holiday > 0 AND v_hp_distribution_method = 'even' THEN
      v_hp_weeks_array := v_weeks_array;
      v_num_active_weeks := 0;
      FOR v_i IN 1..v_weeks_in_month LOOP
        IF v_hp_weeks_array[v_i] > 0 THEN
          v_num_active_weeks := v_num_active_weeks + 1;
        END IF;
      END LOOP;
      
      IF v_num_active_weeks > 0 THEN
        IF v_hp_num_weeks > 0 AND v_hp_num_weeks < v_num_active_weeks THEN
          v_num_active_weeks := v_hp_num_weeks;
        END IF;
        
        v_hp_per_week := ROUND(v_holiday / v_num_active_weeks, 2);
        v_hp_leftover := v_holiday - (v_hp_per_week * v_num_active_weeks);
        v_hp_idx := 0;
        
        FOR v_i IN 1..v_weeks_in_month LOOP
          IF v_weeks_array[v_i] > 0 AND v_hp_idx < v_num_active_weeks THEN
            v_hp_existing := v_weeks_array[v_i];
            v_hp_space := v_max_insurable_earnings - v_hp_existing;
            
            IF v_hp_idx = v_num_active_weeks - 1 THEN
              v_weeks_array[v_i] := v_hp_existing + LEAST(v_hp_per_week + v_hp_leftover, GREATEST(v_hp_space, 0));
            ELSE
              v_weeks_array[v_i] := v_hp_existing + LEAST(v_hp_per_week, GREATEST(v_hp_space, 0));
            END IF;
            v_hp_idx := v_hp_idx + 1;
          END IF;
        END LOOP;
        v_holiday_distributed := true;
      END IF;
    END IF;
    
    v_total_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5 + v_bonus + v_holiday;
    
    -- ===== BONUS POLICY =====
    v_bonus_ss := 0;
    v_bonus_levy := 0;
    v_bonus_severance := 0;
    v_bonus_ss_employee := 0;
    v_bonus_ss_employer := 0;
    v_bonus_eib := 0;
    v_levy_employee_bonus := 0;
    v_levy_employer_bonus := 0;
    
    IF v_bonus > 0 THEN
      IF v_bp_calculation_method = 'merge' AND NOT v_holiday_distributed THEN
        v_num_active_weeks := 0;
        FOR v_i IN 1..v_weeks_in_month LOOP
          IF v_weeks_array[v_i] > 0 THEN v_num_active_weeks := v_num_active_weeks + 1; END IF;
        END LOOP;
        IF v_num_active_weeks > 0 THEN
          v_hp_per_week := ROUND(v_bonus / v_num_active_weeks, 2);
          v_hp_leftover := v_bonus - (v_hp_per_week * v_num_active_weeks);
          v_hp_idx := 0;
          FOR v_i IN 1..v_weeks_in_month LOOP
            IF v_weeks_array[v_i] > 0 AND v_hp_idx < v_num_active_weeks THEN
              IF v_hp_idx = v_num_active_weeks - 1 THEN
                v_weeks_array[v_i] := v_weeks_array[v_i] + v_hp_per_week + v_hp_leftover;
              ELSE
                v_weeks_array[v_i] := v_weeks_array[v_i] + v_hp_per_week;
              END IF;
              v_hp_idx := v_hp_idx + 1;
            END IF;
          END LOOP;
        END IF;
        v_bonus_ss := 0;
      ELSIF v_bp_calculation_method = 'separate' THEN
        IF NOT v_is_under_age AND NOT v_is_over_age THEN
          IF v_bp_calc_slab_enabled AND v_slab_count > 0 THEN
            v_bonus_slab_employee := 0;
            v_bonus_slab_employer := 0;
            FOR v_bonus_slab_loop IN
              SELECT * FROM jsonb_to_recordset(v_slabs) AS x(min_wage NUMERIC, max_wage NUMERIC, employee_rate NUMERIC, employer_rate NUMERIC)
            LOOP
              v_bonus_applicable_wage := LEAST(v_bonus, v_bonus_slab_loop.max_wage) - v_bonus_slab_loop.min_wage;
              IF v_bonus_applicable_wage > 0 THEN
                v_bonus_slab_employee := v_bonus_slab_employee + ROUND(v_bonus_applicable_wage * (v_bonus_slab_loop.employee_rate / 100.0), 2);
                v_bonus_slab_employer := v_bonus_slab_employer + ROUND(v_bonus_applicable_wage * (v_bonus_slab_loop.employer_rate / 100.0), 2);
              END IF;
            END LOOP;
            v_bonus_ss_employee := v_bonus_slab_employee;
            v_bonus_ss_employer := v_bonus_slab_employer;
          ELSIF v_bp_calc_flat_enabled AND v_bonus_flat_rate > 0 THEN
            IF v_bp_contrib_employee THEN v_bonus_ss_employee := ROUND(v_bonus * v_bonus_flat_rate, 2); END IF;
            IF v_bp_contrib_employer THEN v_bonus_ss_employer := ROUND(v_bonus * v_bonus_flat_rate, 2); END IF;
          ELSE
            IF v_bp_contrib_employee THEN v_bonus_ss_employee := ROUND(v_bonus * v_ss_rate_employee, 2); END IF;
            IF v_bp_contrib_employer THEN v_bonus_ss_employer := ROUND(v_bonus * v_ss_rate_employer, 2); END IF;
          END IF;
          IF v_bp_contrib_eir THEN v_bonus_eib := ROUND(v_bonus * v_eib_rate, 2); END IF;
        END IF;
        v_bonus_ss := v_bonus_ss_employee + v_bonus_ss_employer + v_bonus_eib;
        IF v_bp_contrib_severance OR v_bp_include_in_severance THEN
          v_bonus_severance := ROUND(v_bonus * v_severance_rate, 2);
        END IF;
      END IF;
      IF v_bonus_include_in_levy THEN
        v_levy_employee_bonus := ROUND(v_bonus * v_levy_rate_employee, 2);
        v_levy_employer_bonus := ROUND(v_bonus * v_levy_rate_employer, 2);
        v_bonus_levy := v_levy_employee_bonus + v_levy_employer_bonus;
      END IF;
    END IF;
    
    -- ===== HOLIDAY PAY SEPARATE CONTRIBUTIONS =====
    IF v_holiday > 0 AND NOT v_holiday_distributed THEN
      IF NOT v_is_under_age AND NOT v_is_over_age THEN
        IF v_hp_calc_slab_enabled AND v_slab_count > 0 THEN
          v_holiday_slab_employee := 0;
          v_holiday_slab_employer := 0;
          FOR v_holiday_slab_loop IN
            SELECT * FROM jsonb_to_recordset(v_slabs) AS x(min_wage NUMERIC, max_wage NUMERIC, employee_rate NUMERIC, employer_rate NUMERIC)
          LOOP
            v_holiday_applicable_wage := LEAST(v_holiday, v_holiday_slab_loop.max_wage) - v_holiday_slab_loop.min_wage;
            IF v_holiday_applicable_wage > 0 THEN
              v_holiday_slab_employee := v_holiday_slab_employee + ROUND(v_holiday_applicable_wage * (v_holiday_slab_loop.employee_rate / 100.0), 2);
              v_holiday_slab_employer := v_holiday_slab_employer + ROUND(v_holiday_applicable_wage * (v_holiday_slab_loop.employer_rate / 100.0), 2);
            END IF;
          END LOOP;
          v_holiday_ss_employee := v_holiday_slab_employee;
          v_holiday_ss_employer := v_holiday_slab_employer;
        ELSIF v_hp_calc_flat_enabled AND v_hp_calc_flat_rate > 0 THEN
          IF v_hp_contrib_employee THEN v_holiday_ss_employee := ROUND(v_holiday * v_hp_calc_flat_rate, 2); END IF;
          IF v_hp_contrib_employer THEN v_holiday_ss_employer := ROUND(v_holiday * v_hp_calc_flat_rate, 2); END IF;
        ELSE
          IF v_hp_contrib_employee THEN v_holiday_ss_employee := ROUND(v_holiday * v_ss_rate_employee, 2); END IF;
          IF v_hp_contrib_employer THEN v_holiday_ss_employer := ROUND(v_holiday * v_ss_rate_employer, 2); END IF;
        END IF;
        IF v_hp_contrib_eir THEN v_holiday_eib := ROUND(v_holiday * v_eib_rate, 2); END IF;
      END IF;
      v_holiday_ss := v_holiday_ss_employee + v_holiday_ss_employer + v_holiday_eib;
      IF v_hp_include_in_levy THEN
        v_holiday_levy_employee := ROUND(v_holiday * v_levy_rate_employee, 2);
        v_holiday_levy_employer := ROUND(v_holiday * v_levy_rate_employer, 2);
        v_holiday_levy := v_holiday_levy_employee + v_holiday_levy_employer;
      END IF;
      IF v_hp_include_in_severance THEN
        v_holiday_severance_amt := ROUND(v_holiday * v_severance_rate, 2);
        v_holiday_severance := v_holiday_severance_amt;
      END IF;
    END IF;
    
    -- ===== WEEKLY SS/EIB CALCULATIONS =====
    v_ss_employee := 0;
    v_ss_employer := 0;
    v_eib_total := 0;
    v_insurable_wages := ARRAY[]::NUMERIC[];
    
    FOR v_i IN 1..v_weeks_in_month LOOP
      v_weekly_wage := COALESCE(v_weeks_array[v_i], 0);
      
      IF v_weekly_wage > 0 AND NOT v_is_under_age AND NOT v_is_over_age THEN
        v_capped := LEAST(v_weekly_wage, v_max_insurable_earnings);
        v_eib_capped := LEAST(v_weekly_wage, v_eib_max_wage);
        v_insurable_wages := array_append(v_insurable_wages, v_capped);
        
        IF v_slab_count > 0 THEN
          v_slab_total_employee := 0;
          v_slab_total_employer := 0;
          FOR v_slab_loop IN
            SELECT * FROM jsonb_to_recordset(v_slabs) AS x(min_wage NUMERIC, max_wage NUMERIC, employee_rate NUMERIC, employer_rate NUMERIC)
          LOOP
            v_slab_applicable_wage := LEAST(v_capped, v_slab_loop.max_wage) - v_slab_loop.min_wage;
            IF v_slab_applicable_wage > 0 THEN
              v_slab_total_employee := v_slab_total_employee + ROUND(v_slab_applicable_wage * (v_slab_loop.employee_rate / 100.0), 2);
              v_slab_total_employer := v_slab_total_employer + ROUND(v_slab_applicable_wage * (v_slab_loop.employer_rate / 100.0), 2);
            END IF;
          END LOOP;
          v_ss_emp_week := v_slab_total_employee;
          v_ss_emr_week := v_slab_total_employer;
        ELSE
          v_ss_emp_week := ROUND(v_capped * v_ss_rate_employee, 2);
          v_ss_emr_week := ROUND(v_capped * v_ss_rate_employer, 2);
        END IF;
        
        v_eib_week := ROUND(v_eib_capped * v_eib_rate, 2);
        v_ss_employee := v_ss_employee + v_ss_emp_week;
        v_ss_employer := v_ss_employer + v_ss_emr_week;
        v_eib_total := v_eib_total + v_eib_week;
      ELSE
        v_insurable_wages := array_append(v_insurable_wages, 0::NUMERIC);
      END IF;
    END LOOP;
    
    -- Add separate bonus & holiday SS
    v_ss_employee := v_ss_employee + v_bonus_ss_employee + v_holiday_ss_employee;
    v_ss_employer := v_ss_employer + v_bonus_ss_employer + v_holiday_ss_employer;
    v_eib_total := v_eib_total + v_bonus_eib + v_holiday_eib;
    
    -- ===== LEVY =====
    v_levy_employee := ROUND(v_total_wages * v_levy_rate_employee, 2);
    v_levy_employer := ROUND(v_total_wages * v_levy_rate_employer, 2);
    
    IF NOT v_bonus_include_in_levy AND v_bonus > 0 THEN
      v_levy_employee := ROUND((v_total_wages - v_bonus) * v_levy_rate_employee, 2);
      v_levy_employer := ROUND((v_total_wages - v_bonus) * v_levy_rate_employer, 2);
    END IF;
    
    IF NOT v_hp_include_in_levy AND v_holiday > 0 THEN
      v_levy_employee := ROUND((v_total_wages - v_holiday - (CASE WHEN NOT v_bonus_include_in_levy THEN v_bonus ELSE 0 END)) * v_levy_rate_employee, 2);
      v_levy_employer := ROUND((v_total_wages - v_holiday - (CASE WHEN NOT v_bonus_include_in_levy THEN v_bonus ELSE 0 END)) * v_levy_rate_employer, 2);
    END IF;
    
    v_levy_employee := v_levy_employee + v_levy_employee_bonus + v_holiday_levy_employee;
    v_levy_employer := v_levy_employer + v_levy_employer_bonus + v_holiday_levy_employer;
    
    -- ===== SEVERANCE =====
    v_severance_wages := v_total_wages;
    IF NOT v_bp_include_in_severance AND NOT v_bp_contrib_severance THEN
      v_severance_wages := v_severance_wages - v_bonus;
    END IF;
    IF NOT v_hp_include_in_severance THEN
      v_severance_wages := v_severance_wages - v_holiday;
    END IF;
    v_severance := ROUND(GREATEST(v_severance_wages, 0) * v_severance_rate, 2) + v_bonus_severance + v_holiday_severance_amt;
    
    -- Sums
    v_sum_total_wages := v_sum_total_wages + v_total_wages;
    v_sum_employee_ss := v_sum_employee_ss + v_ss_employee;
    v_sum_employer_ss := v_sum_employer_ss + v_ss_employer + v_eib_total;
    v_sum_eib := v_sum_eib + v_eib_total;
    v_sum_employee_levy := v_sum_employee_levy + v_levy_employee;
    v_sum_employer_levy := v_sum_employer_levy + v_levy_employer;
    v_sum_employer_severance := v_sum_employer_severance + v_severance;
    v_employee_count := v_employee_count + 1;
    
    -- Build result
    v_employee_result := jsonb_build_object(
      'ssn', COALESCE(v_employee->>'ssn', ''),
      'name', COALESCE(v_employee->>'name', ''),
      'dateOfBirth', COALESCE(v_employee->>'dateOfBirth', ''),
      'isUnderAge', v_is_under_age,
      'isOverAge', v_is_over_age,
      'age', CASE WHEN v_dob IS NOT NULL THEN v_age ELSE NULL END,
      'weeklyWages', to_jsonb(v_weeks_array[1:v_weeks_in_month]),
      'insuredEarnings', to_jsonb(v_insurable_wages),
      'totalWages', ROUND(v_total_wages, 2),
      'bonus', v_bonus,
      'holiday', v_holiday,
      'holidayDistributed', v_holiday_distributed,
      'ssEmployee', ROUND(v_ss_employee, 2),
      'ssEmployer', ROUND(v_ss_employer, 2),
      'eib', ROUND(v_eib_total, 2),
      'levyEmployee', ROUND(v_levy_employee, 2),
      'levyEmployer', ROUND(v_levy_employer, 2),
      'severance', ROUND(v_severance, 2),
      'bonusSS', ROUND(v_bonus_ss, 2),
      'bonusLevy', ROUND(v_bonus_levy, 2),
      'bonusSeverance', ROUND(v_bonus_severance, 2),
      'bonusSSEmployee', ROUND(v_bonus_ss_employee, 2),
      'bonusSSEmployer', ROUND(v_bonus_ss_employer, 2),
      'bonusEIB', ROUND(v_bonus_eib, 2),
      'holidaySS', ROUND(v_holiday_ss, 2),
      'holidayLevy', ROUND(v_holiday_levy, 2),
      'holidaySeverance', ROUND(v_holiday_severance, 2),
      'holidaySSEmployee', ROUND(v_holiday_ss_employee, 2),
      'holidaySSEmployer', ROUND(v_holiday_ss_employer, 2),
      'holidayEIB', ROUND(v_holiday_eib, 2),
      'holidayLevyEmployee', ROUND(v_holiday_levy_employee, 2),
      'holidayLevyEmployer', ROUND(v_holiday_levy_employer, 2),
      'holidaySeveranceAmt', ROUND(v_holiday_severance_amt, 2)
    );
    v_results := v_results || v_employee_result;
  END LOOP;
  
  -- ===== PENALTY CALCULATIONS =====
  v_levy_penalty_base := ROUND(v_sum_employee_levy + v_sum_employer_levy, 2);
  v_severance_penalty_base := ROUND(v_sum_employer_severance, 2);
  v_ss_fine_base := ROUND(v_sum_employee_ss + v_sum_employer_ss, 2);
  
  IF v_levy_penalty_base > 0 AND v_delay_periods > 0 THEN
    v_levy_penalty := ROUND(
      v_levy_penalty_base * v_penalty_initial_rate_levy * v_initial_penalty_periods +
      v_levy_penalty_base * v_penalty_subsequent_rate_levy * v_subsequent_penalty_periods, 2
    );
  END IF;
  
  IF v_severance_penalty_base > 0 AND v_delay_periods > 0 THEN
    v_severance_penalty := ROUND(
      v_severance_penalty_base * v_penalty_initial_rate_severance * v_initial_penalty_periods +
      v_severance_penalty_base * v_penalty_subsequent_rate_severance * v_subsequent_penalty_periods, 2
    );
  END IF;
  
  IF v_ss_fine_base > 0 AND v_delay_periods > 0 THEN
    v_ss_fine := ROUND(
      v_ss_fine_base * v_ss_fine_initial_rate * v_initial_penalty_periods +
      v_ss_fine_base * v_ss_fine_subsequent_rate * v_subsequent_penalty_periods, 2
    );
  END IF;
  
  v_total_late_charges := ROUND(v_levy_penalty + v_severance_penalty + v_ss_fine, 2);
  
  RETURN jsonb_build_object(
    'employees', v_results,
    'summary', jsonb_build_object(
      'totalEmployees', v_employee_count,
      'totalWages', ROUND(v_sum_total_wages, 2),
      'employeeSocialSecurity', ROUND(v_sum_employee_ss, 2),
      'employerSocialSecurity', ROUND(v_sum_employer_ss - v_sum_eib, 2),
      'employerInjuryBenefit', ROUND(v_sum_eib, 2),
      'employerSSTotalWithEIB', ROUND(v_sum_employer_ss, 2),
      'employeeLevyDue', ROUND(v_sum_employee_levy, 2),
      'employerLevyDue', ROUND(v_sum_employer_levy, 2),
      'employersOnePercentSeverancePay', ROUND(v_sum_employer_severance, 2),
      'dueDate', v_due_date,
      'filingDeadline', v_filing_deadline,
      'daysLate', v_days_late,
      'additional30DayPeriods', v_additional_30_periods,
      'monthsLateForSS', v_months_late,
      'monthsLateCalendar', v_months_late_calendar,
      'delayPeriods', v_delay_periods,
      'initialPenaltyPeriods', v_initial_penalty_periods,
      'subsequentPenaltyPeriods', v_subsequent_penalty_periods,
      'levyPenaltyBase', v_levy_penalty_base,
      'severancePenaltyBase', v_severance_penalty_base,
      'ssFineBase', v_ss_fine_base,
      'levyPenalty', v_levy_penalty,
      'severancePenalty', v_severance_penalty,
      'socialSecurityFine', v_ss_fine,
      'totalLateCharges', v_total_late_charges,
      'weeksInMonth', v_weeks_in_month,
      'filingWindowUnit', v_filing_window_unit,
      'filingWindowValue', v_filing_window_value,
      'penaltyInitialThreshold', v_penalty_initial_threshold
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_c3_contributions(INTEGER, INTEGER, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_c3_contributions(INTEGER, INTEGER, DATE, JSONB) TO anon;
