-- Enhance income-code policy lookup with effective calculation fields used by C3 wrapper engine
CREATE OR REPLACE FUNCTION public.get_income_code_policy_for_period(
  p_income_code_id uuid,
  p_period_year integer,
  p_period_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v_period_date date;
  v_policy record;
  v_exception record;
  v_effective_calculation_method text;
  v_effective_calc_flat_enabled boolean;
  v_effective_calc_flat_percentage numeric;
  v_effective_calc_slab_enabled boolean;
  v_effective_distribution jsonb;
BEGIN
  v_period_date := make_date(p_period_year, p_period_month + 1, 1);

  SELECT * INTO v_policy
  FROM public.c3_income_code_policy_default
  WHERE income_code_id = p_income_code_id
    AND is_active = true
    AND date_from::date <= v_period_date
    AND (date_to IS NULL OR date_to::date >= v_period_date)
  ORDER BY date_from DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'error', 'No active policy configured for this income code and period'
    );
  END IF;

  SELECT * INTO v_exception
  FROM public.c3_income_code_policy_exceptions
  WHERE income_code_id = p_income_code_id
    AND is_active = true
    AND date_from::date <= v_period_date
    AND (date_to IS NULL OR date_to::date >= v_period_date)
    AND exception_month = EXTRACT(MONTH FROM v_period_date)::int
    AND year_from <= EXTRACT(YEAR FROM v_period_date)::int
    AND (year_to IS NULL OR year_to >= EXTRACT(YEAR FROM v_period_date)::int)
  ORDER BY date_from DESC
  LIMIT 1;

  IF v_policy.date_entry_mode = 'no_dates' THEN
    v_effective_calculation_method := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.calculation_method::text, v_policy.calculation_method::text, 'merge')
      ELSE COALESCE(v_policy.calculation_method::text, 'merge')
    END;

    v_effective_calc_flat_enabled := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.calc_flat_enabled, v_policy.calc_flat_enabled, false)
      ELSE COALESCE(v_policy.calc_flat_enabled, false)
    END;

    v_effective_calc_flat_percentage := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.calc_flat_percentage, v_policy.calc_flat_percentage, 0)
      ELSE COALESCE(v_policy.calc_flat_percentage, 0)
    END;

    v_effective_calc_slab_enabled := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.calc_slab_enabled, v_policy.calc_slab_enabled, false)
      ELSE COALESCE(v_policy.calc_slab_enabled, false)
    END;

    v_effective_distribution := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.distribution::jsonb, v_policy.distribution::jsonb, '{}'::jsonb)
      ELSE COALESCE(v_policy.distribution::jsonb, '{}'::jsonb)
    END;
  ELSE
    v_effective_calculation_method := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.levy_calculation_method::text, v_policy.levy_calculation_method::text, 'separate')
      ELSE COALESCE(v_policy.levy_calculation_method::text, 'separate')
    END;

    v_effective_calc_flat_enabled := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.levy_calc_flat_enabled, v_policy.levy_calc_flat_enabled, false)
      ELSE COALESCE(v_policy.levy_calc_flat_enabled, false)
    END;

    v_effective_calc_flat_percentage := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.levy_calc_flat_percentage, v_policy.levy_calc_flat_percentage, 0)
      ELSE COALESCE(v_policy.levy_calc_flat_percentage, 0)
    END;

    v_effective_calc_slab_enabled := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.levy_calc_slab_enabled, v_policy.levy_calc_slab_enabled, false)
      ELSE COALESCE(v_policy.levy_calc_slab_enabled, false)
    END;

    v_effective_distribution := CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.levy_distribution::jsonb, v_policy.levy_distribution::jsonb, '{}'::jsonb)
      ELSE COALESCE(v_policy.levy_distribution::jsonb, '{}'::jsonb)
    END;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'policy_id', v_policy.id,
    'date_entry_mode', v_policy.date_entry_mode,
    'policy_type', v_policy.policy_type,
    'has_exception', v_exception.id IS NOT NULL,
    'exception_id', v_exception.id,
    'levy_include', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.levy_include, v_exception.include_in_levy, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.include_in_levy, false)
      ELSE COALESCE(v_policy.levy_include, false)
    END,
    'ssc_contrib_employee', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.ssc_contrib_employee, v_exception.contrib_employee, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.contrib_employee, false)
      ELSE COALESCE(v_policy.ssc_contrib_employee, false)
    END,
    'ssc_contrib_employer', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.ssc_contrib_employer, v_exception.contrib_employer, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.contrib_employer, false)
      ELSE COALESCE(v_policy.ssc_contrib_employer, false)
    END,
    'contrib_eib', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.ssc_contrib_eib, v_exception.contrib_eir, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.contrib_eir, false)
      ELSE COALESCE(v_policy.ssc_contrib_eib, false)
    END,
    'include_in_severance', CASE
      WHEN v_exception.id IS NOT NULL AND v_exception.override_default
        THEN COALESCE(v_exception.include_in_severance, false)
      WHEN v_policy.date_entry_mode = 'no_dates' THEN COALESCE(v_policy.include_in_severance, false)
      ELSE false
    END,
    'calculation_method', COALESCE(v_effective_calculation_method, 'separate'),
    'calc_flat_enabled', COALESCE(v_effective_calc_flat_enabled, false),
    'calc_flat_percentage', COALESCE(v_effective_calc_flat_percentage, 0),
    'calc_slab_enabled', COALESCE(v_effective_calc_slab_enabled, false),
    'distribution', COALESCE(v_effective_distribution, '{}'::jsonb),
    'affects_last_week_payment', (
      v_policy.date_entry_mode = 'no_dates'
      AND COALESCE(v_effective_calculation_method, 'separate') = 'merge'
    )
  );
END;
$function$;

-- Rework wrapper calculation so merge-style Other Payments feed the wage base (last week) before statutory recalculation.
CREATE OR REPLACE FUNCTION public.calculate_c3_contributions_with_other_payments(
  p_period_year integer,
  p_period_month integer,
  p_received_date date,
  p_employee_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_base jsonb;
  v_period_date date;
  v_config record;

  v_input_employees jsonb := COALESCE(p_employee_data, '[]'::jsonb);
  v_transformed_employees jsonb := '[]'::jsonb;
  v_employees jsonb;
  v_totals jsonb;

  v_i integer;
  v_j integer;

  v_input_employee jsonb;
  v_transformed_employee jsonb;
  v_base_employee jsonb;
  v_other_payments jsonb;
  v_payment jsonb;
  v_calc jsonb;
  v_policy jsonb;

  v_income_code_id_text text;
  v_code_label text;
  v_amount_text text;
  v_payment_amount numeric;
  v_seen_codes text[];

  v_week1 numeric;
  v_week2 numeric;
  v_week3 numeric;
  v_week4 numeric;
  v_week5 numeric;
  v_target_week integer;

  v_emp_merge_amount numeric;
  v_emp_op_amount numeric;
  v_emp_op_employee_ss numeric;
  v_emp_op_employee_levy numeric;
  v_emp_op_employer_ss numeric;
  v_emp_op_employer_eib numeric;
  v_emp_op_employer_levy numeric;
  v_emp_op_employer_severance numeric;

  v_adj_total_wages numeric;
  v_adj_employee_ss numeric;
  v_adj_employee_levy numeric;
  v_adj_employer_ss numeric;
  v_adj_employer_eib numeric;
  v_adj_employer_ss_total numeric;
  v_adj_employer_levy numeric;
  v_adj_employer_severance numeric;

  v_sum_period_gross numeric;
  v_sum_employee_ss numeric;
  v_sum_employer_ss numeric;
  v_sum_employee_levy numeric;
  v_sum_employer_levy numeric;
  v_sum_employer_severance numeric;

  v_op_total_merged_amount numeric := 0;
  v_op_total_separate_amount numeric := 0;
  v_op_total_employee_ss numeric := 0;
  v_op_total_employee_levy numeric := 0;
  v_op_total_employer_ss numeric := 0;
  v_op_total_employer_eib numeric := 0;
  v_op_total_employer_levy numeric := 0;
  v_op_total_employer_severance numeric := 0;

  v_months_late integer;
  v_levy_penalty_base numeric := 0;
  v_severance_penalty_base numeric := 0;
  v_ss_fine_base numeric := 0;
  v_levy_penalty numeric := 0;
  v_severance_penalty numeric := 0;
  v_ss_fine numeric := 0;
  v_total_late_charges numeric := 0;
BEGIN
  IF jsonb_typeof(v_input_employees) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Employee payload must be a JSON array');
  END IF;

  IF jsonb_array_length(v_input_employees) = 0 THEN
    RETURN public.calculate_c3_contributions(
      p_period_year,
      p_period_month,
      p_received_date,
      v_input_employees
    );
  END IF;

  -- Pass 1: validate + merge eligible other-payments into the last week payment base.
  FOR v_i IN 0..jsonb_array_length(v_input_employees) - 1 LOOP
    v_input_employee := v_input_employees->v_i;

    v_week1 := COALESCE((v_input_employee->>'week1')::numeric, (v_input_employee->'weeklyWages'->>0)::numeric, 0);
    v_week2 := COALESCE((v_input_employee->>'week2')::numeric, (v_input_employee->'weeklyWages'->>1)::numeric, 0);
    v_week3 := COALESCE((v_input_employee->>'week3')::numeric, (v_input_employee->'weeklyWages'->>2)::numeric, 0);
    v_week4 := COALESCE((v_input_employee->>'week4')::numeric, (v_input_employee->'weeklyWages'->>3)::numeric, 0);
    v_week5 := COALESCE((v_input_employee->>'week5')::numeric, (v_input_employee->'weeklyWages'->>4)::numeric, 0);

    v_seen_codes := ARRAY[]::text[];
    v_other_payments := COALESCE(v_input_employee->'otherPayments', '[]'::jsonb);

    IF jsonb_typeof(v_other_payments) = 'array' AND jsonb_array_length(v_other_payments) > 0 THEN
      FOR v_j IN 0..jsonb_array_length(v_other_payments) - 1 LOOP
        v_payment := v_other_payments->v_j;

        v_income_code_id_text := NULLIF(TRIM(COALESCE(v_payment->>'income_code_id', '')), '');
        IF v_income_code_id_text IS NULL THEN
          CONTINUE;
        END IF;

        v_code_label := COALESCE(NULLIF(TRIM(COALESCE(v_payment->>'income_code', '')), ''), v_income_code_id_text);

        IF v_income_code_id_text = ANY(v_seen_codes) THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Duplicate income code "%s" is not allowed in Other Payments for SSN %s', v_code_label, COALESCE(v_input_employee->>'ssn', 'N/A'))
          );
        END IF;
        v_seen_codes := array_append(v_seen_codes, v_income_code_id_text);

        v_amount_text := TRIM(COALESCE(v_payment->>'amount', ''));
        IF v_amount_text = '' OR v_amount_text !~ '^\d+(\.\d+)?$' THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid amount for income code "%s". Amount must be numeric and non-negative.', v_code_label)
          );
        END IF;

        v_payment_amount := v_amount_text::numeric;
        IF v_payment_amount <= 0 THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Amount for income code "%s" must be greater than zero.', v_code_label)
          );
        END IF;

        v_policy := public.get_income_code_policy_for_period(
          v_income_code_id_text::uuid,
          p_period_year,
          p_period_month
        );

        IF v_policy IS NULL OR COALESCE((v_policy->>'found')::boolean, false) = false THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('No active policy configured for income code "%s" in selected period.', v_code_label)
          );
        END IF;

        IF COALESCE((v_policy->>'affects_last_week_payment')::boolean, false) THEN
          IF COALESCE(v_week5, 0) > 0 THEN
            v_target_week := 5;
          ELSIF COALESCE(v_week4, 0) > 0 THEN
            v_target_week := 4;
          ELSIF COALESCE(v_week3, 0) > 0 THEN
            v_target_week := 3;
          ELSIF COALESCE(v_week2, 0) > 0 THEN
            v_target_week := 2;
          ELSE
            v_target_week := 5;
          END IF;

          CASE v_target_week
            WHEN 1 THEN v_week1 := COALESCE(v_week1, 0) + v_payment_amount;
            WHEN 2 THEN v_week2 := COALESCE(v_week2, 0) + v_payment_amount;
            WHEN 3 THEN v_week3 := COALESCE(v_week3, 0) + v_payment_amount;
            WHEN 4 THEN v_week4 := COALESCE(v_week4, 0) + v_payment_amount;
            ELSE v_week5 := COALESCE(v_week5, 0) + v_payment_amount;
          END CASE;
        END IF;
      END LOOP;
    END IF;

    v_transformed_employee := v_input_employee || jsonb_build_object(
      'week1', ROUND(COALESCE(v_week1, 0), 2),
      'week2', ROUND(COALESCE(v_week2, 0), 2),
      'week3', ROUND(COALESCE(v_week3, 0), 2),
      'week4', ROUND(COALESCE(v_week4, 0), 2),
      'week5', ROUND(COALESCE(v_week5, 0), 2)
    );

    v_transformed_employees := v_transformed_employees || jsonb_build_array(v_transformed_employee);
  END LOOP;

  -- Recalculate statutory components on transformed wage base.
  v_base := public.calculate_c3_contributions(
    p_period_year,
    p_period_month,
    p_received_date,
    v_transformed_employees
  );

  IF v_base IS NULL OR COALESCE((v_base->>'success')::boolean, false) = false THEN
    RETURN COALESCE(v_base, jsonb_build_object('success', false, 'error', 'Base calculation failed'));
  END IF;

  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  SELECT * INTO v_config FROM public.get_c3_config_for_period(v_period_date) LIMIT 1;
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active C3 configuration found for selected period');
  END IF;

  v_employees := COALESCE(v_base->'employees', '[]'::jsonb);
  v_totals := COALESCE(v_base->'totals', '{}'::jsonb);

  v_sum_period_gross := COALESCE((v_totals->>'periodGross')::numeric, 0);
  v_sum_employee_ss := COALESCE((v_totals->>'employeeSS')::numeric, 0);
  v_sum_employer_ss := COALESCE((v_totals->>'employerSS')::numeric, 0);
  v_sum_employee_levy := COALESCE((v_totals->>'employeeLevy')::numeric, 0);
  v_sum_employer_levy := COALESCE((v_totals->>'employerLevy')::numeric, 0);
  v_sum_employer_severance := COALESCE((v_totals->>'employerSeverance')::numeric, 0);

  -- Pass 2: add only non-merge (separate) policy contributions after base recomputation.
  FOR v_i IN 0..jsonb_array_length(v_input_employees) - 1 LOOP
    v_input_employee := v_input_employees->v_i;
    v_base_employee := COALESCE(v_employees->v_i, '{}'::jsonb);

    v_seen_codes := ARRAY[]::text[];
    v_emp_merge_amount := 0;
    v_emp_op_amount := 0;
    v_emp_op_employee_ss := 0;
    v_emp_op_employee_levy := 0;
    v_emp_op_employer_ss := 0;
    v_emp_op_employer_eib := 0;
    v_emp_op_employer_levy := 0;
    v_emp_op_employer_severance := 0;

    v_other_payments := COALESCE(v_input_employee->'otherPayments', '[]'::jsonb);

    IF jsonb_typeof(v_other_payments) = 'array' AND jsonb_array_length(v_other_payments) > 0 THEN
      FOR v_j IN 0..jsonb_array_length(v_other_payments) - 1 LOOP
        v_payment := v_other_payments->v_j;

        v_income_code_id_text := NULLIF(TRIM(COALESCE(v_payment->>'income_code_id', '')), '');
        IF v_income_code_id_text IS NULL THEN
          CONTINUE;
        END IF;

        IF v_income_code_id_text = ANY(v_seen_codes) THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Duplicate income code detected in Other Payments for SSN %s', COALESCE(v_input_employee->>'ssn', 'N/A'))
          );
        END IF;
        v_seen_codes := array_append(v_seen_codes, v_income_code_id_text);

        v_amount_text := TRIM(COALESCE(v_payment->>'amount', ''));
        IF v_amount_text = '' OR v_amount_text !~ '^\d+(\.\d+)?$' THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Invalid amount detected for SSN %s in Other Payments', COALESCE(v_input_employee->>'ssn', 'N/A'))
          );
        END IF;

        v_payment_amount := v_amount_text::numeric;
        IF v_payment_amount <= 0 THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('Amount must be greater than zero for SSN %s in Other Payments', COALESCE(v_input_employee->>'ssn', 'N/A'))
          );
        END IF;

        v_policy := public.get_income_code_policy_for_period(
          v_income_code_id_text::uuid,
          p_period_year,
          p_period_month
        );

        IF v_policy IS NULL OR COALESCE((v_policy->>'found')::boolean, false) = false THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', format('No active policy for income code %s', v_income_code_id_text)
          );
        END IF;

        IF COALESCE((v_policy->>'affects_last_week_payment')::boolean, false) THEN
          v_emp_merge_amount := v_emp_merge_amount + v_payment_amount;
          CONTINUE;
        END IF;

        v_calc := public.calculate_other_payment_components(
          v_income_code_id_text::uuid,
          p_period_year,
          p_period_month,
          v_payment_amount
        );

        IF COALESCE((v_calc->>'success')::boolean, false)
           AND COALESCE((v_calc->>'found')::boolean, false) THEN
          v_emp_op_amount := v_emp_op_amount + COALESCE((v_calc->>'amount')::numeric, 0);
          v_emp_op_employee_ss := v_emp_op_employee_ss + COALESCE((v_calc->>'employee_ss')::numeric, 0);
          v_emp_op_employee_levy := v_emp_op_employee_levy + COALESCE((v_calc->>'employee_levy')::numeric, 0);
          v_emp_op_employer_ss := v_emp_op_employer_ss + COALESCE((v_calc->>'employer_ss')::numeric, 0);
          v_emp_op_employer_eib := v_emp_op_employer_eib + COALESCE((v_calc->>'employer_eib')::numeric, 0);
          v_emp_op_employer_levy := v_emp_op_employer_levy + COALESCE((v_calc->>'employer_levy')::numeric, 0);
          v_emp_op_employer_severance := v_emp_op_employer_severance + COALESCE((v_calc->>'employer_severance')::numeric, 0);
        ELSE
          RETURN jsonb_build_object(
            'success', false,
            'error', COALESCE(v_calc->>'error', format('Other payment calculation failed for income code %s', v_income_code_id_text))
          );
        END IF;
      END LOOP;
    END IF;

    IF v_i < jsonb_array_length(v_employees) THEN
      v_adj_total_wages := COALESCE((v_base_employee->>'totalWages')::numeric, 0) + v_emp_op_amount;
      v_adj_employee_ss := COALESCE((v_base_employee->>'employeeSS')::numeric, 0) + v_emp_op_employee_ss;
      v_adj_employee_levy := COALESCE((v_base_employee->>'employeeLevy')::numeric, 0) + v_emp_op_employee_levy;
      v_adj_employer_ss := COALESCE((v_base_employee->>'employerSS')::numeric, 0) + v_emp_op_employer_ss;
      v_adj_employer_eib := COALESCE((v_base_employee->>'employerEIB')::numeric, 0) + v_emp_op_employer_eib;
      v_adj_employer_ss_total := COALESCE((v_base_employee->>'employerSSTotal')::numeric, 0) + v_emp_op_employer_ss + v_emp_op_employer_eib;
      v_adj_employer_levy := COALESCE((v_base_employee->>'employerLevy')::numeric, 0) + v_emp_op_employer_levy;
      v_adj_employer_severance := COALESCE((v_base_employee->>'employerSeverance')::numeric, 0) + v_emp_op_employer_severance;

      v_base_employee := v_base_employee || jsonb_build_object(
        'otherPaymentAmount', ROUND(v_emp_merge_amount + v_emp_op_amount, 2),
        'otherPaymentMergedIntoLastWeek', ROUND(v_emp_merge_amount, 2),
        'otherPaymentSeparateAmount', ROUND(v_emp_op_amount, 2),
        'otherPaymentEmployeeSS', ROUND(v_emp_op_employee_ss, 2),
        'otherPaymentEmployeeLevy', ROUND(v_emp_op_employee_levy, 2),
        'otherPaymentEmployerSS', ROUND(v_emp_op_employer_ss, 2),
        'otherPaymentEmployerEIB', ROUND(v_emp_op_employer_eib, 2),
        'otherPaymentEmployerLevy', ROUND(v_emp_op_employer_levy, 2),
        'otherPaymentEmployerSeverance', ROUND(v_emp_op_employer_severance, 2),
        'totalWages', ROUND(v_adj_total_wages, 2),
        'periodGross', ROUND(v_adj_total_wages, 2),
        'employeeSS', ROUND(v_adj_employee_ss, 2),
        'employeeLevy', ROUND(v_adj_employee_levy, 2),
        'employerSS', ROUND(v_adj_employer_ss, 2),
        'employerEIB', ROUND(v_adj_employer_eib, 2),
        'employerSSTotal', ROUND(v_adj_employer_ss_total, 2),
        'employerLevy', ROUND(v_adj_employer_levy, 2),
        'employerSeverance', ROUND(v_adj_employer_severance, 2),
        'totalWagesPlusEmployeeLevyPlusSS', ROUND(v_adj_total_wages + v_adj_employee_levy + v_adj_employee_ss, 2),
        'employersThreePercentLevyPlusSS', ROUND(v_adj_employer_levy + v_adj_employer_ss_total, 2),
        'employersOnePercentSeverancePay', ROUND(v_adj_employer_severance, 2)
      );

      v_employees := jsonb_set(v_employees, ARRAY[v_i::text], v_base_employee, true);
    END IF;

    v_op_total_merged_amount := v_op_total_merged_amount + v_emp_merge_amount;
    v_op_total_separate_amount := v_op_total_separate_amount + v_emp_op_amount;
    v_op_total_employee_ss := v_op_total_employee_ss + v_emp_op_employee_ss;
    v_op_total_employee_levy := v_op_total_employee_levy + v_emp_op_employee_levy;
    v_op_total_employer_ss := v_op_total_employer_ss + v_emp_op_employer_ss;
    v_op_total_employer_eib := v_op_total_employer_eib + v_emp_op_employer_eib;
    v_op_total_employer_levy := v_op_total_employer_levy + v_emp_op_employer_levy;
    v_op_total_employer_severance := v_op_total_employer_severance + v_emp_op_employer_severance;
  END LOOP;

  -- Base totals already include merged amounts. Add only separate-policy deltas.
  v_sum_period_gross := v_sum_period_gross + v_op_total_separate_amount;
  v_sum_employee_ss := v_sum_employee_ss + v_op_total_employee_ss;
  v_sum_employer_ss := v_sum_employer_ss + v_op_total_employer_ss + v_op_total_employer_eib;
  v_sum_employee_levy := v_sum_employee_levy + v_op_total_employee_levy;
  v_sum_employer_levy := v_sum_employer_levy + v_op_total_employer_levy;
  v_sum_employer_severance := v_sum_employer_severance + v_op_total_employer_severance;

  v_months_late := COALESCE((v_totals->>'monthsLate')::integer, 0);

  IF v_months_late > 0 THEN
    v_levy_penalty_base := COALESCE(v_sum_employee_levy, 0) + COALESCE(v_sum_employer_levy, 0);
    v_levy_penalty := ROUND(
      v_levy_penalty_base * COALESCE(v_config.levy_penalty_initial_rate, 0)::numeric +
      v_levy_penalty_base * COALESCE(v_config.levy_penalty_subsequent_rate, 0)::numeric * GREATEST(v_months_late - 1, 0),
      2
    );

    v_severance_penalty_base := COALESCE(v_sum_employer_severance, 0);
    v_severance_penalty := ROUND(
      v_severance_penalty_base * COALESCE(v_config.severance_penalty_initial_rate, 0)::numeric +
      v_severance_penalty_base * COALESCE(v_config.severance_penalty_subsequent_rate, 0)::numeric * GREATEST(v_months_late - 1, 0),
      2
    );

    v_ss_fine_base := COALESCE(v_sum_employee_ss, 0) + COALESCE(v_sum_employer_ss, 0);
    v_ss_fine := ROUND(
      v_ss_fine_base * COALESCE(v_config.ss_fine_initial_rate, 0)::numeric +
      v_ss_fine_base * COALESCE(v_config.ss_fine_subsequent_rate, v_config.ss_fine_initial_rate, 0)::numeric * GREATEST(v_months_late - 1, 0),
      2
    );

    v_total_late_charges := v_levy_penalty + v_severance_penalty + v_ss_fine;
  END IF;

  v_totals := v_totals || jsonb_build_object(
    'periodGross', ROUND(v_sum_period_gross, 2),
    'employeeSS', ROUND(v_sum_employee_ss, 2),
    'employerSS', ROUND(v_sum_employer_ss, 2),
    'employeeLevy', ROUND(v_sum_employee_levy, 2),
    'employerLevy', ROUND(v_sum_employer_levy, 2),
    'employerSeverance', ROUND(v_sum_employer_severance, 2),
    'totalWagesPlusEmployeeLevyPlusSS', ROUND(v_sum_period_gross + v_sum_employee_levy + v_sum_employee_ss, 2),
    'employersThreePercentLevyPlusSS', ROUND(v_sum_employer_levy + v_sum_employer_ss, 2),
    'employersOnePercentSeverancePay', ROUND(v_sum_employer_severance, 2),
    'levyPenaltyBase', ROUND(v_levy_penalty_base, 2),
    'severancePenaltyBase', ROUND(v_severance_penalty_base, 2),
    'ssFinBase', ROUND(v_ss_fine_base, 2),
    'levyPenalty', ROUND(v_levy_penalty, 2),
    'severancePenalty', ROUND(v_severance_penalty, 2),
    'ssFine', ROUND(v_ss_fine, 2),
    'totalLateCharges', ROUND(v_total_late_charges, 2)
  );

  RETURN v_base || jsonb_build_object(
    'employees', v_employees,
    'totals', v_totals,
    'otherPaymentsTotals', jsonb_build_object(
      'amount', ROUND(v_op_total_merged_amount + v_op_total_separate_amount, 2),
      'mergedIntoLastWeek', ROUND(v_op_total_merged_amount, 2),
      'separateAmount', ROUND(v_op_total_separate_amount, 2),
      'employeeSS', ROUND(v_op_total_employee_ss, 2),
      'employeeLevy', ROUND(v_op_total_employee_levy, 2),
      'employerSS', ROUND(v_op_total_employer_ss, 2),
      'employerEIB', ROUND(v_op_total_employer_eib, 2),
      'employerLevy', ROUND(v_op_total_employer_levy, 2),
      'employerSeverance', ROUND(v_op_total_employer_severance, 2)
    )
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;