
CREATE OR REPLACE FUNCTION public.get_c3_component_balances(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,
  p_sequence_no INTEGER,
  p_is_for_director BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_components JSONB := '[]'::JSONB;
  v_paid_map JSONB := '{}'::JSONB;
  v_result JSONB := '[]'::JSONB;
  v_comp JSONB;
  v_code TEXT;
  v_original NUMERIC;
  v_paid NUMERIC;
  v_balance NUMERIC;
  v_codes TEXT[];
  v_period_mm_yyyy TEXT;
BEGIN
  SELECT
    emp_ss_amt_calc,
    emp_levy_amt_calc,
    emp_pe_amt_calc,
    emp_ss_fines_due,
    emp_levy_penalty_amt,
    emp_pe_penalty_amt
  INTO v_record
  FROM cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND period = p_period::timestamp
    AND sequence_no = p_sequence_no
    AND is_for_director = COALESCE(p_is_for_director, FALSE)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'components', '[]'::jsonb);
  END IF;

  -- Convert p_period (YYYY-MM-01) to MM/YYYY format to match c3_payment_components.period
  v_period_mm_yyyy := LPAD(EXTRACT(MONTH FROM p_period::date)::text, 2, '0') || '/' || EXTRACT(YEAR FROM p_period::date)::text;

  IF COALESCE(p_is_for_director, FALSE) THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0))
    );
    v_codes := ARRAY['LVC','LVF'];
  ELSIF p_payer_type = 'ER' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'original_amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'original_amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
    v_codes := ARRAY['SSC','LVC','PEC','SSF','LVF','PEF'];
  ELSIF p_payer_type = 'SE' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SEF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'SSE', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
    v_codes := ARRAY['SEF','SSE'];
  ELSIF p_payer_type = 'VC' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'VOC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
    v_codes := ARRAY['VOC'];
  ELSE
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'original_amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'original_amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
    v_codes := ARRAY['SSC','LVC','PEC','SSF','LVF','PEF'];
  END IF;

  -- Use converted MM/YYYY format for matching c3_payment_components.period
  SELECT COALESCE(jsonb_object_agg(sub.payment_code, sub.total_paid), '{}'::jsonb)
  INTO v_paid_map
  FROM (
    SELECT cpc.payment_code, SUM(COALESCE(cpc.component_amount, 0)) AS total_paid
    FROM c3_payment_components cpc
    INNER JOIN cn_payment_header h ON h.payment_id = cpc.payment_id
    INNER JOIN cn_receipt r ON r.payment_id = cpc.payment_id
    WHERE h.payer_id = p_payer_id
      AND h.payer_type = p_payer_type
      AND h.status IS DISTINCT FROM 'deleted'
      AND r.status != 'C'
      AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
      AND cpc.period = v_period_mm_yyyy
      AND cpc.payment_code = ANY(v_codes)
      AND cpc.sequence_no = p_sequence_no
    GROUP BY cpc.payment_code
  ) sub;

  FOR v_comp IN SELECT * FROM jsonb_array_elements(v_components)
  LOOP
    v_code := v_comp->>'payment_code';
    v_original := (v_comp->>'original_amount')::numeric;
    v_paid := COALESCE((v_paid_map->>v_code)::numeric, 0);
    v_balance := GREATEST(v_original - v_paid, 0);

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'payment_code', v_code,
        'original_amount', v_original,
        'paid_amount', v_paid,
        'balance_amount', v_balance,
        'fully_paid', (v_balance <= 0)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'found',
    'components', v_result,
    'sequence_no', p_sequence_no
  );
END;
$$;
