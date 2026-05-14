
CREATE OR REPLACE FUNCTION public.calculate_c3_contributions(
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_received_date DATE,
  p_employee_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_bonus_policy RECORD;
  v_period_date DATE;
  v_due_date DATE;
  v_days_late INTEGER;
  v_additional_30_periods INTEGER;
  v_months_late INTEGER;
  v_employee JSONB;
  v_employee_result JSONB;
  v_employees_result JSONB := '[]'::JSONB;
  v_totals JSONB;
  v_employee_age INTEGER;
  v_week1 NUMERIC;
  v_week2 NUMERIC;
  v_week3 NUMERIC;
  v_week4 NUMERIC;
  v_week5 NUMERIC;
  v_bonus NUMERIC;
  v_holiday NUMERIC;
  v_total_wages NUMERIC;
  v_taxable_wages NUMERIC;
  v_pay_period VARCHAR;
  v_pay_period_code VARCHAR;
  v_term_start_date DATE;
  v_date_of_birth DATE;
  v_is_december_start BOOLEAN;
  v_ss_wage_base NUMERIC;
  v_ss_insurable NUMERIC;
  v_employee_ss NUMERIC;
  v_employer_ss NUMERIC;
  v_employer_eib NUMERIC;
  v_employer_ss_total NUMERIC;
  v_employee_levy NUMERIC;
  v_bonus_levy NUMERIC;
  v_employer_levy NUMERIC;
  v_employer_severance NUMERIC;
  v_is_age_exempt_ss BOOLEAN;
  v_is_age_exempt_levy BOOLEAN;
  v_levy_slab RECORD;
  v_week_amount NUMERIC;
  v_week_levy NUMERIC;
  v_i INTEGER;
  v_weeks_array NUMERIC[];
  v_bonus_include_in_levy BOOLEAN;
  v_bonus_flat_rate NUMERIC;
  -- Totals
  v_sum_period_gross NUMERIC := 0;
  v_sum_taxable_wages NUMERIC := 0;
  v_sum_employee_ss NUMERIC := 0;
  v_sum_employer_ss NUMERIC := 0;
  v_sum_employee_levy NUMERIC := 0;
  v_sum_employer_levy NUMERIC := 0;
  v_sum_employer_severance NUMERIC := 0;
  -- Penalties
  v_levy_penalty NUMERIC := 0;
  v_severance_penalty NUMERIC := 0;
  v_ss_fine NUMERIC := 0;
  v_total_late_charges NUMERIC := 0;
  v_levy_penalty_base NUMERIC := 0;
  v_severance_penalty_base NUMERIC := 0;
  v_ss_fine_base NUMERIC := 0;
BEGIN
  -- 1. Calculate period date
  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  
  -- 2. Get active configuration
  SELECT * INTO v_config FROM public.get_c3_config_for_period(v_period_date);
  
  IF v_config IS NULL THEN
    RAISE EXCEPTION 'No active configuration found for period %', v_period_date;
  END IF;
  
  -- 2b. Get bonus policy (check exception first, then default)
  SELECT include_in_levy, calc_flat_percentage
  INTO v_bonus_policy
  FROM public.c3_bonus_policy_exceptions
  WHERE is_active = true
    AND v_period_date >= date_from
    AND (date_to IS NULL OR v_period_date <= date_to)
  ORDER BY date_from DESC
  LIMIT 1;
  
  IF v_bonus_policy IS NULL THEN
    SELECT include_in_levy, calc_flat_percentage
    INTO v_bonus_policy
    FROM public.c3_bonus_policy_default
    WHERE is_active = true
      AND v_period_date >= date_from
      AND (date_to IS NULL OR v_period_date <= date_to)
    ORDER BY date_from DESC
    LIMIT 1;
  END IF;
  
  v_bonus_include_in_levy := COALESCE(v_bonus_policy.include_in_levy, false);
  v_bonus_flat_rate := COALESCE(v_bonus_policy.calc_flat_percentage, 0) / 100.0;
  
  -- 3. Calculate due date
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
  
  -- 4. Calculate days late
  v_days_late := GREATEST(0, p_received_date - v_due_date);
  
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
  
  -- 5. Process each employee
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
    
    IF v_date_of_birth IS NOT NULL THEN
      v_employee_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_date_of_birth))::INTEGER;
    ELSE
      v_employee_age := 30;
    END IF;
    
    v_pay_period_code := CASE v_pay_period
      WHEN 'Weekly' THEN 'W'
      WHEN 'Bi-Weekly' THEN 'E2W'
      WHEN '2 Monthly' THEN '2M'
      WHEN 'Monthly' THEN 'M'
      ELSE 'M'
    END;
    
    v_is_december_start := v_term_start_date IS NOT NULL AND EXTRACT(MONTH FROM v_term_start_date) = 12;
    
    v_total_wages := v_week1 + v_week2 + v_week3 + v_week4 + v_week5 + v_bonus + v_holiday;
    v_taxable_wages := v_total_wages - v_bonus;
    
    v_is_age_exempt_ss := v_employee_age < v_config.min_age_ss OR v_employee_age > v_config.max_age_ss;
    v_is_age_exempt_levy := v_employee_age < v_config.min_age_levy OR v_employee_age > v_config.max_age_levy;
    
    -- SS Calculations
    v_ss_wage_base := CASE WHEN v_is_december_start THEN v_taxable_wages ELSE v_total_wages - v_bonus END;
    v_ss_insurable := LEAST(v_taxable_wages, v_config.employee_ss_max_wage);
    
    IF NOT v_is_age_exempt_ss THEN
      v_employee_ss := ROUND(v_ss_insurable * v_config.employee_ss_rate, 2);
      v_employer_ss := ROUND(LEAST(v_taxable_wages, v_config.employer_ss_max_wage) * v_config.employer_ss_rate, 2);
      v_employer_eib := ROUND(LEAST(v_taxable_wages, v_config.employer_ss_max_wage) * v_config.employer_eib_rate, 2);
    ELSE
      v_employee_ss := 0;
      v_employer_ss := 0;
      v_employer_eib := ROUND(LEAST(v_taxable_wages, v_config.employer_ss_max_wage) * v_config.employer_eib_rate, 2);
    END IF;
    v_employer_ss_total := v_employer_ss + v_employer_eib;
    
    -- Employee Levy (slab-based)
    v_employee_levy := 0;
    v_bonus_levy := 0;
    
    IF NOT v_is_age_exempt_levy THEN
      v_weeks_array := ARRAY[v_week1, v_week2, v_week3, v_week4, v_week5, v_holiday];
      
      FOR v_i IN 1..6 LOOP
        v_week_amount := v_weeks_array[v_i];
        v_week_levy := 0;
        
        IF v_week_amount > 0 THEN
          SELECT * INTO v_levy_slab
          FROM public.tb_levy_slab_details
          WHERE slab_id = v_config.levy_slab_id
            AND pay_period = v_pay_period_code
            AND is_active = true
            AND v_week_amount > over_amt
          ORDER BY over_amt DESC
          LIMIT 1;
          
          IF v_levy_slab IS NOT NULL THEN
            v_week_levy := ROUND(v_levy_slab.base_amt + ((v_week_amount - v_levy_slab.over_amt + 0.01) * v_levy_slab.tax_rate), 2);
          END IF;
        END IF;
        
        v_employee_levy := v_employee_levy + v_week_levy;
      END LOOP;
      
      -- Bonus levy: use bonus policy instead of dropped columns
      IF v_bonus > 0 AND v_bonus_include_in_levy THEN
        IF v_bonus_flat_rate > 0 THEN
          v_bonus_levy := ROUND(v_bonus * v_bonus_flat_rate, 2);
        END IF;
        v_employee_levy := v_employee_levy + v_bonus_levy;
      END IF;
    END IF;
    
    -- Employer Levy
    v_employer_levy := ROUND(v_taxable_wages * v_config.employer_levy_rate, 2);
    
    -- Employer Severance
    v_employer_severance := ROUND(v_taxable_wages * v_config.employer_severance_rate, 2);
    
    -- Build employee result
    v_employee_result := jsonb_build_object(
      'ssn', v_employee->>'ssn',
      'name', v_employee->>'name',
      'totalWages', v_total_wages,
      'taxableWages', v_taxable_wages,
      'employeeAge', v_employee_age,
      'isAgeExemptSS', v_is_age_exempt_ss,
      'isAgeExemptLevy', v_is_age_exempt_levy,
      'ssWageBase', v_ss_wage_base,
      'ssInsurable', v_ss_insurable,
      'employeeSS', v_employee_ss,
      'employerSS', v_employer_ss,
      'employerEIB', v_employer_eib,
      'employerSSTotal', v_employer_ss_total,
      'employeeLevy', v_employee_levy,
      'bonusLevy', v_bonus_levy,
      'employerLevy', v_employer_levy,
      'employerSeverance', v_employer_severance,
      'periodGross', v_total_wages,
      'totalWagesPlusEmployeeLevyPlusSS', v_total_wages + v_employee_levy + v_employee_ss,
      'employersThreePercentLevyPlusSS', v_employer_levy + v_employer_ss_total,
      'employersOnePercentSeverancePay', v_employer_severance
    );
    
    v_employees_result := v_employees_result || v_employee_result;
    
    -- Accumulate totals
    v_sum_period_gross := v_sum_period_gross + v_total_wages;
    v_sum_taxable_wages := v_sum_taxable_wages + v_taxable_wages;
    v_sum_employee_ss := v_sum_employee_ss + v_employee_ss;
    v_sum_employer_ss := v_sum_employer_ss + v_employer_ss_total;
    v_sum_employee_levy := v_sum_employee_levy + v_employee_levy;
    v_sum_employer_levy := v_sum_employer_levy + v_employer_levy;
    v_sum_employer_severance := v_sum_employer_severance + v_employer_severance;
  END LOOP;
  
  -- ===== PENALTY CALCULATIONS (CORRECTED BASE AMOUNTS) =====
  IF v_days_late > 0 THEN
    v_levy_penalty_base := COALESCE(v_sum_employee_levy, 0) + COALESCE(v_sum_employer_levy, 0);
    v_levy_penalty := ROUND(
      v_levy_penalty_base * v_config.levy_penalty_initial_rate +
      v_levy_penalty_base * v_config.levy_penalty_subsequent_rate * v_additional_30_periods,
      2
    );
    
    v_severance_penalty_base := COALESCE(v_sum_employer_severance, 0);
    v_severance_penalty := ROUND(
      v_severance_penalty_base * v_config.severance_penalty_initial_rate +
      v_severance_penalty_base * v_config.severance_penalty_subsequent_rate * v_additional_30_periods,
      2
    );
    
    v_ss_fine_base := COALESCE(v_sum_employee_ss, 0) + COALESCE(v_sum_employer_ss, 0);
    v_ss_fine := ROUND(
      v_ss_fine_base * v_config.ss_fine_initial_rate * v_months_late,
      2
    );
    
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
    'daysLate', v_days_late,
    'additional30DayPeriods', v_additional_30_periods,
    'monthsLate', v_months_late,
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
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
