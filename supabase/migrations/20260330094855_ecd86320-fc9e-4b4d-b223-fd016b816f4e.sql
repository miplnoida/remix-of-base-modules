
-- =====================================================
-- Full BIMA API Replacement: 7 RPCs + 3 Indexes
-- =====================================================

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_er_master_regno ON er_master(regno);
CREATE INDEX IF NOT EXISTS idx_ip_master_ssn_lookup ON ip_master(ssn, dob);
CREATE INDEX IF NOT EXISTS idx_cn_receipt_number ON cn_receipt(receipt_number);

-- =====================================================
-- RPC 1: Employer Master Details
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_er_master_details(p_reg_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'registrationNumber', e.regno,
    'compName', COALESCE(e.name, ''),
    'tradeName', COALESCE(e.trade_name, ''),
    'contactPerson', COALESCE(e.name, ''),
    'firstName', '',
    'lastName', '',
    'address1', COALESCE(e.hq_addr1, ''),
    'address2', COALESCE(e.hq_addr2, ''),
    'mailingAddress1', COALESCE(e.maddr1, ''),
    'mailingAddress2', COALESCE(e.maddr2, ''),
    'postalCode', NULL,
    'phone', COALESCE(e.phone, ''),
    'fax', COALESCE(e.fax, ''),
    'mobile', COALESCE(e.mobile, ''),
    'email', COALESCE(e.email, ''),
    'officeCode', COALESCE(e.office_code, ''),
    'villageCode', COALESCE(e.village_code, ''),
    'sectorCode', COALESCE(e.sector_code, ''),
    'industrialCode', COALESCE(e.industrial_code, ''),
    'activityType', COALESCE(e.activity_type, ''),
    'ownershipCode', COALESCE(e.ownership_code, ''),
    'registrationDate', CASE WHEN e.registration_date IS NOT NULL THEN to_char(e.registration_date, 'YYYY-MM-DD') ELSE NULL END,
    'applicationDate', CASE WHEN e.application_date IS NOT NULL THEN to_char(e.application_date, 'YYYY-MM-DD') ELSE NULL END,
    'dateOfClosure', CASE WHEN e.date_of_closure IS NOT NULL THEN to_char(e.date_of_closure, 'YYYY-MM-DD') ELSE NULL END,
    'dateWagesFirstPaid', CASE WHEN e.date_wages_first_paid IS NOT NULL THEN to_char(e.date_wages_first_paid, 'YYYY-MM-DD') ELSE NULL END,
    'malesEmployed', COALESCE(e.males_employed, 0),
    'femalesEmployed', COALESCE(e.females_employed, 0),
    'expMonthlyIncome', COALESCE(e.exp_mthly_income, 0),
    'statusCode', COALESCE(e.status, ''),
    'statusText', CASE
      WHEN e.status = 'A' THEN 'Active'
      WHEN e.status = 'I' THEN 'Inactive'
      WHEN e.status = 'C' THEN 'Closed'
      WHEN e.status = 'P' THEN 'Pending'
      ELSE COALESCE(e.status, '')
    END,
    'employerType', 'ER',
    'isActive', COALESCE(e.status, '') = 'A',
    'isLevyExempt', false,
    'c3RegnStatusCode', CASE WHEN e.status = 'A' THEN 'R' ELSE 'NR' END,
    'c3RegnStatusText', CASE WHEN e.status = 'A' THEN 'Registered' ELSE 'Not Registered' END,
    'inspectorCode', COALESCE(e.inspector_code, ''),
    'parentRegno', COALESCE(e.parent_regno, ''),
    'registryNum', COALESCE(e.registry_num, ''),
    'arrears', COALESCE(e.arrears, ''),
    'legalAction', COALESCE(e.legal_action, '')
  ) INTO v_result
  FROM er_master e
  WHERE e.regno = p_reg_no;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Employer not found');
  END IF;

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC 2: Self-Employed Master Details
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_se_master_details(p_ssn TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'socialSecurityNumber', m.ssn,
    'firstName', COALESCE(m.firstname, ''),
    'surName', COALESCE(m.surname, ''),
    'middleName', COALESCE(m.middle_name, ''),
    'birthDate', CASE WHEN m.dob IS NOT NULL THEN to_char(m.dob, 'YYYY-MM-DD') ELSE NULL END,
    'sex', COALESCE(m.sex, ''),
    'maritalStatus', COALESCE(m.marital_status, ''),
    'address1', COALESCE(m.resident_addr1, ''),
    'address2', COALESCE(m.resident_addr2, ''),
    'mailingAddress1', COALESCE(m.mail_addr1, ''),
    'mailingAddress2', COALESCE(m.mail_addr2, ''),
    'phone', COALESCE(m.phone, m.telephone, ''),
    'mobile', COALESCE(m.mobile, ''),
    'email', '',
    'selfRefNo', COALESCE(se.self_ref_no, ''),
    'activityType', COALESCE(se.activity_type, ''),
    'occupationCode', COALESCE(se.occupation_code, ''),
    'industrialCode', COALESCE(se.industrial_code, ''),
    'officeCode', COALESCE(se.office_code, ''),
    'villageCode', COALESCE(se.village_code, ''),
    'sectorCode', COALESCE(se.sector_code, ''),
    'dateCommenced', CASE WHEN se.date_commenced IS NOT NULL THEN to_char(se.date_commenced, 'YYYY-MM-DD') ELSE NULL END,
    'dateCeased', CASE WHEN se.date_ceased IS NOT NULL THEN to_char(se.date_ceased, 'YYYY-MM-DD') ELSE NULL END,
    'statusCode', COALESCE(se.status, ''),
    'statusText', CASE
      WHEN se.status = 'A' THEN 'Active'
      WHEN se.status = 'I' THEN 'Inactive'
      WHEN se.status = 'C' THEN 'Closed'
      WHEN se.status = 'P' THEN 'Pending'
      ELSE COALESCE(se.status::text, '')
    END,
    'isActive', COALESCE(se.status, '') = 'A',
    'c3RegnStatusCode', CASE WHEN se.status = 'A' THEN 'R' ELSE 'NR' END,
    'c3RegnStatusText', CASE WHEN se.status = 'A' THEN 'Registered' ELSE 'Not Registered' END,
    'wageCategory', NULL,
    'tin', NULL,
    'userName', ''
  ) INTO v_result
  FROM ip_master m
  LEFT JOIN ip_self_employ se ON se.ssn = m.ssn
  WHERE m.ssn = p_ssn
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Self-employed person not found');
  END IF;

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC 3: IP Details by Query (Employee Lookup)
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_ip_details_by_query(
  p_ssn TEXT,
  p_dob TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_middle_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dob DATE;
  v_result JSONB;
BEGIN
  -- Parse DOB
  BEGIN
    v_dob := p_dob::date;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_dob := to_date(p_dob, 'DD-MM-YYYY');
    EXCEPTION WHEN OTHERS THEN
      v_dob := NULL;
    END;
  END;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'socialSecurityNumber', m.ssn,
      'firstName', COALESCE(m.firstname, ''),
      'surName', COALESCE(m.surname, ''),
      'middleName', COALESCE(m.middle_name, ''),
      'birthDate', CASE WHEN m.dob IS NOT NULL THEN to_char(m.dob, 'YYYY-MM-DD') ELSE NULL END,
      'sex', COALESCE(m.sex, ''),
      'maritalStatus', COALESCE(m.marital_status, ''),
      'nationality', COALESCE(m.nationality, ''),
      'address1', COALESCE(m.resident_addr1, ''),
      'address2', COALESCE(m.resident_addr2, ''),
      'phone', COALESCE(m.phone, m.telephone, ''),
      'mobile', COALESCE(m.mobile, ''),
      'status', COALESCE(m.status, '')
    )
  ), '[]'::JSONB) INTO v_result
  FROM ip_master m
  WHERE (p_ssn = '' OR m.ssn = p_ssn)
    AND (v_dob IS NULL OR m.dob = v_dob)
    AND (p_first_name = '' OR LOWER(m.firstname) LIKE LOWER(p_first_name) || '%')
    AND (p_last_name = '' OR LOWER(m.surname) LIKE LOWER(p_last_name) || '%')
    AND (p_middle_name = '' OR LOWER(COALESCE(m.middle_name, '')) LIKE LOWER(p_middle_name) || '%')
  LIMIT 50;

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC 4: Multiple IP Details (Bulk SSN Validation)
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_multiple_ip_details(p_employees JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'socialSecurityNumber', m.ssn,
      'firstName', COALESCE(m.firstname, ''),
      'surName', COALESCE(m.surname, ''),
      'middleName', COALESCE(m.middle_name, ''),
      'birthDate', CASE WHEN m.dob IS NOT NULL THEN to_char(m.dob, 'YYYY-MM-DD') ELSE NULL END,
      'sex', COALESCE(m.sex, ''),
      'isValid', true
    )
  ), '[]'::JSONB) INTO v_result
  FROM ip_master m
  WHERE m.ssn IN (
    SELECT (elem->>'socSecNum')::text
    FROM jsonb_array_elements(p_employees) AS elem
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- RPC 5: Update User Profile
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_update_user(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payer_type TEXT;
  v_payer_id TEXT;
  v_updated BOOLEAN := false;
BEGIN
  v_payer_type := COALESCE(p_payload->>'payerType', p_payload->>'userType', '');
  v_payer_id := COALESCE(p_payload->>'payerId', p_payload->>'registrationNumber', p_payload->>'ssn', '');

  IF v_payer_id = '' THEN
    RETURN jsonb_build_object('error', 'Missing payerId/registrationNumber/ssn');
  END IF;

  IF v_payer_type = 'ER' THEN
    UPDATE er_master SET
      phone = COALESCE((p_payload->>'phone')::varchar(10), phone),
      mobile = COALESCE((p_payload->>'mobile')::varchar(10), mobile),
      email = COALESCE((p_payload->>'email')::varchar(40), email),
      hq_addr1 = COALESCE((p_payload->>'address1')::varchar(25), hq_addr1),
      hq_addr2 = COALESCE((p_payload->>'address2')::varchar(25), hq_addr2),
      maddr1 = COALESCE((p_payload->>'mailingAddress1')::varchar(25), maddr1),
      maddr2 = COALESCE((p_payload->>'mailingAddress2')::varchar(25), maddr2),
      date_modified = NOW(),
      modified_by = COALESCE(p_payload->>'updatedBy', 'C3-WIZARD')
    WHERE regno = v_payer_id;
    v_updated := FOUND;
  ELSIF v_payer_type = 'SE' THEN
    UPDATE ip_master SET
      phone = COALESCE((p_payload->>'phone')::varchar(10), phone),
      mobile = COALESCE((p_payload->>'mobile')::varchar(15), mobile),
      resident_addr1 = COALESCE((p_payload->>'address1')::varchar(50), resident_addr1),
      resident_addr2 = COALESCE((p_payload->>'address2')::varchar(50), resident_addr2),
      mail_addr1 = COALESCE((p_payload->>'mailingAddress1')::varchar(50), mail_addr1),
      mail_addr2 = COALESCE((p_payload->>'mailingAddress2')::varchar(50), mail_addr2),
      date_modified = NOW()
    WHERE ssn = v_payer_id;
    v_updated := FOUND;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid payerType. Must be ER or SE');
  END IF;

  IF NOT v_updated THEN
    RETURN jsonb_build_object('error', 'Record not found for update');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Profile updated successfully',
    'payerId', v_payer_id,
    'payerType', v_payer_type
  );
END;
$$;

-- =====================================================
-- RPC 6: Payment Save
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_payment_save(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id BIGINT;
  v_receipt_id INTEGER;
  v_receipt_number TEXT;
  v_total NUMERIC(10,2) := 0;
  v_line JSONB;
  v_batch_number TEXT;
BEGIN
  -- Generate batch number
  v_batch_number := 'API-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');

  -- Create payment header
  INSERT INTO cn_payment_header (payer_id, payer_type, batch_number, date_received, remarks)
  VALUES (
    p_payer_id,
    p_payer_type,
    v_batch_number,
    COALESCE((p_payload->>'paymentDate')::timestamp, NOW()),
    COALESCE(p_payload->>'remarks', 'API Payment')
  )
  RETURNING payment_id INTO v_payment_id;

  -- Insert payment lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'payments', '[]'::JSONB))
  LOOP
    INSERT INTO cn_payment (
      payment_id, payment_code, fund_code, mop_code,
      payment_amount, payment_date, period
    ) VALUES (
      v_payment_id,
      COALESCE(v_line->>'paymentCode', 'PC01'),
      COALESCE(v_line->>'fundCode', 'SS'),
      COALESCE(v_line->>'mopCode', p_payload->>'mopCode', 'CSH'),
      COALESCE((v_line->>'amount')::NUMERIC, 0),
      COALESCE((p_payload->>'paymentDate')::timestamp, NOW()),
      COALESCE((v_line->>'period')::timestamp, NOW())
    );
    v_total := v_total + COALESCE((v_line->>'amount')::NUMERIC, 0);
  END LOOP;

  -- Create receipt
  INSERT INTO cn_receipt (payment_id, receipt_total, status, total_number_of_payments, created_by)
  VALUES (v_payment_id, v_total, 'A', 
    COALESCE(jsonb_array_length(p_payload->'payments'), 0),
    COALESCE(p_payload->>'createdBy', 'C3-WIZARD'))
  RETURNING receipt_id INTO v_receipt_id;

  -- Get the auto-generated receipt_number
  SELECT receipt_number INTO v_receipt_number
  FROM cn_receipt WHERE receipt_id = v_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'paymentId', v_payment_id,
    'receiptId', v_receipt_id,
    'receiptNumber', v_receipt_number,
    'totalAmount', v_total,
    'batchNumber', v_batch_number
  );
END;
$$;

-- =====================================================
-- RPC 7: Get Receipt
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_api_get_receipt(p_receipt_no TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'receiptId', r.receipt_id,
    'receiptNumber', r.receipt_number,
    'paymentId', r.payment_id,
    'receiptTotal', r.receipt_total,
    'status', r.status,
    'statusText', CASE
      WHEN r.status = 'A' THEN 'Verified'
      WHEN r.status = 'O' THEN 'Original'
      WHEN r.status = 'C' THEN 'Cancelled'
      ELSE COALESCE(r.status, '')
    END,
    'totalNumberOfPayments', r.total_number_of_payments,
    'createdAt', to_char(r.created_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
    'createdBy', COALESCE(r.created_by, ''),
    'cancelReason', r.cancel_reason,
    'cancelDate', CASE WHEN r.cancel_date IS NOT NULL THEN to_char(r.cancel_date, 'YYYY-MM-DD') ELSE NULL END,
    'payerInfo', jsonb_build_object(
      'payerId', h.payer_id,
      'payerType', h.payer_type,
      'batchNumber', h.batch_number,
      'dateReceived', CASE WHEN h.date_received IS NOT NULL THEN to_char(h.date_received, 'YYYY-MM-DD') ELSE NULL END,
      'remarks', COALESCE(h.remarks, '')
    ),
    'payments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'paymentCode', p.payment_code,
          'fundCode', p.fund_code,
          'mopCode', p.mop_code,
          'paymentAmount', p.payment_amount,
          'paymentDate', CASE WHEN p.payment_date IS NOT NULL THEN to_char(p.payment_date, 'YYYY-MM-DD') ELSE NULL END,
          'period', CASE WHEN p.period IS NOT NULL THEN to_char(p.period, 'YYYY-MM-DD') ELSE NULL END,
          'periodMonth', CASE WHEN p.period IS NOT NULL THEN EXTRACT(MONTH FROM p.period)::INT ELSE NULL END,
          'periodYear', CASE WHEN p.period IS NOT NULL THEN EXTRACT(YEAR FROM p.period)::INT ELSE NULL END,
          'bankCode', COALESCE(p.bank_code, ''),
          'mopNumber', COALESCE(p.mop_number, '')
        )
      )
      FROM cn_payment p WHERE p.payment_id = r.payment_id
    ), '[]'::JSONB)
  ) INTO v_result
  FROM cn_receipt r
  JOIN cn_payment_header h ON h.payment_id = r.payment_id
  WHERE r.receipt_number = p_receipt_no;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Receipt not found');
  END IF;

  RETURN v_result;
END;
$$;
