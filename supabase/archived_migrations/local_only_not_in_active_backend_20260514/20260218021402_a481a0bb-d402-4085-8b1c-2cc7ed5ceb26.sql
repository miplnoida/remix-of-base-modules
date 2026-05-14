
-- ============================================================
-- Fix: Remove stale dependant staging warning from
--      validate_application_for_conversion RPC.
-- The conversion now uses convert_application_atomic which
-- inserts dependants directly into ip_depend inside a single
-- transaction. No staging table is used. No manual linking
-- is required. Both stale messages are corrected here.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_application_for_conversion(
  p_reference_number   TEXT DEFAULT NULL,
  p_first_name         TEXT DEFAULT NULL,
  p_last_name          TEXT DEFAULT NULL,
  p_middle_name        TEXT DEFAULT NULL,
  p_second_middle_name TEXT DEFAULT NULL,
  p_title              TEXT DEFAULT NULL,
  p_suffix             TEXT DEFAULT NULL,
  p_maiden_name        TEXT DEFAULT NULL,
  p_alias              TEXT DEFAULT NULL,
  p_gender             TEXT DEFAULT NULL,
  p_date_of_birth      TEXT DEFAULT NULL,
  p_nationality        TEXT DEFAULT NULL,
  p_marital_status     TEXT DEFAULT NULL,
  p_birth_place        TEXT DEFAULT NULL,
  p_eye_color          TEXT DEFAULT NULL,
  p_address_line1      TEXT DEFAULT NULL,
  p_address_line2      TEXT DEFAULT NULL,
  p_postal_district    TEXT DEFAULT NULL,
  p_mailing_addr1      TEXT DEFAULT NULL,
  p_mailing_addr2      TEXT DEFAULT NULL,
  p_email              TEXT DEFAULT NULL,
  p_phone              TEXT DEFAULT NULL,
  p_phone_mobile       TEXT DEFAULT NULL,
  p_contact_name       TEXT DEFAULT NULL,
  p_contact_relation   TEXT DEFAULT NULL,
  p_contact_addr1      TEXT DEFAULT NULL,
  p_contact_addr2      TEXT DEFAULT NULL,
  p_contact_email      TEXT DEFAULT NULL,
  p_contact_phone      TEXT DEFAULT NULL,
  p_contact_mobile     TEXT DEFAULT NULL,
  p_father_name        TEXT DEFAULT NULL,
  p_mother_name        TEXT DEFAULT NULL,
  p_spouse_name        TEXT DEFAULT NULL,
  p_spouse_addr1       TEXT DEFAULT NULL,
  p_spouse_addr2       TEXT DEFAULT NULL,
  p_spouse_ssn         TEXT DEFAULT NULL,
  p_spouse_dob         TEXT DEFAULT NULL,
  p_beneficiary_name   TEXT DEFAULT NULL,
  p_ben_addr1          TEXT DEFAULT NULL,
  p_ben_addr2          TEXT DEFAULT NULL,
  p_witness_name       TEXT DEFAULT NULL,
  p_occupation         TEXT DEFAULT NULL,
  p_employer_name      TEXT DEFAULT NULL,
  p_employer_address   TEXT DEFAULT NULL,
  p_employer_phone     TEXT DEFAULT NULL,
  p_employer_town      TEXT DEFAULT NULL,
  p_remarks            TEXT DEFAULT NULL,
  p_dependants         JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors    JSONB := '[]'::JSONB;
  v_warnings  JSONB := '[]'::JSONB;
  v_dep       JSONB;
  v_dep_idx   INT := 0;
  v_dob_date  DATE;
  v_rel_exists BOOLEAN;
BEGIN
  -- Already converted?
  IF p_reference_number IS NOT NULL AND EXISTS (
    SELECT 1 FROM ip_master WHERE application_reference_number = p_reference_number
  ) THEN
    RETURN jsonb_build_object(
      'valid', false, 'already_converted', true,
      'errors', jsonb_build_array(jsonb_build_object(
        'field','reference_number','type','DUPLICATE',
        'message','This application has already been converted to an IP record.'
      )),
      'warnings', '[]'::JSONB, 'error_count', 1, 'warning_count', 0
    );
  END IF;

  -- First Name (NOT NULL varchar 25)
  IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
    v_errors := v_errors || jsonb_build_object('field','firstName','type','MISSING','message','First name is required.');
  ELSIF LENGTH(TRIM(p_first_name)) > 25 THEN
    v_warnings := v_warnings || jsonb_build_object('field','firstName','type','LENGTH',
      'message','First name exceeds 25 chars; will be truncated.');
  END IF;

  -- Last Name (NOT NULL varchar 25)
  IF p_last_name IS NULL OR TRIM(p_last_name) = '' THEN
    v_errors := v_errors || jsonb_build_object('field','lastName','type','MISSING','message','Last name is required.');
  ELSIF LENGTH(TRIM(p_last_name)) > 25 THEN
    v_warnings := v_warnings || jsonb_build_object('field','lastName','type','LENGTH',
      'message','Last name exceeds 25 chars; will be truncated.');
  END IF;

  -- Date of Birth (NOT NULL date)
  IF p_date_of_birth IS NULL OR TRIM(p_date_of_birth) = '' THEN
    v_errors := v_errors || jsonb_build_object('field','dateOfBirth','type','MISSING','message','Date of birth is required.');
  ELSE
    BEGIN
      v_dob_date := p_date_of_birth::DATE;
      IF v_dob_date > CURRENT_DATE THEN
        v_errors := v_errors || jsonb_build_object('field','dateOfBirth','type','INVALID',
          'message','Date of birth cannot be in the future.');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('field','dateOfBirth','type','INVALID',
        'message','Date of birth "' || p_date_of_birth || '" is not a valid date.');
    END;
  END IF;

  -- Gender (NOT NULL char 1)
  IF p_gender IS NULL OR TRIM(p_gender) = '' THEN
    v_errors := v_errors || jsonb_build_object('field','gender','type','MISSING','message','Gender is required.');
  ELSIF TRIM(p_gender) NOT IN ('M','F','N','Male','Female','Not-Specified') THEN
    v_warnings := v_warnings || jsonb_build_object('field','gender','type','INVALID',
      'message','Gender value "' || p_gender || '" will be normalised to first character.');
  END IF;

  -- Marital Status (NOT NULL varchar 20, defaults to S)
  IF p_marital_status IS NULL OR TRIM(p_marital_status) = '' THEN
    v_warnings := v_warnings || jsonb_build_object('field','maritalStatus','type','MISSING',
      'message','Marital status missing; will default to Single (S).');
  END IF;

  -- Email length (ip_master.email_addr is VARCHAR 40)
  IF p_email IS NOT NULL AND TRIM(p_email) != '' THEN
    IF LENGTH(TRIM(p_email)) > 40 THEN
      v_errors := v_errors || jsonb_build_object('field','email','type','LENGTH',
        'message','Email address has ' || LENGTH(TRIM(p_email)) || ' chars; limit is 40. Email will be truncated - please shorten it before converting.');
    END IF;
  END IF;

  -- Address fields (VARCHAR 30)
  IF p_address_line1 IS NOT NULL AND LENGTH(TRIM(p_address_line1)) > 30 THEN
    v_warnings := v_warnings || jsonb_build_object('field','addressLine1','type','LENGTH',
      'message','Residential address line 1 (' || LENGTH(TRIM(p_address_line1)) || ' chars) will be truncated to 30.');
  END IF;
  IF p_address_line2 IS NOT NULL AND LENGTH(TRIM(p_address_line2)) > 30 THEN
    v_warnings := v_warnings || jsonb_build_object('field','addressLine2','type','LENGTH',
      'message','Residential address line 2 (' || LENGTH(TRIM(p_address_line2)) || ' chars) will be truncated to 30.');
  END IF;
  IF p_mailing_addr1 IS NOT NULL AND LENGTH(TRIM(p_mailing_addr1)) > 30 THEN
    v_warnings := v_warnings || jsonb_build_object('field','mailingAddr1','type','LENGTH',
      'message','Mailing address line 1 (' || LENGTH(TRIM(p_mailing_addr1)) || ' chars) will be truncated to 30.');
  END IF;
  IF p_mailing_addr2 IS NOT NULL AND LENGTH(TRIM(p_mailing_addr2)) > 30 THEN
    v_warnings := v_warnings || jsonb_build_object('field','mailingAddr2','type','LENGTH',
      'message','Mailing address line 2 (' || LENGTH(TRIM(p_mailing_addr2)) || ' chars) will be truncated to 30.');
  END IF;

  -- Contact addr fields (VARCHAR 30)
  IF p_contact_addr1 IS NOT NULL AND LENGTH(TRIM(p_contact_addr1)) > 30 THEN
    v_warnings := v_warnings || jsonb_build_object('field','contactAddr1','type','LENGTH',
      'message','Contact address line 1 (' || LENGTH(TRIM(p_contact_addr1)) || ' chars) will be truncated to 30.');
  END IF;
  IF p_contact_addr2 IS NOT NULL AND LENGTH(TRIM(p_contact_addr2)) > 30 THEN
    v_warnings := v_warnings || jsonb_build_object('field','contactAddr2','type','LENGTH',
      'message','Contact address line 2 (' || LENGTH(TRIM(p_contact_addr2)) || ' chars) will be truncated to 30.');
  END IF;
  IF p_contact_email IS NOT NULL AND LENGTH(TRIM(p_contact_email)) > 40 THEN
    v_warnings := v_warnings || jsonb_build_object('field','contactEmail','type','LENGTH',
      'message','Contact email (' || LENGTH(TRIM(p_contact_email)) || ' chars) will be truncated to 40.');
  END IF;

  -- Nationality (NOT NULL varchar 3 — validated against countries)
  IF p_nationality IS NULL OR TRIM(p_nationality) = '' THEN
    v_warnings := v_warnings || jsonb_build_object('field','nationality','type','MISSING',
      'message','Nationality missing; will default to UNK.');
  ELSIF LENGTH(TRIM(p_nationality)) > 3 THEN
    v_warnings := v_warnings || jsonb_build_object('field','nationality','type','LENGTH',
      'message','Nationality code "' || p_nationality || '" has more than 3 chars; will be truncated.');
  END IF;

  -- Spouse SSN (VARCHAR 6)
  IF p_spouse_ssn IS NOT NULL AND LENGTH(TRIM(p_spouse_ssn)) > 6 THEN
    v_warnings := v_warnings || jsonb_build_object('field','spouseSSN','type','LENGTH',
      'message','Spouse SSN "' || p_spouse_ssn || '" exceeds 6 chars; will be truncated.');
  END IF;

  -- Father/Mother/Spouse name length (VARCHAR 35)
  IF p_father_name IS NOT NULL AND LENGTH(TRIM(p_father_name)) > 35 THEN
    v_warnings := v_warnings || jsonb_build_object('field','fatherName','type','LENGTH',
      'message','Father name exceeds 35 chars; will be truncated.');
  END IF;
  IF p_mother_name IS NOT NULL AND LENGTH(TRIM(p_mother_name)) > 35 THEN
    v_warnings := v_warnings || jsonb_build_object('field','motherName','type','LENGTH',
      'message','Mother name exceeds 35 chars; will be truncated.');
  END IF;
  IF p_spouse_name IS NOT NULL AND LENGTH(TRIM(p_spouse_name)) > 35 THEN
    v_warnings := v_warnings || jsonb_build_object('field','spouseName','type','LENGTH',
      'message','Spouse name exceeds 35 chars; will be truncated.');
  END IF;

  -- Dependant validations
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants) LOOP
      v_dep_idx := v_dep_idx + 1;

      -- Check first name
      IF (v_dep->>'firstName') IS NULL OR TRIM(v_dep->>'firstName') = '' THEN
        v_warnings := v_warnings || jsonb_build_object(
          'field', 'dependant[' || v_dep_idx || '].firstName',
          'type', 'MISSING',
          'message', 'Dependant ' || v_dep_idx || ' has no first name; will be stored empty.'
        );
      END IF;

      -- Check relationship code against tb_relation
      -- FIXED: unknown codes are stored as null (not staged for manual review)
      IF (v_dep->>'relationship') IS NOT NULL AND TRIM(v_dep->>'relationship') != '' THEN
        SELECT EXISTS(
          SELECT 1 FROM tb_relation
          WHERE UPPER(TRIM(code)) = UPPER(LEFT(TRIM(v_dep->>'relationship'), 3))
             OR UPPER(TRIM(description)) = UPPER(TRIM(v_dep->>'relationship'))
        ) INTO v_rel_exists;

        IF NOT v_rel_exists THEN
          v_warnings := v_warnings || jsonb_build_object(
            'field', 'dependant[' || v_dep_idx || '].relationship',
            'type', 'INVALID',
            'message', 'Dependant ' || v_dep_idx || ' relation "' || (v_dep->>'relationship') ||
              '" not found in system. The relation code will be stored as null in the system.'
          );
        END IF;
      END IF;

      -- DOB validation
      IF (v_dep->>'dateOfBirth') IS NOT NULL AND (v_dep->>'dateOfBirth') != '' THEN
        BEGIN
          PERFORM (v_dep->>'dateOfBirth')::date;
        EXCEPTION WHEN OTHERS THEN
          v_warnings := v_warnings || jsonb_build_object(
            'field', 'dependant[' || v_dep_idx || '].dateOfBirth',
            'type', 'INVALID',
            'message', 'Dependant ' || v_dep_idx || ' DOB "' || (v_dep->>'dateOfBirth') || '" is invalid; will be stored as null.'
          );
        END;
      END IF;
    END LOOP;
  END IF;

  -- NOTE: The stale INFO warning about dependants being "staged pending SSN assignment"
  -- has been intentionally removed. The conversion now uses convert_application_atomic
  -- which inserts all dependants directly into ip_depend within the same transaction
  -- immediately after the permanent SSN is generated. No staging and no manual linking
  -- is required.

  RETURN jsonb_build_object(
    'valid',             jsonb_array_length(v_errors) = 0,
    'already_converted', false,
    'errors',            v_errors,
    'warnings',          v_warnings,
    'error_count',       jsonb_array_length(v_errors),
    'warning_count',     jsonb_array_length(v_warnings),
    'server_time',       NOW()::text
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'valid', false, 'already_converted', false,
    'errors', jsonb_build_array(jsonb_build_object(
      'field','system','type','SYSTEM_ERROR',
      'message','Validation system error: ' || SQLERRM
    )),
    'warnings', '[]'::JSONB, 'error_count', 1, 'warning_count', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_application_for_conversion TO anon, authenticated;
