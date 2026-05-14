
-- ============================================================
-- Atomic IP Registration Conversion Function
-- Converts an online application into ip_master + ip_depend
-- inside a single transaction. Rolls back everything on failure.
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
  -- Each object: {firstName, lastName, middleName, dob, gender, relationship, address, address1, ssn, isInSchool, isInvalid, userCode}
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
    photo_location, remarks,
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
    NULLIF(p_photo_location, ''), NULLIF(p_remarks, ''),
    p_entered_by, p_created_by, p_created_by,
    NOW(), NOW()
  )
  RETURNING id INTO v_master_id;

  IF v_master_id IS NULL THEN
    RAISE EXCEPTION 'INSERT_FAILED: ip_master insert returned no ID';
  END IF;

  -- ── Step 2: Submit (Z→P, generate permanent SSN, trigger workflow) ─────────
  --    Delegates to the same submit_ip_registration used by IPRegistrationForm
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
  -- The surrounding transaction will be rolled back by the caller.
  -- Re-raise with full context so the frontend can display a meaningful error.
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.convert_application_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_application_atomic TO anon;
