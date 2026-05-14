
-- ============================================================
-- Fix: convert_application_atomic used wrong column name
-- ip_master has no column named "remarks" — the correct column
-- is "application_remarks". Also fix the validation RPC to
-- reference application_remarks length in its warning.
-- ============================================================

CREATE OR REPLACE FUNCTION public.convert_application_atomic(
  -- ip_master fields
  p_unique_uuid           UUID,
  p_application_id        VARCHAR(20),
  p_temp_ssn              VARCHAR(6),
  p_name_prefix           VARCHAR(6),
  p_firstname             VARCHAR(25),
  p_middle_name           VARCHAR(25),
  p_second_middle_name    VARCHAR(25),
  p_surname               VARCHAR(25),
  p_name_suffix           VARCHAR(6),
  p_previous_name         VARCHAR(25),
  p_alias                 VARCHAR(25),
  p_sex                   CHAR(1),
  p_dob                   DATE,
  p_birth_place           VARCHAR(3),
  p_nationality           VARCHAR(3),
  p_marital_status        VARCHAR(20),
  p_date_married          DATE,
  p_heightfeet            SMALLINT,
  p_heightinches          SMALLINT,
  p_eyecolor              VARCHAR(10),
  p_resident_addr1        VARCHAR(30),
  p_resident_addr2        VARCHAR(30),
  p_district              VARCHAR(3),
  p_mail_addr1            VARCHAR(30),
  p_mail_addr2            VARCHAR(30),
  p_email_addr            VARCHAR(40),
  p_phone                 VARCHAR(15),
  p_phone_mobile          VARCHAR(15),
  p_contact               VARCHAR(35),
  p_contact_relation      VARCHAR(20),
  p_contact_addr1         VARCHAR(30),
  p_contact_addr2         VARCHAR(30),
  p_contact_phone         VARCHAR(10),
  p_contact_mobile        VARCHAR(10),
  p_contact_email         VARCHAR(40),
  p_father_name           VARCHAR(35),
  p_mother_name           VARCHAR(35),
  p_spouse_name           VARCHAR(35),
  p_spouse_addr1          VARCHAR(30),
  p_spouse_addr2          VARCHAR(30),
  p_spouse_ssn            VARCHAR(6),
  p_spouse_dob            DATE,
  p_witness_name          VARCHAR(35),
  p_date_witnessed        DATE,
  p_beneficiary           VARCHAR(35),
  p_ben_addr1             VARCHAR(30),
  p_ben_addr2             VARCHAR(30),
  p_primary_occup         VARCHAR(4),
  p_work_permit           CHAR(1),
  p_work_permit_expiration DATE,
  p_npf                   CHAR(1),
  p_citizenship_flag      CHAR(1),
  p_application_date      DATE,
  p_date_of_residency     DATE,
  p_place_of_residence    VARCHAR(30),
  p_employer_name         VARCHAR(50),
  p_employer_address      VARCHAR(200),
  p_employer_phone        VARCHAR(10),
  p_employer_town         VARCHAR(50),
  p_entered_by            VARCHAR(5),
  p_created_by            UUID,
  p_photo_location        VARCHAR(255),
  p_remarks               TEXT,
  -- Dependants as JSON array of objects
  p_dependants            JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id             UUID;
  v_final_ssn             VARCHAR(6);
  v_submit_result         JSONB;
  v_dep                   JSONB;
  v_depend_id             VARCHAR(6);
  v_dep_idx               INTEGER := 0;
  v_dependants_added      INTEGER := 0;
  v_dep_relation          VARCHAR(3);
  v_dep_sex               CHAR(1);
  v_dep_dob               DATE;
  v_dep_ssn               VARCHAR(6);
BEGIN
  -- ── Step 1: Insert draft record into ip_master (status = 'Z') ──────────────
  INSERT INTO ip_master (
    unique_uuid, application_id, ssn, status,
    name_prefix, firstname, middle_name, second_middle_name,
    surname, name_suffix, previous_name, alias,
    sex, dob, birth_place, nationality,
    marital_status, date_married,
    heightfeet, heightinches, eyecolor,
    resident_addr1, resident_addr2, district,
    mail_addr1, mail_addr2,
    email_addr, telephone, mobile, phone, phone_mobile,
    contact, contact_relation, contact_addr1, contact_addr2,
    contact_phone, contact_mobile, contact_email,
    father_name, mother_name,
    spouse_name, spouse_addr1, spouse_addr2, spouse_ssn, spouse_dob,
    witness_name, date_witnessed,
    beneficiary, ben_addr1, ben_addr2,
    primary_occup, work_permit, work_permit_expiration,
    npf, citizenship_flag, citizenship,
    ip_signature, application_date, date_of_residency, place_of_residence,
    employer_name, employer_address, employer_phone, employer_town,
    photo_location, application_remarks,
    entered_by, created_by, updated_by,
    created_at, updated_at
  )
  VALUES (
    p_unique_uuid, p_application_id, p_temp_ssn, 'Z',
    NULLIF(p_name_prefix, ''), p_firstname, NULLIF(p_middle_name, ''), NULLIF(p_second_middle_name, ''),
    p_surname, NULLIF(p_name_suffix, ''), NULLIF(p_previous_name, ''), NULLIF(p_alias, ''),
    p_sex, p_dob, NULLIF(p_birth_place, ''), p_nationality,
    p_marital_status, p_date_married,
    p_heightfeet, p_heightinches, NULLIF(p_eyecolor, ''),
    NULLIF(p_resident_addr1, ''), NULLIF(p_resident_addr2, ''), NULLIF(p_district, ''),
    NULLIF(p_mail_addr1, ''), NULLIF(p_mail_addr2, ''),
    NULLIF(p_email_addr, ''), NULLIF(p_phone, ''), NULLIF(p_phone_mobile, ''), NULLIF(p_phone, ''), NULLIF(p_phone_mobile, ''),
    NULLIF(p_contact, ''), NULLIF(p_contact_relation, ''), NULLIF(p_contact_addr1, ''), NULLIF(p_contact_addr2, ''),
    NULLIF(p_contact_phone, ''), NULLIF(p_contact_mobile, ''), NULLIF(p_contact_email, ''),
    NULLIF(p_father_name, ''), NULLIF(p_mother_name, ''),
    NULLIF(p_spouse_name, ''), NULLIF(p_spouse_addr1, ''), NULLIF(p_spouse_addr2, ''), NULLIF(p_spouse_ssn, ''), p_spouse_dob,
    NULLIF(p_witness_name, ''), p_date_witnessed,
    NULLIF(p_beneficiary, ''), NULLIF(p_ben_addr1, ''), NULLIF(p_ben_addr2, ''),
    NULLIF(p_primary_occup, ''), COALESCE(p_work_permit, 'N'), p_work_permit_expiration,
    COALESCE(p_npf, 'N'), COALESCE(p_citizenship_flag, 'N'), COALESCE(p_citizenship_flag, 'N'),
    'N', COALESCE(p_application_date, CURRENT_DATE), p_date_of_residency, NULLIF(p_place_of_residence, ''),
    NULLIF(p_employer_name, ''), NULLIF(p_employer_address, ''), NULLIF(p_employer_phone, ''), NULLIF(p_employer_town, ''),
    NULLIF(p_photo_location, ''), NULLIF(LEFT(TRIM(COALESCE(p_remarks, '')), 250), ''),
    p_entered_by, p_created_by, p_created_by,
    NOW(), NOW()
  )
  RETURNING id INTO v_master_id;

  IF v_master_id IS NULL THEN
    RAISE EXCEPTION 'INSERT_FAILED: ip_master insert returned no ID';
  END IF;

  -- ── Step 2: Submit (Z→P, generate permanent SSN, trigger workflow) ─────────
  SELECT submit_ip_registration(p_unique_uuid) INTO v_submit_result;

  IF v_submit_result IS NULL OR NOT (v_submit_result->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'SUBMIT_FAILED: %', COALESCE(v_submit_result->>'message', 'submit_ip_registration returned failure');
  END IF;

  v_final_ssn := v_submit_result->>'ssn';
  IF v_final_ssn IS NULL OR LENGTH(v_final_ssn) = 0 THEN
    RAISE EXCEPTION 'SUBMIT_FAILED: submit_ip_registration succeeded but returned no SSN';
  END IF;

  -- ── Step 3: Insert every dependant into ip_depend immediately ─────────────
  FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants)
  LOOP
    v_dep_idx := v_dep_idx + 1;

    -- Skip if no first/last name
    IF NULLIF(TRIM(v_dep->>'firstName'), '') IS NULL AND NULLIF(TRIM(v_dep->>'lastName'), '') IS NULL THEN
      CONTINUE;
    END IF;

    -- Generate depend_id via existing RPC (sequential per SSN)
    SELECT generate_depend_id(v_final_ssn) INTO v_depend_id;
    v_depend_id := COALESCE(v_depend_id, LPAD(v_dep_idx::TEXT, 6, '0'));

    -- Resolve gender to M/F/N
    v_dep_sex := CASE
      WHEN UPPER(v_dep->>'gender') IN ('M', 'MALE')   THEN 'M'
      WHEN UPPER(v_dep->>'gender') IN ('F', 'FEMALE') THEN 'F'
      ELSE 'N'
    END;

    -- Resolve relation code: only store if it matches a valid tb_relation code, else NULL
    v_dep_relation := NULL;
    IF v_dep->>'relationCode' IS NOT NULL AND LENGTH(TRIM(v_dep->>'relationCode')) > 0 THEN
      SELECT code INTO v_dep_relation
      FROM tb_relation
      WHERE UPPER(code) = UPPER(TRIM(LEFT(v_dep->>'relationCode', 3)))
      LIMIT 1;
    END IF;

    -- Safe date parse
    BEGIN
      v_dep_dob := (v_dep->>'dob')::DATE;
    EXCEPTION WHEN OTHERS THEN
      v_dep_dob := NULL;
    END;

    -- Safe depend SSN (max 6 chars)
    v_dep_ssn := NULLIF(TRIM(LEFT(COALESCE(v_dep->>'depSsn', ''), 6)), '');

    INSERT INTO ip_depend (
      ssn, depend_id, depend_ssn,
      surname, firstname, middle_name,
      dob, sex, relation,
      depend_addr1, depend_addr2,
      school_child, invalid,
      status, userid, tran_code, date_modified
    ) VALUES (
      v_final_ssn,
      v_depend_id,
      v_dep_ssn,
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'lastName', ''), 25)), ''),
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'firstName', ''), 25)), ''),
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'middleName', ''), 25)), ''),
      v_dep_dob,
      v_dep_sex,
      v_dep_relation,
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'address', ''), 50)), ''),
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'address1', ''), 50)), ''),
      CASE WHEN (v_dep->>'isInSchool')::BOOLEAN THEN 'Y' ELSE 'N' END,
      CASE WHEN (v_dep->>'isInvalid')::BOOLEAN  THEN 'Y' ELSE 'N' END,
      'P',
      NULLIF(LEFT(COALESCE(v_dep->>'userCode', p_entered_by, ''), 5), ''),
      'ADD',
      NOW()
    );

    v_dependants_added := v_dependants_added + 1;
  END LOOP;

  -- ── Step 4: Return success payload ────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',           TRUE,
    'ssn',               v_final_ssn,
    'ip_master_id',      v_master_id,
    'unique_uuid',       p_unique_uuid,
    'dependants_added',  v_dependants_added,
    'message',           'IP Registration created successfully. SSN: ' || v_final_ssn ||
                         CASE WHEN v_dependants_added > 0
                              THEN ' (' || v_dependants_added || ' dependant(s) linked)'
                              ELSE '' END
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Restore grants
GRANT EXECUTE ON FUNCTION public.convert_application_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_application_atomic TO anon;


-- ============================================================
-- Also fix validate_application_for_conversion to reference
-- application_remarks (250 char limit) instead of remarks
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

  -- Nationality (NOT NULL varchar 3)
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

  -- Application remarks (stored in ip_master.application_remarks — VARCHAR 250)
  IF p_remarks IS NOT NULL AND LENGTH(TRIM(p_remarks)) > 250 THEN
    v_warnings := v_warnings || jsonb_build_object('field','remarks','type','LENGTH',
      'message','Remarks (' || LENGTH(TRIM(p_remarks)) || ' chars) exceeds 250 char limit; will be truncated to fit application_remarks column.');
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
