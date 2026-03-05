-- RPC 1: Calculate one other-payment row from policy + period config (backend-authoritative)
CREATE OR REPLACE FUNCTION public.calculate_other_payment_components(
  p_income_code_id uuid,
  p_period_year integer,
  p_period_month integer,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_policy jsonb;
  v_config record;
  v_period_date date;
  v_employee_ss numeric := 0;
  v_employee_levy numeric := 0;
  v_employer_ss numeric := 0;
  v_employer_eib numeric := 0;
  v_employer_levy numeric := 0;
  v_employer_severance numeric := 0;
BEGIN
  IF p_income_code_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'found', false,
      'error', 'Income code is required'
    );
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'found', false,
      'error', 'Amount must be greater than zero'
    );
  END IF;

  v_period_date := make_date(p_period_year, p_period_month + 1, 1);

  v_policy := public.get_income_code_policy_for_period(
    p_income_code_id,
    p_period_year,
    p_period_month
  );

  IF v_policy IS NULL OR COALESCE((v_policy->>'found')::boolean, false) = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'found', false,
      'error', COALESCE(v_policy->>'error', 'No active policy configured for this income code and period')
    );
  END IF;

  SELECT *
  INTO v_config
  FROM public.get_c3_config_for_period(v_period_date)
  LIMIT 1;

  IF v_config IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'found', false,
      'error', 'No active C3 configuration found for selected period'
    );
  END IF;

  v_employee_ss := CASE
    WHEN COALESCE((v_policy->>'ssc_contrib_employee')::boolean, false)
      THEN ROUND(p_amount * COALESCE(v_config.employee_ss_rate, 0)::numeric, 2)
    ELSE 0
  END;

  v_employee_levy := CASE
    WHEN COALESCE((v_policy->>'levy_include')::boolean, false)
      THEN ROUND(p_amount * COALESCE(v_config.employer_levy_rate, 0)::numeric, 2)
    ELSE 0
  END;

  v_employer_ss := CASE
    WHEN COALESCE((v_policy->>'ssc_contrib_employer')::boolean, false)
      THEN ROUND(p_amount * COALESCE(v_config.employer_ss_rate, 0)::numeric, 2)
    ELSE 0
  END;

  v_employer_eib := CASE
    WHEN COALESCE((v_policy->>'contrib_eib')::boolean, false)
      THEN ROUND(p_amount * COALESCE(v_config.employer_eib_rate, 0)::numeric, 2)
    ELSE 0
  END;

  v_employer_levy := CASE
    WHEN COALESCE((v_policy->>'levy_include')::boolean, false)
      THEN ROUND(p_amount * COALESCE(v_config.employer_levy_rate, 0)::numeric, 2)
    ELSE 0
  END;

  v_employer_severance := CASE
    WHEN COALESCE((v_policy->>'include_in_severance')::boolean, false)
      THEN ROUND(p_amount * COALESCE(v_config.employer_severance_rate, 0)::numeric, 2)
    ELSE 0
  END;

  RETURN jsonb_build_object(
    'success', true,
    'found', true,
    'policy_id', v_policy->>'policy_id',
    'policy_type', v_policy->>'policy_type',
    'date_entry_mode', v_policy->>'date_entry_mode',
    'has_exception', COALESCE((v_policy->>'has_exception')::boolean, false),
    'exception_id', v_policy->>'exception_id',
    'levy_include', COALESCE((v_policy->>'levy_include')::boolean, false),
    'ssc_contrib_employee', COALESCE((v_policy->>'ssc_contrib_employee')::boolean, false),
    'ssc_contrib_employer', COALESCE((v_policy->>'ssc_contrib_employer')::boolean, false),
    'contrib_eib', COALESCE((v_policy->>'contrib_eib')::boolean, false),
    'include_in_severance', COALESCE((v_policy->>'include_in_severance')::boolean, false),
    'amount', ROUND(p_amount, 2),
    'employee_ss', v_employee_ss,
    'employee_levy', v_employee_levy,
    'employer_ss', v_employer_ss,
    'employer_eib', v_employer_eib,
    'employer_levy', v_employer_levy,
    'employer_severance', v_employer_severance
  );
END;
$$;

-- RPC 2: Wrapper over calculate_c3_contributions that injects Other Payments into employee totals + C3 penalties
CREATE OR REPLACE FUNCTION public.calculate_c3_contributions_with_other_payments(
  p_period_year integer,
  p_period_month integer,
  p_received_date date,
  p_employee_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_base jsonb;
  v_period_date date;
  v_config record;

  v_input_employees jsonb;
  v_employees jsonb;
  v_totals jsonb;

  v_i integer;
  v_j integer;

  v_input_employee jsonb;
  v_base_employee jsonb;
  v_other_payments jsonb;
  v_payment jsonb;
  v_calc jsonb;

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

  v_op_total_amount numeric := 0;
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
  v_base := public.calculate_c3_contributions(
    p_period_year,
    p_period_month,
    p_received_date,
    p_employee_data
  );

  IF v_base IS NULL OR COALESCE((v_base->>'success')::boolean, false) = false THEN
    RETURN COALESCE(v_base, jsonb_build_object('success', false, 'error', 'Base calculation failed'));
  END IF;

  v_period_date := make_date(p_period_year, p_period_month + 1, 1);
  SELECT * INTO v_config FROM public.get_c3_config_for_period(v_period_date) LIMIT 1;
  IF v_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active C3 configuration found for selected period');
  END IF;

  v_input_employees := COALESCE(p_employee_data, '[]'::jsonb);
  v_employees := COALESCE(v_base->'employees', '[]'::jsonb);
  v_totals := COALESCE(v_base->'totals', '{}'::jsonb);

  v_sum_period_gross := COALESCE((v_totals->>'periodGross')::numeric, 0);
  v_sum_employee_ss := COALESCE((v_totals->>'employeeSS')::numeric, 0);
  v_sum_employer_ss := COALESCE((v_totals->>'employerSS')::numeric, 0);
  v_sum_employee_levy := COALESCE((v_totals->>'employeeLevy')::numeric, 0);
  v_sum_employer_levy := COALESCE((v_totals->>'employerLevy')::numeric, 0);
  v_sum_employer_severance := COALESCE((v_totals->>'employerSeverance')::numeric, 0);

  IF jsonb_typeof(v_input_employees) = 'array' AND jsonb_array_length(v_input_employees) > 0 THEN
    FOR v_i IN 0..jsonb_array_length(v_input_employees) - 1 LOOP
      v_input_employee := v_input_employees->v_i;
      v_base_employee := COALESCE(v_employees->v_i, '{}'::jsonb);

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

          IF NULLIF(TRIM(COALESCE(v_payment->>'income_code_id', '')), '') IS NULL THEN
            CONTINUE;
          END IF;

          IF COALESCE((v_payment->>'amount')::numeric, 0) <= 0 THEN
            CONTINUE;
          END IF;

          v_calc := public.calculate_other_payment_components(
            (v_payment->>'income_code_id')::uuid,
            p_period_year,
            p_period_month,
            COALESCE((v_payment->>'amount')::numeric, 0)
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
          'otherPaymentAmount', ROUND(v_emp_op_amount, 2),
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

      v_op_total_amount := v_op_total_amount + v_emp_op_amount;
      v_op_total_employee_ss := v_op_total_employee_ss + v_emp_op_employee_ss;
      v_op_total_employee_levy := v_op_total_employee_levy + v_emp_op_employee_levy;
      v_op_total_employer_ss := v_op_total_employer_ss + v_emp_op_employer_ss;
      v_op_total_employer_eib := v_op_total_employer_eib + v_emp_op_employer_eib;
      v_op_total_employer_levy := v_op_total_employer_levy + v_emp_op_employer_levy;
      v_op_total_employer_severance := v_op_total_employer_severance + v_emp_op_employer_severance;
    END LOOP;
  END IF;

  v_sum_period_gross := v_sum_period_gross + v_op_total_amount;
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
      'amount', ROUND(v_op_total_amount, 2),
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
$$;