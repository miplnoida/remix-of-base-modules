
-- Fix: Change period variable from TIMESTAMP to DATE and remove ::TEXT casts for period comparisons/inserts

-- RPC 1: public_api_insert_c3_reported
CREATE OR REPLACE FUNCTION public.public_api_insert_c3_reported(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,
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
  v_seq INTEGER;
  v_id UUID;
  v_period_ts DATE;
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

  v_period_ts := p_period::DATE;

  PERFORM pg_advisory_xact_lock(hashtext(p_payer_id || p_payer_type || p_period));

  SELECT COALESCE(MAX(sequence_no), 0) + 1
  INTO v_seq
  FROM public.cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND period = v_period_ts;

  INSERT INTO public.cn_c3_reported (
    payer_id, payer_type, period, sequence_no, posting_status,
    payer_name, payer_address, number_employed, total_wages, nil_return,
    notes, entered_by, received_by, date_received, date_entered,
    emp_ss_amt_calc, emp_levy_amt_calc, emp_pe_amt_calc,
    emp_ss_fines_due, emp_levy_penalty_amt, emp_pe_penalty_amt
  ) VALUES (
    p_payer_id, p_payer_type, v_period_ts, v_seq, 'DEL',
    p_payer_name, p_payer_address, p_number_employed, p_total_wages, COALESCE(p_nil_return, FALSE),
    p_notes, p_entered_by, p_received_by, p_date_received, NOW()::TEXT,
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
      'sequence_no', v_seq,
      'period', v_period_ts::TEXT,
      'posting_status', 'DEL'
    )
  );
END;
$$;

-- RPC 2: public_api_insert_ip_wages
CREATE OR REPLACE FUNCTION public.public_api_insert_ip_wages(
  p_ssn TEXT,
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_sequence_no INTEGER,
  p_period TEXT,
  p_employee_name TEXT DEFAULT NULL,
  p_pay_period TEXT DEFAULT NULL,
  p_wages_paid1 NUMERIC DEFAULT NULL,
  p_wages_paid2 NUMERIC DEFAULT NULL,
  p_wages_paid3 NUMERIC DEFAULT NULL,
  p_wages_paid4 NUMERIC DEFAULT NULL,
  p_wages_paid5 NUMERIC DEFAULT NULL,
  p_wages_paid6 NUMERIC DEFAULT NULL,
  p_wages_paid7 NUMERIC DEFAULT NULL,
  p_paid_code1 TEXT DEFAULT NULL,
  p_paid_code2 TEXT DEFAULT NULL,
  p_paid_code3 TEXT DEFAULT NULL,
  p_paid_code4 TEXT DEFAULT NULL,
  p_paid_code5 TEXT DEFAULT NULL,
  p_paid_code6 TEXT DEFAULT NULL,
  p_paid_code7 TEXT DEFAULT NULL,
  p_er_ss_amt NUMERIC DEFAULT NULL,
  p_er_ei_amt NUMERIC DEFAULT NULL,
  p_er_levy_amt NUMERIC DEFAULT NULL,
  p_ip_ss_amt NUMERIC DEFAULT NULL,
  p_ip_levy_amt NUMERIC DEFAULT NULL,
  p_ip_pe_amt NUMERIC DEFAULT NULL,
  p_total_wages NUMERIC DEFAULT NULL,
  p_entered_by TEXT DEFAULT 'API',
  p_bonus_date TEXT DEFAULT NULL,
  p_bonus_exempt_levy BOOLEAN DEFAULT NULL,
  p_bonus_holiday_swapped BOOLEAN DEFAULT NULL,
  p_holiday_start_date TEXT DEFAULT NULL,
  p_holiday_end_date TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_c3_id UUID;
  v_wages_id UUID;
  v_period_ts DATE;
BEGIN
  IF p_ssn IS NULL OR p_ssn = '' THEN
    RAISE EXCEPTION 'ssn is required';
  END IF;
  IF p_payer_id IS NULL OR p_payer_id = '' THEN
    RAISE EXCEPTION 'payer_id is required';
  END IF;
  IF p_payer_type IS NULL OR p_payer_type = '' THEN
    RAISE EXCEPTION 'payer_type is required';
  END IF;
  IF p_sequence_no IS NULL THEN
    RAISE EXCEPTION 'sequence_no is required';
  END IF;
  IF p_period IS NULL OR p_period = '' THEN
    RAISE EXCEPTION 'period is required';
  END IF;

  v_period_ts := p_period::DATE;

  SELECT id INTO v_c3_id
  FROM public.cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND sequence_no = p_sequence_no
    AND period = v_period_ts
    AND posting_status = 'DEL'
  LIMIT 1;

  IF v_c3_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Cannot insert wages because no matching C3 record with status DEL exists for the given payer_id, payer_type, period, and sequence_no.'
    );
  END IF;

  INSERT INTO public.ip_wages (
    ssn, payer_id, payer_type, sequence_no, period, posting_status, c3_id,
    employee_name, pay_period,
    wages_paid1, wages_paid2, wages_paid3, wages_paid4, wages_paid5, wages_paid6, wages_paid7,
    paid_code1, paid_code2, paid_code3, paid_code4, paid_code5, paid_code6, paid_code7,
    er_ss_amt, er_ei_amt, er_levy_amt, ip_ss_amt, ip_levy_amt, ip_pe_amt,
    total_wages, entered_by, date_entered,
    bonus_date, bonus_exempt_levy, bonus_holiday_swapped,
    holiday_start_date, holiday_end_date
  ) VALUES (
    p_ssn, p_payer_id, p_payer_type, p_sequence_no, v_period_ts, 'DEL', v_c3_id,
    p_employee_name, p_pay_period,
    p_wages_paid1, p_wages_paid2, p_wages_paid3, p_wages_paid4, p_wages_paid5, p_wages_paid6, p_wages_paid7,
    p_paid_code1, p_paid_code2, p_paid_code3, p_paid_code4, p_paid_code5, p_paid_code6, p_paid_code7,
    p_er_ss_amt, p_er_ei_amt, p_er_levy_amt, p_ip_ss_amt, p_ip_levy_amt, p_ip_pe_amt,
    p_total_wages, p_entered_by, NOW()::TEXT,
    p_bonus_date, p_bonus_exempt_levy, p_bonus_holiday_swapped,
    p_holiday_start_date, p_holiday_end_date
  )
  RETURNING id INTO v_wages_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'Wages record created successfully',
    'data', jsonb_build_object(
      'id', v_wages_id,
      'c3_id', v_c3_id,
      'ssn', p_ssn,
      'payer_id', p_payer_id,
      'payer_type', p_payer_type,
      'sequence_no', p_sequence_no,
      'period', v_period_ts::TEXT,
      'posting_status', 'DEL'
    )
  );
END;
$$;

-- RPC 3: public_api_verify_c3
CREATE OR REPLACE FUNCTION public.public_api_verify_c3(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_sequence_no INTEGER,
  p_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_c3_id UUID;
  v_nil_return BOOLEAN;
  v_wages_count INTEGER;
  v_total_wages NUMERIC;
  v_emp_ss_amt_calc NUMERIC;
  v_emp_levy_amt_calc NUMERIC;
  v_emp_pe_amt_calc NUMERIC;
  v_period_ts DATE;
BEGIN
  IF p_payer_id IS NULL OR p_payer_id = '' THEN
    RAISE EXCEPTION 'payer_id is required';
  END IF;
  IF p_payer_type IS NULL OR p_payer_type = '' THEN
    RAISE EXCEPTION 'payer_type is required';
  END IF;
  IF p_sequence_no IS NULL THEN
    RAISE EXCEPTION 'sequence_no is required';
  END IF;
  IF p_period IS NULL OR p_period = '' THEN
    RAISE EXCEPTION 'period is required';
  END IF;

  v_period_ts := p_period::DATE;

  SELECT id, COALESCE(nil_return, FALSE)
  INTO v_c3_id, v_nil_return
  FROM public.cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND sequence_no = p_sequence_no
    AND period = v_period_ts
  LIMIT 1;

  IF v_c3_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No C3 reported record found for the given payer_id, payer_type, sequence_no, and period.'
    );
  END IF;

  SELECT COUNT(*)
  INTO v_wages_count
  FROM public.ip_wages
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND sequence_no = p_sequence_no
    AND period = v_period_ts;

  IF v_nil_return THEN
    IF v_wages_count > 0 THEN
      RETURN jsonb_build_object(
        'status', 'error',
        'message', 'Cannot verify nil-return C3 because wage records exist for this payer_id, payer_type, period, and sequence_no.'
      );
    END IF;

    UPDATE public.cn_c3_reported
    SET posting_status = 'VAC',
        date_verified = NOW()::TEXT,
        verified_by = 'API',
        total_wages = 0,
        number_employed = 0,
        emp_ss_amt_calc = 0,
        emp_levy_amt_calc = 0,
        emp_pe_amt_calc = 0
    WHERE id = v_c3_id;

    RETURN jsonb_build_object(
      'status', 'success',
      'message', 'Nil-return C3 verified successfully. No wages expected.',
      'data', jsonb_build_object(
        'payer_id', p_payer_id,
        'payer_type', p_payer_type,
        'sequence_no', p_sequence_no,
        'period', v_period_ts::TEXT,
        'nil_return', TRUE
      )
    );
  END IF;

  IF v_wages_count = 0 THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'No wage records found for the given payer_id, payer_type, sequence_no, and period.'
    );
  END IF;

  SELECT
    COALESCE(SUM(COALESCE(wages_paid1,0) + COALESCE(wages_paid2,0) + COALESCE(wages_paid3,0) + COALESCE(wages_paid4,0) + COALESCE(wages_paid5,0) + COALESCE(wages_paid6,0)), 0),
    COALESCE(SUM(COALESCE(er_ss_amt,0) + COALESCE(er_ei_amt,0) + COALESCE(ip_ss_amt,0)), 0),
    COALESCE(SUM(COALESCE(er_levy_amt,0) + COALESCE(ip_levy_amt,0)), 0),
    COALESCE(SUM(COALESCE(ip_pe_amt,0)), 0)
  INTO v_total_wages, v_emp_ss_amt_calc, v_emp_levy_amt_calc, v_emp_pe_amt_calc
  FROM public.ip_wages
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND sequence_no = p_sequence_no
    AND period = v_period_ts;

  UPDATE public.cn_c3_reported
  SET posting_status = 'VAC',
      date_verified = NOW()::TEXT,
      verified_by = 'API',
      total_wages = v_total_wages,
      number_employed = v_wages_count,
      emp_ss_amt_calc = v_emp_ss_amt_calc,
      emp_levy_amt_calc = v_emp_levy_amt_calc,
      emp_pe_amt_calc = v_emp_pe_amt_calc
  WHERE id = v_c3_id;

  UPDATE public.ip_wages
  SET is_verified = TRUE,
      verified_by = 'API',
      date_verified = NOW()::TEXT
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND sequence_no = p_sequence_no
    AND period = v_period_ts;

  RETURN jsonb_build_object(
    'status', 'success',
    'message', 'C3 verified successfully',
    'data', jsonb_build_object(
      'payer_id', p_payer_id,
      'payer_type', p_payer_type,
      'sequence_no', p_sequence_no,
      'period', v_period_ts::TEXT,
      'total_wages', v_total_wages,
      'emp_ss_amt_calc', v_emp_ss_amt_calc,
      'emp_levy_amt_calc', v_emp_levy_amt_calc,
      'emp_pe_amt_calc', v_emp_pe_amt_calc,
      'number_employed', v_wages_count,
      'wages_rows_verified', v_wages_count
    )
  );
END;
$$;
