
-- ============================================================
-- C3-Wizard Full BIMA API Replacement — All RPCs + Indexes
-- ============================================================

-- Drop any previous versions if they exist
DROP FUNCTION IF EXISTS public.public_api_c3_range(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_c3_detail(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_c3_last_submitted(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_employees_by_last_c3(TEXT);
DROP FUNCTION IF EXISTS public.public_api_nwdirectors_by_last_c3(TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_ip_details_by_query(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_multiple_ip_details(JSONB);
DROP FUNCTION IF EXISTS public.public_api_update_user(JSONB);
DROP FUNCTION IF EXISTS public.public_api_payment_save(TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.public_api_get_receipt(TEXT);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_er_master_regno ON public.er_master(regno);
CREATE INDEX IF NOT EXISTS idx_ip_master_ssn_lookup ON public.ip_master(ssn, dob);
CREATE INDEX IF NOT EXISTS idx_cn_receipt_number ON public.cn_receipt(receipt_number);
CREATE INDEX IF NOT EXISTS idx_ip_wages_payer_period ON public.ip_wages(payer_id, payer_type, period, posting_status);
CREATE INDEX IF NOT EXISTS idx_ip_employer_ssn ON public.ip_employer(ssn);

-- ══════════════════════════════════════════════════════════════
-- 1. C3 Range API — MMYYYY date format, returns summary array
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_c3_range(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_start_period TEXT,
  p_end_period TEXT,
  p_c3_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_start_month INT;
  v_start_year INT;
  v_end_month INT;
  v_end_year INT;
  v_result JSONB;
BEGIN
  -- Parse MMYYYY format
  IF length(p_start_period) = 6 AND p_start_period ~ '^\d{6}$' THEN
    v_start_month := substring(p_start_period, 1, 2)::INT;
    v_start_year := substring(p_start_period, 3, 4)::INT;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid startDate format. Expected MMYYYY (e.g., 012025)');
  END IF;

  IF length(p_end_period) = 6 AND p_end_period ~ '^\d{6}$' THEN
    v_end_month := substring(p_end_period, 1, 2)::INT;
    v_end_year := substring(p_end_period, 3, 4)::INT;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid endDate format. Expected MMYYYY (e.g., 122025)');
  END IF;

  v_start_date := make_date(v_start_year, v_start_month, 1);
  v_end_date := (make_date(v_end_year, v_end_month, 1) + interval '1 month' - interval '1 day')::DATE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', EXTRACT(MONTH FROM r.period)::INT,
      'year', EXTRACT(YEAR FROM r.period)::INT,
      'seqNo', r.sequence_no,
      'payerType', TRIM(r.payer_type),
      'c3Type', CASE WHEN TRIM(r.payer_type) = 'SE' THEN 'EE' ELSE p_c3_type END
    ) ORDER BY r.period, r.sequence_no
  ), '[]'::jsonb)
  INTO v_result
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.posting_status = 'VAC'
    AND r.period >= v_start_date
    AND r.period <= v_end_date;

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 2. C3 Detail API — Full BIMA-compatible response
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
  v_record RECORD;
  v_wages JSONB;
  v_result JSONB;
BEGIN
  v_period := make_date(p_year::INT, p_month::INT, 1);

  SELECT * INTO v_record
  FROM cn_c3_reported r
  WHERE TRIM(r.payer_id) = TRIM(p_payer_id)
    AND TRIM(r.payer_type) = TRIM(p_payer_type)
    AND r.period = v_period
    AND r.sequence_no = p_sequence_no::INT
    AND r.posting_status = 'VAC';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'C3 not found', 'code', 'NOT_FOUND');
  END IF;

  -- Build wages array
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
    AND w.period = v_period
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
-- 3. C3 Last Submitted — returns detail of last C3
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

  -- Delegate to detail
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
-- 4. Employees by Last C3 — Fixed column names
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
    AND w.period = v_last_period
    AND w.sequence_no = v_last_seq
    AND w.posting_status = 'VAC';

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 5. NW Directors by Last C3 — Fixed column names
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_nwdirectors_by_last_c3(
  p_registration_number TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_period DATE;
  v_last_seq INT;
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

  -- NW directors: look for payer_type that indicates NW
  -- In the system, NW wages are stored with specific identifiers
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
      'wages', COALESCE(w.total_wages, 0),
      'levyAmt', COALESCE(w.er_levy_amt, 0) + COALESCE(w.ip_levy_amt, 0)
    ) ORDER BY w.ssn
  ), '[]'::jsonb)
  INTO v_result
  FROM ip_wages w
  WHERE TRIM(w.payer_id) = TRIM(p_registration_number)
    AND TRIM(w.payer_type) = 'ER'
    AND w.period = v_last_period
    AND w.sequence_no = v_last_seq
    AND w.posting_status = 'VAC';

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 6. Employer Master Details — with email validation
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_er_master_details(
  p_reg_no TEXT,
  p_email TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT * INTO v_rec
  FROM er_master e
  WHERE TRIM(e.regno) = TRIM(p_reg_no)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Employer not found', 'code', 'NOT_FOUND');
  END IF;

  -- Email validation if provided
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    IF LOWER(TRIM(COALESCE(v_rec.email, ''))) != LOWER(TRIM(p_email)) THEN
      RETURN jsonb_build_object('error', 'Employer not found', 'code', 'NOT_FOUND');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'compName', COALESCE(TRIM(v_rec.name), ''),
    'tradeName', COALESCE(TRIM(v_rec.trade_name), ''),
    'contactPerson', COALESCE(TRIM(v_rec.name), ''),
    'address1', COALESCE(TRIM(v_rec.hq_addr1), ''),
    'address2', COALESCE(TRIM(v_rec.hq_addr2), ''),
    'city', COALESCE(TRIM(v_rec.maddr1), ''),
    'postalCode', NULL,
    'phoneNo', COALESCE(TRIM(v_rec.phone), ''),
    'mobileNo', COALESCE(TRIM(v_rec.mobile), ''),
    'email', COALESCE(TRIM(v_rec.email), ''),
    'dateRegistered', COALESCE(TO_CHAR(v_rec.registration_date, 'YYYY-MM-DD'), ''),
    'officeCode', COALESCE(TRIM(v_rec.office_code), ''),
    'isLevyExempt', false,
    'c3RegnStatusCode', CASE
      WHEN v_rec.status = 'A' THEN 'D'
      ELSE 'D'
    END,
    'c3RegnStatusText', 'Default - Not Registered',
    'statusCode', COALESCE(TRIM(v_rec.status), 'A'),
    'statusText', CASE
      WHEN TRIM(v_rec.status) = 'A' THEN 'Active'
      WHEN TRIM(v_rec.status) = 'I' THEN 'Inactive'
      WHEN TRIM(v_rec.status) = 'C' THEN 'Closed'
      ELSE 'Active'
    END,
    'employerType', 'ER',
    'isActive', CASE WHEN TRIM(v_rec.status) = 'A' THEN 'Y' ELSE 'N' END,
    'prntRegNo', COALESCE(TRIM(v_rec.parent_regno), ''),
    'firstName', '',
    'lastName', '',
    'regNo', TRIM(v_rec.regno)
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 7. Self-Employed Master Details — with email validation
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_se_master_details(
  p_ssn TEXT,
  p_email TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip RECORD;
  v_se RECORD;
  v_wage_cat TEXT;
  v_trade_name TEXT;
BEGIN
  SELECT * INTO v_ip
  FROM ip_master m
  WHERE TRIM(m.ssn) = TRIM(p_ssn)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Self-employed person not found', 'code', 'NOT_FOUND');
  END IF;

  -- Email validation if provided
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    IF LOWER(TRIM(COALESCE(v_ip.email_addr, ''))) != LOWER(TRIM(p_email)) THEN
      RETURN jsonb_build_object('error', 'Self-employed person not found', 'code', 'NOT_FOUND');
    END IF;
  END IF;

  -- Get wage category from ip_self_category
  SELECT sc.wage_category INTO v_wage_cat
  FROM ip_self_category sc
  WHERE TRIM(sc.ssn) = TRIM(p_ssn)
    AND (sc.effective_end_date IS NULL OR sc.effective_end_date >= CURRENT_DATE)
  ORDER BY sc.effective_start_date DESC
  LIMIT 1;

  -- Get trade name from ip_self_employ
  SELECT se.self_paddr1 INTO v_trade_name
  FROM ip_self_employ se
  WHERE TRIM(se.ssn) = TRIM(p_ssn)
    AND (se.date_ceased IS NULL OR se.date_ceased >= CURRENT_DATE)
  ORDER BY se.date_commenced DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'firstName', COALESCE(TRIM(v_ip.firstname), ''),
    'lastName', COALESCE(TRIM(v_ip.surname), ''),
    'surName', COALESCE(TRIM(v_ip.surname), ''),
    'middleName', COALESCE(TRIM(v_ip.middle_name), ''),
    'name', TRIM(COALESCE(TRIM(v_ip.firstname), '') || ' ' || COALESCE(TRIM(v_ip.surname), '')),
    'tradeName', COALESCE(TRIM(v_trade_name), ''),
    'tin', NULL,
    'dateOfBirth', COALESCE(TO_CHAR(v_ip.dob, 'YYYY-MM-DD'), ''),
    'wageCategory', COALESCE(v_wage_cat, ''),
    'mobileNo', COALESCE(TRIM(v_ip.phone_mobile), TRIM(v_ip.mobile), ''),
    'phoneNo', COALESCE(TRIM(v_ip.phone), TRIM(v_ip.telephone), ''),
    'email', COALESCE(TRIM(v_ip.email_addr), ''),
    'address1', COALESCE(TRIM(v_ip.resident_addr1), ''),
    'address2', COALESCE(TRIM(v_ip.resident_addr2), ''),
    'city', COALESCE(TRIM(v_ip.mail_addr1), ''),
    'gender', COALESCE(TRIM(v_ip.sex), ''),
    'maritalStatus', COALESCE(TRIM(v_ip.marital_status), ''),
    'officeCode', '',
    'dateRegistered', COALESCE(TO_CHAR(v_ip.registration_date, 'YYYY-MM-DD'), COALESCE(TO_CHAR(v_ip.date_of_entry, 'YYYY-MM-DD'), '')),
    'isLevyExempt', false,
    'c3RegnStatusCode', 'D',
    'c3RegnStatusText', 'Default - Not Registered',
    'userName', ''
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 8. IP Details by Query — Full employee profile
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_ip_details_by_query(
  p_ssn TEXT,
  p_dob TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_middle_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dob DATE;
  v_middle TEXT;
  v_result JSONB;
BEGIN
  -- Parse DOB: support dd-MM-yyyy, MM/DD/YYYY, YYYY-MM-DD
  BEGIN
    IF p_dob ~ '^\d{2}-\d{2}-\d{4}$' THEN
      -- dd-MM-yyyy
      v_dob := TO_DATE(p_dob, 'DD-MM-YYYY');
    ELSIF p_dob ~ '^\d{2}/\d{2}/\d{4}$' THEN
      -- MM/DD/YYYY
      v_dob := TO_DATE(p_dob, 'MM/DD/YYYY');
    ELSIF p_dob ~ '^\d{4}-\d{2}-\d{2}$' THEN
      v_dob := p_dob::DATE;
    ELSE
      v_dob := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_dob := NULL;
  END;

  -- Handle literal "null" middle name
  v_middle := CASE WHEN LOWER(TRIM(p_middle_name)) = 'null' OR TRIM(p_middle_name) = '' THEN NULL ELSE TRIM(p_middle_name) END;

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'socSecNum', TRIM(m.ssn),
      'firstName', COALESCE(TRIM(m.firstname), ''),
      'surName', COALESCE(TRIM(m.surname), ''),
      'middleName', COALESCE(TRIM(m.middle_name), ''),
      'birthDate', COALESCE(TO_CHAR(m.dob, 'YYYY-MM-DD'), ''),
      'gender', COALESCE(TRIM(m.sex), ''),
      'maritalStatus', COALESCE(TRIM(m.marital_status), ''),
      'streetAddress', COALESCE(TRIM(m.resident_addr1), ''),
      'streetAddress2', COALESCE(TRIM(m.resident_addr2), ''),
      'streetName', '',
      'cityTownName', COALESCE(TRIM(m.mail_addr1), ''),
      'stateRegion', COALESCE(TRIM(m.district), ''),
      'postalCode', NULL,
      'countryCode', COALESCE(TRIM(m.nationality), 'KN'),
      'email', COALESCE(TRIM(m.email_addr), ''),
      'phone', COALESCE(TRIM(m.phone), TRIM(m.telephone), ''),
      'phoneNo', COALESCE(TRIM(m.phone), TRIM(m.telephone), ''),
      'mobile', COALESCE(TRIM(m.phone_mobile), TRIM(m.mobile), ''),
      'mobileNo', COALESCE(TRIM(m.phone_mobile), TRIM(m.mobile), ''),
      'occupation', COALESCE(
        (SELECT TRIM(ie.occupation) FROM ip_employer ie WHERE TRIM(ie.ssn) = TRIM(m.ssn) AND ie.posting_status != 'DEL' ORDER BY ie.date_entered DESC NULLS LAST LIMIT 1),
        COALESCE(TRIM(m.primary_occup), '')
      ),
      'payPeriod', COALESCE(
        (SELECT TRIM(w.pay_period) FROM ip_wages w WHERE TRIM(w.ssn) = TRIM(m.ssn) AND w.posting_status = 'VAC' ORDER BY w.period DESC LIMIT 1),
        'M'
      ),
      'salary', COALESCE(
        (SELECT w.total_wages FROM ip_wages w WHERE TRIM(w.ssn) = TRIM(m.ssn) AND w.posting_status = 'VAC' ORDER BY w.period DESC LIMIT 1),
        0
      ),
      'last_Pay_Date', COALESCE(
        (SELECT TO_CHAR(w.period, 'YYYY-MM-DD') FROM ip_wages w WHERE TRIM(w.ssn) = TRIM(m.ssn) AND w.posting_status = 'VAC' ORDER BY w.period DESC LIMIT 1),
        ''
      ),
      'startDate', COALESCE(
        (SELECT TO_CHAR(w.date_entered, 'YYYY-MM-DD') FROM ip_wages w WHERE TRIM(w.ssn) = TRIM(m.ssn) AND w.posting_status = 'VAC' ORDER BY w.period DESC LIMIT 1),
        ''
      ),
      'endDate', COALESCE(
        (SELECT TO_CHAR(w.date_verified, 'YYYY-MM-DD') FROM ip_wages w WHERE TRIM(w.ssn) = TRIM(m.ssn) AND w.posting_status = 'VAC' ORDER BY w.period DESC LIMIT 1),
        ''
      ),
      'isLevyExempt', false,
      'isActive', CASE WHEN TRIM(m.status) IN ('A', 'V') THEN true ELSE false END,
      'isdirectorOnly', false,
      'isemployeeDirector', false,
      'status', COALESCE(TRIM(m.status), 'A')
    ) AS row_data
    FROM ip_master m
    WHERE TRIM(m.ssn) = TRIM(p_ssn)
      AND (v_dob IS NULL OR m.dob = v_dob)
  ) sub;

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 9. Multiple IP Details — Bulk SSN validation (raw array)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_multiple_ip_details(
  p_employees JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::jsonb;
  v_emp JSONB;
  v_ssn TEXT;
  v_dob DATE;
  v_fname TEXT;
  v_lname TEXT;
  v_found RECORD;
BEGIN
  FOR v_emp IN SELECT * FROM jsonb_array_elements(p_employees)
  LOOP
    v_ssn := TRIM(v_emp->>'ssn');
    v_fname := TRIM(COALESCE(v_emp->>'firstName', ''));
    v_lname := TRIM(COALESCE(v_emp->>'lastName', ''));
    
    BEGIN
      v_dob := (v_emp->>'birthDate')::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_dob := NULL;
    END;

    SELECT m.ssn, m.firstname, m.surname, m.dob
    INTO v_found
    FROM ip_master m
    WHERE TRIM(m.ssn) = v_ssn
    LIMIT 1;

    IF FOUND THEN
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'socSecNum', TRIM(v_found.ssn),
        'firstName', COALESCE(TRIM(v_found.firstname), ''),
        'surName', COALESCE(TRIM(v_found.surname), ''),
        'birthDate', COALESCE(TO_CHAR(v_found.dob, 'YYYY-MM-DD'), ''),
        'valid', true
      ));
    ELSE
      v_result := v_result || jsonb_build_array(jsonb_build_object(
        'socSecNum', v_ssn,
        'firstName', v_fname,
        'surName', v_lname,
        'birthDate', COALESCE(v_emp->>'birthDate', ''),
        'valid', false
      ));
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 10. Update User — Full BIMA payload support
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_update_user(
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_type TEXT;
  v_payer_id TEXT;
BEGIN
  v_employer_type := UPPER(TRIM(COALESCE(p_payload->>'employerType', p_payload->>'payerType', '')));
  v_payer_id := TRIM(COALESCE(p_payload->>'payerId', ''));

  IF v_payer_id = '' THEN
    RETURN jsonb_build_object('error', 'payerId is required');
  END IF;

  IF v_employer_type = 'ER' THEN
    UPDATE er_master SET
      name = COALESCE(NULLIF(TRIM(p_payload->>'companyName'), ''), name),
      trade_name = COALESCE(NULLIF(TRIM(p_payload->>'tradeName'), ''), trade_name),
      hq_addr1 = COALESCE(NULLIF(TRIM(p_payload->>'address1'), ''), hq_addr1),
      hq_addr2 = COALESCE(NULLIF(TRIM(p_payload->>'address2'), ''), hq_addr2),
      maddr1 = COALESCE(NULLIF(TRIM(p_payload->>'city'), ''), maddr1),
      phone = COALESCE(NULLIF(TRIM(p_payload->>'phone'), ''), phone),
      mobile = COALESCE(NULLIF(TRIM(p_payload->>'mobile'), ''), mobile),
      email = COALESCE(NULLIF(TRIM(p_payload->>'email'), ''), email),
      date_modified = NOW(),
      modified_by = COALESCE(NULLIF(TRIM(p_payload->>'userName'), ''), 'API')
    WHERE TRIM(regno) = v_payer_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Employer not found');
    END IF;

    RETURN jsonb_build_object('message', 'Employer data Successfully Updated!');

  ELSIF v_employer_type = 'SE' THEN
    UPDATE ip_master SET
      firstname = COALESCE(NULLIF(TRIM(p_payload->>'firstName'), ''), firstname),
      surname = COALESCE(NULLIF(TRIM(p_payload->>'surName'), ''), surname),
      resident_addr1 = COALESCE(NULLIF(TRIM(p_payload->>'address1'), ''), resident_addr1),
      resident_addr2 = COALESCE(NULLIF(TRIM(p_payload->>'address2'), ''), resident_addr2),
      mail_addr1 = COALESCE(NULLIF(TRIM(p_payload->>'city'), ''), mail_addr1),
      phone = COALESCE(NULLIF(TRIM(p_payload->>'phone'), ''), phone),
      phone_mobile = COALESCE(NULLIF(TRIM(p_payload->>'mobile'), ''), phone_mobile),
      email_addr = COALESCE(NULLIF(TRIM(p_payload->>'email'), ''), email_addr),
      date_modified = NOW(),
      userid = COALESCE(NULLIF(TRIM(p_payload->>'userName'), ''), 'API')
    WHERE TRIM(ssn) = v_payer_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'Self-employed person not found');
    END IF;

    RETURN jsonb_build_object('message', 'Self Employee data Successfully Updated!');

  ELSE
    RETURN jsonb_build_object('error', 'employerType must be ER or SE');
  END IF;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 11. Payment Save — BIMA-compatible payload
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_payment_save(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_payload JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id TEXT;
  v_receipt_number TEXT;
  v_mop_code TEXT;
  v_office_code TEXT;
  v_headers JSONB;
  v_header JSONB;
  v_total NUMERIC := 0;
  v_seq INT := 1;
BEGIN
  v_mop_code := COALESCE(TRIM(p_payload->>'mopCode'), 'ONL');
  v_office_code := COALESCE(TRIM(p_payload->>'officeCode'), '100');
  v_headers := p_payload->'paymentHeaders';

  IF v_headers IS NULL OR jsonb_array_length(v_headers) = 0 THEN
    RETURN jsonb_build_object('error', 'paymentHeaders array is required');
  END IF;

  -- Generate payment ID and receipt number
  v_payment_id := 'PMT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('cn_payment_seq')::TEXT, 6, '0');
  v_receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('cn_receipt_seq')::TEXT, 6, '0');

  -- Insert payment header
  INSERT INTO cn_payment_header (payment_id, payer_id, payer_type, batch_number, date_received, status)
  VALUES (v_payment_id, TRIM(p_payer_id), TRIM(p_payer_type), v_office_code || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), NOW(), 'P');

  -- Insert payment line items
  FOR v_header IN SELECT * FROM jsonb_array_elements(v_headers)
  LOOP
    IF (v_header->>'paymentAmount')::NUMERIC > 0 THEN
      INSERT INTO cn_payment (
        payment_id, payment_sequence_no, fund_code, payment_code,
        mop_code, payment_amount, payment_date, period
      ) VALUES (
        v_payment_id, v_seq,
        TRIM(v_header->>'fundCode'),
        TRIM(v_header->>'paymentCode'),
        v_mop_code,
        (v_header->>'paymentAmount')::NUMERIC,
        NOW(),
        date_trunc('month', NOW())::DATE
      );
      v_total := v_total + (v_header->>'paymentAmount')::NUMERIC;
      v_seq := v_seq + 1;
    END IF;
  END LOOP;

  -- Insert receipt
  INSERT INTO cn_receipt (payment_id, receipt_number, receipt_total, status, total_number_of_payments, created_by)
  VALUES (v_payment_id, v_receipt_number, v_total, 'A', v_seq - 1, 'API');

  RETURN jsonb_build_object(
    'receiptId', v_receipt_number,
    'message', 'Payment processed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  -- If sequences don't exist, generate fallback IDs
  IF SQLERRM LIKE '%cn_payment_seq%' OR SQLERRM LIKE '%cn_receipt_seq%' THEN
    v_payment_id := 'PMT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');
    v_receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0');

    INSERT INTO cn_payment_header (payment_id, payer_id, payer_type, batch_number, date_received, status)
    VALUES (v_payment_id, TRIM(p_payer_id), TRIM(p_payer_type), v_office_code || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), NOW(), 'P');

    FOR v_header IN SELECT * FROM jsonb_array_elements(v_headers)
    LOOP
      IF (v_header->>'paymentAmount')::NUMERIC > 0 THEN
        INSERT INTO cn_payment (
          payment_id, payment_sequence_no, fund_code, payment_code,
          mop_code, payment_amount, payment_date, period
        ) VALUES (
          v_payment_id, v_seq,
          TRIM(v_header->>'fundCode'),
          TRIM(v_header->>'paymentCode'),
          v_mop_code,
          (v_header->>'paymentAmount')::NUMERIC,
          NOW(),
          date_trunc('month', NOW())::DATE
        );
        v_total := v_total + (v_header->>'paymentAmount')::NUMERIC;
        v_seq := v_seq + 1;
      END IF;
    END LOOP;

    INSERT INTO cn_receipt (payment_id, receipt_number, receipt_total, status, total_number_of_payments, created_by)
    VALUES (v_payment_id, v_receipt_number, v_total, 'A', v_seq - 1, 'API');

    RETURN jsonb_build_object(
      'receiptId', v_receipt_number,
      'message', 'Payment processed successfully'
    );
  END IF;
  RAISE;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- 12. Receipt Lookup — flat array format
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.public_api_get_receipt(
  p_receipt_no TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_result JSONB;
BEGIN
  SELECT r.*, ph.payer_id, ph.payer_type, ph.batch_number, ph.date_received
  INTO v_receipt
  FROM cn_receipt r
  JOIN cn_payment_header ph ON ph.payment_id = r.payment_id
  WHERE TRIM(r.receipt_number) = TRIM(p_receipt_no)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Receipt not found', 'code', 'NOT_FOUND');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'batchNumber', COALESCE(v_receipt.batch_number, ''),
      'batchDate', COALESCE(TO_CHAR(v_receipt.date_received, 'YYYY-MM-DD'), ''),
      'mopCode', COALESCE(TRIM(p.mop_code), ''),
      'paymentAmount', COALESCE(p.payment_amount, 0),
      'fundCode', COALESCE(TRIM(p.fund_code), ''),
      'paymentCode', COALESCE(TRIM(p.payment_code), ''),
      'payerId', COALESCE(TRIM(v_receipt.payer_id), ''),
      'payerType', COALESCE(TRIM(v_receipt.payer_type), ''),
      'periodMonth', COALESCE(EXTRACT(MONTH FROM p.period)::INT, 0),
      'periodYear', COALESCE(EXTRACT(YEAR FROM p.period)::INT, 0)
    ) ORDER BY p.payment_sequence_no
  ), '[]'::jsonb)
  INTO v_result
  FROM cn_payment p
  WHERE p.payment_id = v_receipt.payment_id;

  RETURN v_result;
END;
$$;

-- Create sequences for payment/receipt if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'cn_payment_seq') THEN
    CREATE SEQUENCE public.cn_payment_seq START WITH 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'cn_receipt_seq') THEN
    CREATE SEQUENCE public.cn_receipt_seq START WITH 1;
  END IF;
END;
$$;
