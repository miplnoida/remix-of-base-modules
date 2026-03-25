
-- Fix: bonus_date, holiday_start_date, holiday_end_date are DATE columns in ip_wages
-- Cast text params to DATE before inserting

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
  v_bonus_date DATE;
  v_holiday_start DATE;
  v_holiday_end DATE;
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

  -- Cast optional date fields
  IF p_bonus_date IS NOT NULL AND p_bonus_date != '' THEN
    v_bonus_date := p_bonus_date::DATE;
  END IF;
  IF p_holiday_start_date IS NOT NULL AND p_holiday_start_date != '' THEN
    v_holiday_start := p_holiday_start_date::DATE;
  END IF;
  IF p_holiday_end_date IS NOT NULL AND p_holiday_end_date != '' THEN
    v_holiday_end := p_holiday_end_date::DATE;
  END IF;

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
    p_total_wages, p_entered_by, NOW(),
    v_bonus_date, p_bonus_exempt_levy, p_bonus_holiday_swapped,
    v_holiday_start, v_holiday_end
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
