
-- ============================================================
-- Fix: Period matching in Detail/Employee/LastSubmitted RPCs
-- Use month-range matching instead of exact date match
-- Also fix employer 658852 ip_wages data (DEL -> VAC)
-- ============================================================

-- Drop existing functions before recreation
DROP FUNCTION IF EXISTS public.public_api_c3_detail(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_c3_last_submitted(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_employees_by_last_c3(TEXT);

-- ══════════════════════════════════════════════════════════════
-- 1. C3 Detail API — Month-range matching fix
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_c3_detail(
  p_payer_id TEXT,
  p_month TEXT,
  p_year TEXT,
  p_sequence_no TEXT,
  p_payer_type TEXT,
  p_c3_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE;
  v_period_end DATE;
  v_record RECORD;
  v_wages JSONB;
  v_result JSONB;
BEGIN
  v_period := make_date(p_year::INT, p_month::INT, 1);
  v_period_end := (v_period + interval '1 month')::DATE;

  -- Use month-range matching instead of exact date to handle
  -- records stored as last-day-of-month (e.g., 2026-03-31 vs 2026-03-01)
  SELECT * INTO v_record
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.period >= v_period
    AND r.period < v_period_end
    AND r.sequence_no = p_sequence_no::INT
    AND r.posting_status = 'VAC';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'C3 not found', 'code', 'NOT_FOUND');
  END IF;

  -- Build wages array — also use month-range matching for ip_wages
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ssn', TRIM(w.ssn),
      'firstName', COALESCE(
        (SELECT TRIM(m.firstname) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        SPLIT_PART(COALESCE(w.employee_name, ''), ' ', 1)
      ),
      'surName', COALESCE(
        (SELECT TRIM(m.surname) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        CASE WHEN POSITION(' ' IN COALESCE(w.employee_name, '')) > 0 
             THEN SUBSTRING(w.employee_name FROM POSITION(' ' IN w.employee_name) + 1) 
             ELSE '' END
      ),
      'birthDate', COALESCE(
        (SELECT TO_CHAR(m.dob, 'YYYY-MM-DD') FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        ''
      ),
      'payPeriod', COALESCE(w.pay_period, 'M'),
      'paidCode1', COALESCE(w.paid_code1, '0'),
      'paidCode2', COALESCE(w.paid_code2, '0'),
      'paidCode3', COALESCE(w.paid_code3, '0'),
      'paidCode4', COALESCE(w.paid_code4, '0'),
      'paidCode5', COALESCE(w.paid_code5, '0'),
      'paidCode6', COALESCE(w.paid_code6, '0'),
      'paidCode7', COALESCE(w.paid_code7, '0'),
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
      'startDate', COALESCE(TO_CHAR(w.date_entered, 'YYYY-MM-DD'), ''),
      'endDate', COALESCE(TO_CHAR(w.date_verified, 'YYYY-MM-DD'), ''),
      'wageType', NULL
    ) ORDER BY w.input_seq_no, w.ssn
  ), '[]'::jsonb)
  INTO v_wages
  FROM ip_wages w
  WHERE TRIM(w.payer_id) = TRIM(p_payer_id)
    AND TRIM(w.payer_type) = TRIM(p_payer_type)
    AND w.period >= v_period
    AND w.period < v_period_end
    AND w.sequence_no = p_sequence_no::INT
    AND w.posting_status = 'VAC';

  v_result := jsonb_build_object(
    'c3Header', jsonb_build_object(
      'c3Status', 'S',
      'numberEmployed', COALESCE(v_record.number_employed, 0),
      'calcEmpSsAmt', COALESCE(v_record.emp_ss_amt_calc, 0),
      'calcEmpLevyAmt', COALESCE(v_record.emp_levy_amt_calc, 0),
      'calcEmpPeAmt', COALESCE(v_record.emp_pe_amt_calc, 0),
      'totalEmpSsFines', COALESCE(v_record.emp_ss_fines_due, 0),
      'totalEmpLevyPenalty', COALESCE(v_record.emp_levy_penalty_amt, 0),
      'totalEmpPePenalty', COALESCE(v_record.emp_pe_penalty_amt, 0),
      'dateReceived', COALESCE(TO_CHAR(v_record.date_received, 'YYYY-MM-DD'), ''),
      'receivedBy', COALESCE(TRIM(v_record.received_by), 'SYSTEM'),
      'submittedByName', COALESCE(TRIM(v_record.entered_by), ''),
      'submittedByEmail', '',
      'nilReturn', CASE WHEN v_record.nil_return THEN 1 ELSE 0 END
    ),
    'ipWages', v_wages
  );

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 2. C3 Last Submitted — delegates to fixed detail RPC
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_c3_last_submitted(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_sequence_no TEXT,
  p_c3_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.sequence_no = p_sequence_no::INT
    AND r.posting_status = 'VAC'
  ORDER BY r.period DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No submitted C3 found', 'code', 'NOT_FOUND');
  END IF;

  RETURN public_api_c3_detail(
    p_payer_id,
    EXTRACT(MONTH FROM v_record.period)::TEXT,
    EXTRACT(YEAR FROM v_record.period)::TEXT,
    p_sequence_no,
    p_payer_type,
    p_c3_type
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 3. Employees by Last C3 — month-range matching for wages
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_employees_by_last_c3(
  p_registration_number TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_period DATE;
  v_last_seq INT;
  v_period_start DATE;
  v_period_end DATE;
  v_result JSONB;
BEGIN
  SELECT r.period, r.sequence_no
  INTO v_last_period, v_last_seq
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_registration_number)
    AND TRIM(r.payer_type) = 'ER'
    AND r.posting_status = 'VAC'
  ORDER BY r.period DESC, r.sequence_no DESC
  LIMIT 1;

  IF v_last_period IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Compute month range from the header's period
  v_period_start := date_trunc('month', v_last_period)::DATE;
  v_period_end := (v_period_start + interval '1 month')::DATE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'socialSecurityNumber', TRIM(w.ssn),
      'firstName', COALESCE(
        (SELECT TRIM(m.firstname) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        SPLIT_PART(COALESCE(w.employee_name, ''), ' ', 1)
      ),
      'surName', COALESCE(
        (SELECT TRIM(m.surname) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        CASE WHEN POSITION(' ' IN COALESCE(w.employee_name, '')) > 0 
             THEN SUBSTRING(w.employee_name FROM POSITION(' ' IN w.employee_name) + 1) 
             ELSE '' END
      ),
      'middleName', COALESCE(
        (SELECT TRIM(m.middle_name) FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        ''
      ),
      'birthDate', COALESCE(
        (SELECT TO_CHAR(m.dob, 'YYYY-MM-DD') FROM ip_master m WHERE TRIM(m.ssn) = TRIM(w.ssn) LIMIT 1),
        ''
      ),
      'payPeriod', COALESCE(w.pay_period, 'M'),
      'startDate', COALESCE(TO_CHAR(w.date_entered, 'YYYY-MM-DD'), ''),
      'endDate', COALESCE(TO_CHAR(w.date_verified, 'YYYY-MM-DD'), ''),
      'wages', COALESCE(w.total_wages, 0)
    ) ORDER BY w.ssn
  ), '[]'::jsonb)
  INTO v_result
  FROM ip_wages w
  WHERE TRIM(w.payer_id) = TRIM(p_registration_number)
    AND TRIM(w.payer_type) = 'ER'
    AND w.period >= v_period_start
    AND w.period < v_period_end
    AND w.sequence_no = v_last_seq
    AND w.posting_status = 'VAC';

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 4. Data Fix: Promote ip_wages for employer 658852 to VAC
--    where corresponding cn_c3_reported header is VAC
-- ══════════════════════════════════════════════════════════════
UPDATE ip_wages w
SET posting_status = 'VAC'
FROM cn_c3_reported r
WHERE TRIM(w.payer_id) = TRIM(r.payer_id)
  AND w.payer_type = r.payer_type
  AND w.period = r.period
  AND w.sequence_no = r.sequence_no
  AND r.posting_status = 'VAC'
  AND w.posting_status = 'DEL'
  AND TRIM(w.payer_id) = '658852';
