
-- Fix ER & SE Master Detail RPCs: correct column name references
-- ER: reg_no→regno, comp_name→name, date_registered→registration_date, prnt_reg_no→parent_regno, remove c3_reg_status
-- SE: address1→resident_addr1, address2→resident_addr2, effective_date→effective_start_date, TRIM(wage_category)→TRIM(wage_category::TEXT)

DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_er_master_details(TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.public_api_se_master_details(TEXT);

-- Recreate ER Master Details with corrected column names
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
  -- Email is mandatory
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RETURN jsonb_build_object('error', 'Email is required', 'code', 'BAD_REQUEST');
  END IF;

  SELECT * INTO v_rec
  FROM er_master
  WHERE TRIM(regno) = TRIM(p_reg_no);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Employer not found', 'code', 'NOT_FOUND');
  END IF;

  -- Email validation: must match
  IF LOWER(TRIM(COALESCE(v_rec.email, ''))) <> LOWER(TRIM(p_email)) THEN
    RETURN jsonb_build_object('error', 'Email does not match records', 'code', 'NOT_FOUND');
  END IF;

  -- Status mapping
  CASE UPPER(TRIM(COALESCE(v_rec.status, '')))
    WHEN 'A' THEN v_status_code := 'A'; v_status_text := 'Active';
    WHEN 'I' THEN v_status_code := 'I'; v_status_text := 'Inactive';
    WHEN 'C' THEN v_status_code := 'C'; v_status_text := 'Closed';
    ELSE v_status_code := COALESCE(v_rec.status, ''); v_status_text := 'Unknown';
  END CASE;

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
    'statusCode', v_status_code,
    'statusText', v_status_text,
    'employerType', 'ER',
    'isActive', CASE WHEN UPPER(TRIM(COALESCE(v_rec.status, ''))) = 'A' THEN 'true' ELSE 'false' END,
    'prntRegNo', COALESCE(TRIM(v_rec.parent_regno), ''),
    'firstName', '',
    'lastName', '',
    'regNo', COALESCE(TRIM(v_rec.regno), '')
  );
END;
$$;

-- Recreate SE Master Details with corrected column names and type casting
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
  v_status_code TEXT;
  v_status_text TEXT;
BEGIN
  -- Email is mandatory
  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RETURN jsonb_build_object('error', 'Email is required', 'code', 'BAD_REQUEST');
  END IF;

  SELECT * INTO v_ip
  FROM ip_master
  WHERE TRIM(ssn) = TRIM(p_ssn);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Self-employed person not found', 'code', 'NOT_FOUND');
  END IF;

  -- Email validation: must match
  IF LOWER(TRIM(COALESCE(v_ip.email_addr, ''))) <> LOWER(TRIM(p_email)) THEN
    RETURN jsonb_build_object('error', 'Email does not match records', 'code', 'NOT_FOUND');
  END IF;

  -- Get self-employ record
  SELECT * INTO v_se
  FROM ip_self_employ
  WHERE TRIM(ssn) = TRIM(p_ssn)
  ORDER BY date_commenced DESC NULLS LAST
  LIMIT 1;

  -- Get wage category (cast numeric to text before TRIM)
  SELECT COALESCE(TRIM(wage_category::TEXT), '') INTO v_wage_cat
  FROM ip_self_category
  WHERE TRIM(ssn) = TRIM(p_ssn)
  ORDER BY effective_start_date DESC NULLS LAST
  LIMIT 1;

  IF v_wage_cat IS NULL THEN v_wage_cat := ''; END IF;

  -- Status mapping
  CASE UPPER(TRIM(COALESCE(v_se.status, COALESCE(v_ip.status, ''))))
    WHEN 'A' THEN v_status_code := 'A'; v_status_text := 'Active';
    WHEN 'P' THEN v_status_code := 'P'; v_status_text := 'Pending';
    WHEN 'I' THEN v_status_code := 'I'; v_status_text := 'Inactive';
    WHEN 'C' THEN v_status_code := 'C'; v_status_text := 'Ceased';
    ELSE v_status_code := COALESCE(v_se.status, ''); v_status_text := 'Unknown';
  END CASE;

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
    'statusCode', v_status_code,
    'statusText', v_status_text,
    'isActive', CASE WHEN v_status_code = 'A' THEN 'true' ELSE 'false' END
  );
END;
$$;
