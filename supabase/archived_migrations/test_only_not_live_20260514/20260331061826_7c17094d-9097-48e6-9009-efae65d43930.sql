
-- Fix: Enforce active-only validation for ER & SE public API endpoints
-- ER: Reject non-active employers (status != 'A')
-- SE: Require ip_self_employ record exists + status = 'A', remove ip_master status fallback

DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);

-- ER Master Details: now rejects non-active employers
CREATE OR REPLACE FUNCTION public.public_api_er_master_details(
  p_reg_no TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_status_code TEXT;
  v_status_text TEXT;
BEGIN
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RETURN jsonb_build_object('error', 'Email is required', 'code', 'BAD_REQUEST');
  END IF;

  SELECT * INTO v_rec
  FROM er_master
  WHERE TRIM(regno) = TRIM(p_reg_no);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Employer not found', 'code', 'NOT_FOUND');
  END IF;

  -- Email validation
  IF LOWER(TRIM(COALESCE(v_rec.email, ''))) <> LOWER(TRIM(p_email)) THEN
    RETURN jsonb_build_object('error', 'Email does not match records', 'code', 'NOT_FOUND');
  END IF;

  -- NEW: Active status enforcement
  IF UPPER(TRIM(COALESCE(v_rec.status, ''))) <> 'A' THEN
    CASE UPPER(TRIM(COALESCE(v_rec.status, '')))
      WHEN 'I' THEN v_status_text := 'Inactive';
      WHEN 'C' THEN v_status_text := 'Closed';
      WHEN 'P' THEN v_status_text := 'Pending';
      ELSE v_status_text := COALESCE(v_rec.status, 'Unknown');
    END CASE;
    RETURN jsonb_build_object(
      'error', 'Employer is not active (Status: ' || v_status_text || ')',
      'code', 'NOT_ACTIVE'
    );
  END IF;

  RETURN jsonb_build_object(
    'companyName', COALESCE(TRIM(v_rec.name), ''),
    'tradeName', COALESCE(TRIM(v_rec.trade_name), ''),
    'contactPerson', COALESCE(TRIM(v_rec.name), ''),
    'address1', COALESCE(TRIM(v_rec.hq_addr1), ''),
    'address2', COALESCE(TRIM(v_rec.hq_addr2), ''),
    'city', '',
    'postalCode', '',
    'phone', COALESCE(TRIM(v_rec.phone), ''),
    'mobile', COALESCE(TRIM(v_rec.fax), ''),
    'email', COALESCE(TRIM(v_rec.email), ''),
    'dateRegistered', COALESCE(TO_CHAR(v_rec.registration_date, 'DD/MM/YYYY'), ''),
    'officeCode', COALESCE(TRIM(v_rec.office_code), ''),
    'isLevyExempt', false,
    'c3RegnStatusCode', 'D',
    'c3RegnStatusText', 'Not Registered',
    'statusCode', 'A',
    'statusText', 'Active',
    'employerType', 'ER',
    'isActive', 'true',
    'prntRegNo', COALESCE(TRIM(v_rec.parent_regno), ''),
    'firstName', '',
    'lastName', '',
    'regNo', COALESCE(TRIM(v_rec.regno), '')
  );
END;
$$;

-- SE Master Details: now requires ip_self_employ record + active status
CREATE OR REPLACE FUNCTION public.public_api_se_master_details(
  p_ssn TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip RECORD;
  v_se RECORD;
  v_wage_cat TEXT;
  v_status_text TEXT;
BEGIN
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RETURN jsonb_build_object('error', 'Email is required', 'code', 'BAD_REQUEST');
  END IF;

  SELECT * INTO v_ip
  FROM ip_master
  WHERE TRIM(ssn) = TRIM(p_ssn);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Person not found', 'code', 'NOT_FOUND');
  END IF;

  -- Email validation
  IF LOWER(TRIM(COALESCE(v_ip.email_addr, ''))) <> LOWER(TRIM(p_email)) THEN
    RETURN jsonb_build_object('error', 'Email does not match records', 'code', 'NOT_FOUND');
  END IF;

  -- NEW: Require ip_self_employ record exists
  SELECT * INTO v_se
  FROM ip_self_employ
  WHERE TRIM(ssn) = TRIM(p_ssn)
  ORDER BY date_commenced DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Person is not registered as Self-Employed',
      'code', 'NOT_SE'
    );
  END IF;

  -- NEW: Active status enforcement (using only SE status, no ip_master fallback)
  IF UPPER(TRIM(COALESCE(v_se.status, ''))) <> 'A' THEN
    CASE UPPER(TRIM(COALESCE(v_se.status, '')))
      WHEN 'P' THEN v_status_text := 'Pending';
      WHEN 'I' THEN v_status_text := 'Inactive';
      WHEN 'C' THEN v_status_text := 'Ceased';
      ELSE v_status_text := COALESCE(v_se.status, 'Unknown');
    END CASE;
    RETURN jsonb_build_object(
      'error', 'Self-Employed person is not active (Status: ' || v_status_text || ')',
      'code', 'NOT_ACTIVE'
    );
  END IF;

  -- Get wage category
  SELECT COALESCE(TRIM(wage_category::TEXT), '') INTO v_wage_cat
  FROM ip_self_category
  WHERE TRIM(ssn) = TRIM(p_ssn)
  ORDER BY effective_start_date DESC NULLS LAST
  LIMIT 1;

  IF v_wage_cat IS NULL THEN v_wage_cat := ''; END IF;

  RETURN jsonb_build_object(
    'name', TRIM(COALESCE(v_ip.firstname, '') || ' ' || COALESCE(v_ip.surname, '')),
    'firstName', COALESCE(TRIM(v_ip.firstname), ''),
    'lastName', COALESCE(TRIM(v_ip.surname), ''),
    'tradeName', COALESCE(TRIM(v_se.self_paddr1), ''),
    'address1', COALESCE(TRIM(v_ip.resident_addr1), ''),
    'address2', COALESCE(TRIM(v_ip.resident_addr2), ''),
    'city', '',
    'postalCode', '',
    'phone', COALESCE(TRIM(v_se.phone), COALESCE(TRIM(v_ip.phone), '')),
    'mobile', '',
    'email', COALESCE(TRIM(v_ip.email_addr), ''),
    'gender', COALESCE(TRIM(v_ip.sex), ''),
    'dateOfBirth', COALESCE(TO_CHAR(v_ip.dob, 'DD/MM/YYYY'), ''),
    'dateRegistered', COALESCE(TO_CHAR(v_se.date_commenced, 'DD/MM/YYYY'), ''),
    'officeCode', COALESCE(TRIM(v_se.office_code), ''),
    'wageCategory', v_wage_cat,
    'tin', '',
    'userName', '',
    'ssn', COALESCE(TRIM(v_ip.ssn), ''),
    'statusCode', 'A',
    'statusText', 'Active',
    'isActive', 'true'
  );
END;
$$;
