
-- RPC: Fetch C3 reported data and return component mapping for auto-population
CREATE OR REPLACE FUNCTION public.get_c3_payment_components(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,        -- format: YYYY-MM-DD
  p_sequence_no INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_components JSONB := '[]'::JSONB;
BEGIN
  -- Fetch the C3 reported record
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
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'components', '[]'::jsonb);
  END IF;

  -- Build components based on payer_type
  IF p_payer_type = 'ER' THEN
    -- Employer: SSC, LVC, PEC, SSF, LVF, PEF
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
  ELSIF p_payer_type = 'SE' THEN
    -- Self-Employed: SEF, SSE
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SEF', 'amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'SSE', 'amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
  ELSIF p_payer_type = 'VC' THEN
    -- Voluntary Contributor: VOC
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'VOC', 'amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
  ELSE
    -- NW Director or other: treat like ER
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'found',
    'components', v_components,
    'sequence_no', p_sequence_no
  );
END;
$$;
