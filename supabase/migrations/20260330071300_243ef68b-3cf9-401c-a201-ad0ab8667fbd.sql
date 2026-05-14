
-- ========================================
-- C3 History Sync APIs — RPC Functions + Indexes
-- ========================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_cn_c3_reported_range_lookup 
  ON cn_c3_reported(payer_id, payer_type, posting_status, period);

CREATE INDEX IF NOT EXISTS idx_ip_wages_c3_detail 
  ON ip_wages(c3_id, payer_type);

CREATE INDEX IF NOT EXISTS idx_ip_master_ssn_name
  ON ip_master(ssn);

-- ========================================
-- RPC 1: public_api_c3_range
-- Returns VAC C3 headers for a payer within a date range
-- ========================================
CREATE OR REPLACE FUNCTION public.public_api_c3_range(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_start_period TEXT,
  p_end_period TEXT,
  p_c3_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start DATE;
  v_end DATE;
  v_result JSONB;
BEGIN
  -- Parse dd-MM-yyyy dates
  BEGIN
    v_start := to_date(p_start_period, 'DD-MM-YYYY');
    v_end := to_date(p_end_period, 'DD-MM-YYYY');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Invalid date format. Use DD-MM-YYYY');
  END;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY period DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'payerId', c.payer_id,
      'payerType', c.payer_type,
      'period', to_char(c.period, 'DD/MM/YYYY'),
      'sequenceNo', c.sequence_no,
      'c3Status', c.posting_status,
      'receivedBy', COALESCE(c.received_by, ''),
      'dateReceived', CASE WHEN c.date_received IS NOT NULL THEN to_char(c.date_received, 'DD/MM/YYYY') ELSE '' END
    ) AS row_data,
    c.period
    FROM cn_c3_reported c
    WHERE c.payer_id = p_payer_id
      AND c.payer_type = p_payer_type
      AND c.posting_status = 'VAC'
      AND c.period >= v_start
      AND c.period <= v_end
  ) sub;

  RETURN v_result;
END;
$$;

-- ========================================
-- RPC 2: public_api_c3_detail
-- Returns full C3 header + wage details
-- ========================================
CREATE OR REPLACE FUNCTION public.public_api_c3_detail(
  p_payer_id TEXT,
  p_month TEXT,
  p_year TEXT,
  p_sequence_no TEXT,
  p_payer_type TEXT,
  p_c3_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE;
  v_seq INTEGER;
  v_c3 RECORD;
  v_header JSONB;
  v_wages JSONB;
  v_result JSONB;
BEGIN
  -- Build period date (first day of month)
  BEGIN
    v_period := make_date(p_year::INTEGER, p_month::INTEGER, 1);
    v_seq := p_sequence_no::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Invalid month, year, or sequence_no');
  END;

  -- Fetch C3 header
  SELECT * INTO v_c3
  FROM cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND period = v_period
    AND sequence_no = v_seq
    AND posting_status = 'VAC'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'C3 record not found');
  END IF;

  -- Build header JSON
  v_header := jsonb_build_object(
    'payerId', v_c3.payer_id,
    'payerType', v_c3.payer_type,
    'c3Status', v_c3.posting_status,
    'numberEmployed', COALESCE(v_c3.number_employed, 0),
    'calcEmpSsAmt', COALESCE(v_c3.emp_ss_amt_calc, 0),
    'calcEmpLevyAmt', COALESCE(v_c3.emp_levy_amt_calc, 0),
    'calcEmpPeAmt', COALESCE(v_c3.emp_pe_amt_calc, 0),
    'totalEmpSsFines', COALESCE(v_c3.emp_ss_fines_due, 0),
    'totalEmpLevyPenalty', COALESCE(v_c3.emp_levy_penalty_amt, 0),
    'totalEmpPePenalty', COALESCE(v_c3.emp_pe_penalty_amt, 0),
    'dateReceived', CASE WHEN v_c3.date_received IS NOT NULL THEN to_char(v_c3.date_received, 'DD/MM/YYYY') ELSE '' END,
    'receivedBy', COALESCE(v_c3.received_by, ''),
    'submittedByName', COALESCE(v_c3.entered_by, ''),
    'sequenceNo', v_c3.sequence_no,
    'nilReturn', CASE WHEN v_c3.nil_return = true THEN 1 ELSE 0 END
  );

  -- Build wages array based on c3Type
  IF upper(p_c3_type) = 'NW' THEN
    -- Non-Working Director wages
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'ssn', w.ssn,
        'firstName', COALESCE(m.firstname, split_part(COALESCE(w.employee_name, ''), ' ', 1)),
        'surName', COALESCE(m.surname, CASE WHEN position(' ' in COALESCE(w.employee_name, '')) > 0 THEN substring(w.employee_name from position(' ' in w.employee_name) + 1) ELSE '' END),
        'wages', COALESCE(w.total_wages, 0),
        'levyAmt', COALESCE(w.er_levy_amt, 0),
        'startDate', null,
        'endDate', null
      )
    ), '[]'::jsonb) INTO v_wages
    FROM ip_wages w
    LEFT JOIN ip_master m ON m.ssn = w.ssn
    WHERE w.c3_id = v_c3.id;

    v_result := jsonb_build_object(
      'c3Header', v_header,
      'nonWorkingDirectorWages', v_wages
    );
  ELSE
    -- Employee wages (EE)
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'ssn', w.ssn,
        'firstName', COALESCE(m.firstname, split_part(COALESCE(w.employee_name, ''), ' ', 1)),
        'surName', COALESCE(m.surname, CASE WHEN position(' ' in COALESCE(w.employee_name, '')) > 0 THEN substring(w.employee_name from position(' ' in w.employee_name) + 1) ELSE '' END),
        'middleName', COALESCE(m.middle_name, ''),
        'birthDate', CASE WHEN m.dob IS NOT NULL THEN to_char(m.dob, 'YYYY-MM-DD') ELSE null END,
        'payPeriod', COALESCE(pp.description, w.pay_period, ''),
        'paidCode1', COALESCE(w.paid_code1, ''),
        'paidCode2', COALESCE(w.paid_code2, ''),
        'paidCode3', COALESCE(w.paid_code3, ''),
        'paidCode4', COALESCE(w.paid_code4, ''),
        'paidCode5', COALESCE(w.paid_code5, ''),
        'paidCode6', COALESCE(w.paid_code6, ''),
        'paidCode7', COALESCE(w.paid_code7, ''),
        'wagesPaid1', COALESCE(w.wages_paid1, 0),
        'wagesPaid2', COALESCE(w.wages_paid2, 0),
        'wagesPaid3', COALESCE(w.wages_paid3, 0),
        'wagesPaid4', COALESCE(w.wages_paid4, 0),
        'wagesPaid5', COALESCE(w.wages_paid5, 0),
        'wagesPaid6', COALESCE(w.wages_paid6, 0),
        'wagesPaid7', COALESCE(w.wages_paid7, 0),
        'ipSsAmt', COALESCE(w.ip_ss_amt, 0),
        'erSsAmt', COALESCE(w.er_ss_amt, 0),
        'ipLevyAmt', COALESCE(w.ip_levy_amt, 0),
        'erLevyAmt', COALESCE(w.er_levy_amt, 0),
        'ipPeAmt', COALESCE(w.ip_pe_amt, 0),
        'erEiAmt', COALESCE(w.er_ei_amt, 0),
        'startDate', null,
        'endDate', null,
        'wageType', null
      )
    ), '[]'::jsonb) INTO v_wages
    FROM ip_wages w
    LEFT JOIN ip_master m ON m.ssn = w.ssn
    LEFT JOIN tb_pay_periods pp ON pp.code = w.pay_period
    WHERE w.c3_id = v_c3.id;

    v_result := jsonb_build_object(
      'c3Header', v_header,
      'ipWages', v_wages
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ========================================
-- RPC 3: public_api_c3_last_submitted
-- Returns the most recent VAC C3 header
-- ========================================
CREATE OR REPLACE FUNCTION public.public_api_c3_last_submitted(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_sequence_no TEXT,
  p_c3_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
  v_c3 RECORD;
BEGIN
  BEGIN
    v_seq := p_sequence_no::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', 'Invalid sequence_no');
  END;

  SELECT * INTO v_c3
  FROM cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND sequence_no = v_seq
    AND posting_status = 'VAC'
  ORDER BY period DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No C3 record found');
  END IF;

  RETURN jsonb_build_object(
    'payerId', v_c3.payer_id,
    'payerType', v_c3.payer_type,
    'period', to_char(v_c3.period, 'DD/MM/YYYY'),
    'sequenceNo', v_c3.sequence_no,
    'c3Status', v_c3.posting_status,
    'receivedBy', COALESCE(v_c3.received_by, ''),
    'dateReceived', CASE WHEN v_c3.date_received IS NOT NULL THEN to_char(v_c3.date_received, 'DD/MM/YYYY') ELSE '' END,
    'numberEmployed', COALESCE(v_c3.number_employed, 0),
    'calcEmpSsAmt', COALESCE(v_c3.emp_ss_amt_calc, 0),
    'calcEmpLevyAmt', COALESCE(v_c3.emp_levy_amt_calc, 0),
    'calcEmpPeAmt', COALESCE(v_c3.emp_pe_amt_calc, 0),
    'totalEmpSsFines', COALESCE(v_c3.emp_ss_fines_due, 0),
    'totalEmpLevyPenalty', COALESCE(v_c3.emp_levy_penalty_amt, 0),
    'totalEmpPePenalty', COALESCE(v_c3.emp_pe_penalty_amt, 0),
    'submittedByName', COALESCE(v_c3.entered_by, ''),
    'nilReturn', CASE WHEN v_c3.nil_return = true THEN 1 ELSE 0 END
  );
END;
$$;
