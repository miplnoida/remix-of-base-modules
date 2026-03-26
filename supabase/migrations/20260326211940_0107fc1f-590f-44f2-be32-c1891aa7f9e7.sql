
-- Replace public_api_insert_c3_reported to accept sequence_no from caller
-- and validate uniqueness instead of auto-generating it.

CREATE OR REPLACE FUNCTION public.public_api_insert_c3_reported(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,
  p_sequence_no INTEGER,
  p_payer_name TEXT DEFAULT NULL,
  p_payer_address TEXT DEFAULT NULL,
  p_number_employed INTEGER DEFAULT NULL,
  p_total_wages NUMERIC DEFAULT NULL,
  p_nil_return BOOLEAN DEFAULT FALSE,
  p_notes TEXT DEFAULT NULL,
  p_entered_by TEXT DEFAULT 'API',
  p_received_by TEXT DEFAULT NULL,
  p_date_received TEXT DEFAULT NULL,
  p_emp_ss_amt_calc NUMERIC DEFAULT NULL,
  p_emp_levy_amt_calc NUMERIC DEFAULT NULL,
  p_emp_pe_amt_calc NUMERIC DEFAULT NULL,
  p_emp_ss_fines_due NUMERIC DEFAULT NULL,
  p_emp_levy_penalty_amt NUMERIC DEFAULT NULL,
  p_emp_pe_penalty_amt NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_period_ts DATE;
  v_date_received TIMESTAMPTZ;
BEGIN
  IF p_payer_id IS NULL OR p_payer_id = '' THEN
    RAISE EXCEPTION 'payer_id is required';
  END IF;
  IF p_payer_type IS NULL OR p_payer_type = '' THEN
    RAISE EXCEPTION 'payer_type is required';
  END IF;
  IF p_period IS NULL OR p_period = '' THEN
    RAISE EXCEPTION 'period is required';
  END IF;
  IF p_sequence_no IS NULL THEN
    RAISE EXCEPTION 'sequence_no is required';
  END IF;

  v_period_ts := p_period::DATE;

  -- Parse date_received if provided
  IF p_date_received IS NOT NULL AND p_date_received != '' THEN
    v_date_received := p_date_received::TIMESTAMPTZ;
  ELSE
    v_date_received := NULL;
  END IF;

  -- Advisory lock to prevent race conditions on the same payer+period
  PERFORM pg_advisory_xact_lock(hashtext(p_payer_id || p_payer_type || p_period));

  -- Check if this combination already exists
  IF EXISTS (
    SELECT 1 FROM public.cn_c3_reported
    WHERE payer_id = p_payer_id
      AND payer_type = p_payer_type
      AND period = v_period_ts
      AND sequence_no = p_sequence_no
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'This schedule/sequence number has already been submitted for this payer and period.',
      'data', jsonb_build_object(
        'payer_id', p_payer_id,
        'payer_type', p_payer_type,
        'period', v_period_ts::TEXT,
        'sequence_no', p_sequence_no
      )
    );
  END IF;

  INSERT INTO public.cn_c3_reported (
    payer_id, payer_type, period, sequence_no, posting_status,
    payer_name, payer_address, number_employed, total_wages, nil_return,
    notes, entered_by, received_by, date_received, date_entered,
    emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc,
    emp_ss_fines_due, emp_levy_penalty_amt, emp_pe_penalty_amt
  ) VALUES (
    p_payer_id, p_payer_type, v_period_ts, p_sequence_no, 'DEL',
    p_payer_name, p_payer_address, p_number_employed, p_total_wages, COALESCE(p_nil_return, FALSE),
    p_notes, p_entered_by, p_received_by, v_date_received, NOW(),
    p_emp_ss_amt_calc, p_emp_levy_amt_calc, p_emp_pe_amt_calc,
    p_emp_ss_fines_due, p_emp_levy_penalty_amt, p_emp_pe_penalty_amt
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'C3 reported record created successfully',
    'data', jsonb_build_object(
      'id', v_id,
      'payer_id', p_payer_id,
      'payer_type', p_payer_type,
      'sequence_no', p_sequence_no,
      'period', v_period_ts::TEXT,
      'posting_status', 'DEL'
    )
  );
END;
$$;
