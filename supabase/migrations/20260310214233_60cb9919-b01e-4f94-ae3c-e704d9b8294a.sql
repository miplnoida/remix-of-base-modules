
-- Step 1: Create helper function that properly pairs amounts for bi-weekly/semi-monthly
-- before evaluating against levy slabs
CREATE OR REPLACE FUNCTION public.evaluate_levy_amounts(
  p_amounts NUMERIC[],
  p_slab_id UUID,
  p_pay_period_code VARCHAR
) RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_eval_amounts NUMERIC[];
  v_total_levy NUMERIC := 0;
  v_slab RECORD;
  v_amount NUMERIC;
  v_levy NUMERIC;
  v_i INTEGER;
  v_arr_len INTEGER;
BEGIN
  v_arr_len := COALESCE(array_length(p_amounts, 1), 0);
  IF v_arr_len = 0 THEN RETURN 0; END IF;

  -- Build evaluation array based on pay period
  IF p_pay_period_code IN ('E2W', '2M') THEN
    -- Pair weeks: [wk1+wk2, wk3+wk4]
    v_eval_amounts := ARRAY[
      COALESCE(p_amounts[1], 0) + COALESCE(p_amounts[2], 0),
      COALESCE(p_amounts[3], 0) + COALESCE(p_amounts[4], 0)
    ];
    -- Add wk5 if present and non-zero
    IF v_arr_len >= 5 AND COALESCE(p_amounts[5], 0) > 0 THEN
      v_eval_amounts := v_eval_amounts || p_amounts[5];
    END IF;
    -- Handle 6th element (bonus/holiday fallback) if present
    IF v_arr_len >= 6 AND COALESCE(p_amounts[6], 0) > 0 THEN
      v_eval_amounts := v_eval_amounts || p_amounts[6];
    END IF;
  ELSE
    -- Weekly: keep individual elements as-is
    v_eval_amounts := p_amounts;
  END IF;

  -- Evaluate each element against slabs
  FOR v_i IN 1..COALESCE(array_length(v_eval_amounts, 1), 0) LOOP
    v_amount := COALESCE(v_eval_amounts[v_i], 0);
    v_levy := 0;
    IF v_amount > 0 THEN
      SELECT * INTO v_slab FROM public.tb_levy_slab_details
      WHERE slab_id = p_slab_id AND pay_period = p_pay_period_code
        AND is_active = true AND v_amount > over_amt
      ORDER BY over_amt DESC LIMIT 1;
      IF v_slab IS NOT NULL THEN
        v_levy := ROUND(v_slab.base_amt + ((v_amount - v_slab.over_amt + 0.01) * v_slab.tax_rate), 2);
      END IF;
    END IF;
    v_total_levy := v_total_levy + v_levy;
  END LOOP;

  RETURN v_total_levy;
END;
$$;
