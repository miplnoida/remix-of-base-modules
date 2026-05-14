
-- Fix: submitted_by column in ip_master is UUID, not TEXT
-- The online application's submitted_by is a text identifier, not a UUID
-- Solution: cast it safely, or store in application_remarks instead
-- Also fix: photo_location VARCHAR(255) receiving TEXT

CREATE OR REPLACE FUNCTION public.convert_application_to_ip(
  p_reference_number   TEXT,
  p_title              TEXT DEFAULT NULL,
  p_first_name         TEXT DEFAULT NULL,
  p_middle_name        TEXT DEFAULT NULL,
  p_last_name          TEXT DEFAULT NULL,
  p_second_middle_name TEXT DEFAULT NULL,
  p_suffix             TEXT DEFAULT NULL,
  p_maiden_name        TEXT DEFAULT NULL,
  p_alias              TEXT DEFAULT NULL,
  p_gender             TEXT DEFAULT NULL,
  p_date_of_birth      DATE DEFAULT NULL,
  p_height_feet        INT  DEFAULT NULL,
  p_height_inches      INT  DEFAULT NULL,
  p_eye_color          TEXT DEFAULT NULL,
  p_birth_place        TEXT DEFAULT NULL,
  p_nationality        TEXT DEFAULT NULL,
  p_marital_status     TEXT DEFAULT NULL,
  p_date_married       DATE DEFAULT NULL,
  p_photo_url          TEXT DEFAULT NULL,
  p_address_line1      TEXT DEFAULT NULL,
  p_address_line2      TEXT DEFAULT NULL,
  p_postal_district    TEXT DEFAULT NULL,
  p_mailing_addr1      TEXT DEFAULT NULL,
  p_mailing_addr2      TEXT DEFAULT NULL,
  p_phone              TEXT DEFAULT NULL,
  p_phone_mobile       TEXT DEFAULT NULL,
  p_email              TEXT DEFAULT NULL,
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
  p_spouse_dob         DATE DEFAULT NULL,
  p_beneficiary_name   TEXT DEFAULT NULL,
  p_ben_addr1          TEXT DEFAULT NULL,
  p_ben_addr2          TEXT DEFAULT NULL,
  p_occupation         TEXT DEFAULT NULL,
  p_citizenship        TEXT DEFAULT NULL,
  p_npf                TEXT DEFAULT NULL,
  p_date_of_residency  DATE DEFAULT NULL,
  p_has_work_permit    TEXT DEFAULT NULL,
  p_work_permit_expiry DATE DEFAULT NULL,
  p_witness_name       TEXT DEFAULT NULL,
  p_witness_date       DATE DEFAULT NULL,
  p_application_date   DATE DEFAULT NULL,
  p_remarks            TEXT DEFAULT NULL,
  p_approved_by        UUID DEFAULT NULL,
  p_source_route       TEXT DEFAULT NULL,
  p_dependants         JSONB DEFAULT NULL,
  p_employer_name      TEXT DEFAULT NULL,
  p_employer_address   TEXT DEFAULT NULL,
  p_employer_phone     TEXT DEFAULT NULL,
  p_employer_town      TEXT DEFAULT NULL,
  p_submitted_by       TEXT DEFAULT NULL,
  p_submitted_at       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id            UUID;
  v_new_uuid          UUID;
  v_application_id    TEXT;
  v_dep               JSONB;
  v_dep_seq           INT := 1;
  v_dep_count         INT := 0;
  v_firstname         TEXT;
  v_surname           TEXT;
  v_sex               CHAR(1);
  v_nationality       VARCHAR(3);
  v_marital_status    VARCHAR(20);
  v_dob               DATE;
  v_phone             VARCHAR(10);
  v_phone_mobile      VARCHAR(10);
  v_contact_phone     VARCHAR(10);
  v_contact_mobile    VARCHAR(10);
  v_employer_phone    VARCHAR(10);
  v_telephone         VARCHAR(15);
  v_mobile            VARCHAR(15);
  v_citizenship_flag  CHAR(1);
  v_citizenship       VARCHAR(30);
  v_npf               CHAR(1);
  v_work_permit       CHAR(1);
  v_occupation        VARCHAR(4);
  v_relation_code     VARCHAR(3);
  v_dep_dob           DATE;
  v_dep_school        CHAR(1);
  v_dep_sex           CHAR(1);
  v_staging_note      TEXT;
  -- submitted_by: try to parse as UUID, fall back to NULL
  v_submitted_by_uuid UUID;
BEGIN
  -- ── Duplicate check ──────────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM ip_master WHERE application_reference_number = p_reference_number) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'DUPLICATE_CONVERSION',
      'message', format('An IP record already exists for application reference %s', p_reference_number)
    );
  END IF;

  -- ── Mandatory field guards ────────────────────────────────────────────────────
  IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_FIELD',
      'message', 'First name is required for IP conversion.');
  END IF;
  IF p_last_name IS NULL OR TRIM(p_last_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_FIELD',
      'message', 'Last name is required for IP conversion.');
  END IF;
  IF p_date_of_birth IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_FIELD',
      'message', 'Date of birth is required for IP conversion.');
  END IF;
  IF p_gender IS NULL OR TRIM(p_gender) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_FIELD',
      'message', 'Gender is required for IP conversion.');
  END IF;

  -- ── Field sanitization ────────────────────────────────────────────────────────
  v_firstname        := LEFT(TRIM(COALESCE(p_first_name, '')), 25);
  v_surname          := LEFT(TRIM(COALESCE(p_last_name, '')), 25);
  v_sex              := LEFT(COALESCE(NULLIF(TRIM(p_gender), ''), 'N'), 1);
  v_dob              := p_date_of_birth;
  v_nationality      := COALESCE(NULLIF(LEFT(TRIM(COALESCE(p_nationality, '')), 3), ''), 'UNK');
  v_marital_status   := LEFT(COALESCE(NULLIF(TRIM(p_marital_status), ''), 'S'), 20);
  v_phone            := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g'), 10), '');
  v_phone_mobile     := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_phone_mobile, ''), '[^0-9]', '', 'g'), 10), '');
  v_contact_phone    := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_contact_phone, ''), '[^0-9]', '', 'g'), 10), '');
  v_contact_mobile   := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_contact_mobile, ''), '[^0-9]', '', 'g'), 10), '');
  v_employer_phone   := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_employer_phone, ''), '[^0-9]', '', 'g'), 10), '');
  v_telephone        := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9]', '', 'g'), 15), '');
  v_mobile           := NULLIF(LEFT(REGEXP_REPLACE(COALESCE(p_phone_mobile, ''), '[^0-9]', '', 'g'), 15), '');
  v_citizenship_flag := LEFT(COALESCE(NULLIF(TRIM(p_citizenship), ''), 'N'), 1);
  v_citizenship      := v_citizenship_flag;
  v_npf              := LEFT(COALESCE(NULLIF(TRIM(p_npf), ''), 'N'), 1);
  v_work_permit      := LEFT(COALESCE(NULLIF(TRIM(p_has_work_permit), ''), 'N'), 1);
  v_occupation       := NULLIF(LEFT(TRIM(COALESCE(p_occupation, '')), 4), '');

  -- Try to parse submitted_by as UUID; if not valid UUID, set to NULL
  BEGIN
    v_submitted_by_uuid := p_submitted_by::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_submitted_by_uuid := NULL;
  END;

  -- Generate IDs
  v_new_id         := gen_random_uuid();
  v_new_uuid       := gen_random_uuid();
  v_application_id := 'APP-' || substring(v_new_id::text FROM 1 FOR 8);

  -- ── Main ip_master INSERT ─────────────────────────────────────────────────────
  BEGIN
    INSERT INTO ip_master (
      id, unique_uuid, application_id, status,
      surname, firstname, middle_name, second_middle_name, previous_name, name_prefix, name_suffix, alias,
      sex, dob, nationality, marital_status, date_married, birth_place, eyecolor, heightfeet, heightinches,
      resident_addr1, resident_addr2, district, mail_addr1, mail_addr2,
      email_addr, telephone, mobile, phone, phone_mobile,
      contact, contact_relation, contact_addr1, contact_addr2, contact_email, contact_phone, contact_mobile,
      father_name, mother_name, spouse_name, spouse_addr1, spouse_addr2, spouse_ssn, spouse_dob,
      beneficiary, ben_addr1, ben_addr2,
      primary_occup, citizenship, citizenship_flag, npf,
      date_of_residency, place_of_residence, work_permit, work_permit_expiration,
      employer_name, employer_address, employer_phone, employer_town,
      witness_name, date_witnessed,
      application_date, application_reference_number, application_remarks,
      submitted_by, submitted_at, photo_location,
      created_by, created_at, date_of_entry, entered_by
    ) VALUES (
      v_new_id, v_new_uuid, v_application_id, 'P',
      v_surname, v_firstname,
      NULLIF(LEFT(TRIM(COALESCE(p_middle_name, '')), 25), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_second_middle_name, '')), 25), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_maiden_name, '')), 25), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_title, '')), 6), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_suffix, '')), 6), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_alias, '')), 25), ''),
      v_sex, v_dob, v_nationality, v_marital_status, p_date_married,
      NULLIF(LEFT(TRIM(COALESCE(p_birth_place, '')), 3), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_eye_color, '')), 10), ''),
      p_height_feet, p_height_inches,
      NULLIF(LEFT(TRIM(COALESCE(p_address_line1, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_address_line2, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_postal_district, '')), 3), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_mailing_addr1, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_mailing_addr2, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_email, '')), 40), ''),
      v_telephone, v_mobile, v_phone, v_phone_mobile,
      NULLIF(LEFT(TRIM(COALESCE(p_contact_name, '')), 35), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_contact_relation, '')), 20), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_contact_addr1, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_contact_addr2, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_contact_email, '')), 40), ''),
      v_contact_phone, v_contact_mobile,
      NULLIF(LEFT(TRIM(COALESCE(p_father_name, '')), 35), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_mother_name, '')), 35), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_spouse_name, '')), 35), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_spouse_addr1, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_spouse_addr2, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_spouse_ssn, '')), 6), ''),
      p_spouse_dob,
      NULLIF(LEFT(TRIM(COALESCE(p_beneficiary_name, '')), 35), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_ben_addr1, '')), 30), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_ben_addr2, '')), 30), ''),
      v_occupation, v_citizenship, v_citizenship_flag, v_npf,
      p_date_of_residency,
      NULLIF(LEFT(TRIM(COALESCE(p_nationality, '')), 30), ''),
      v_work_permit, p_work_permit_expiry,
      NULLIF(LEFT(TRIM(COALESCE(p_employer_name, '')), 50), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_employer_address, '')), 200), ''),
      v_employer_phone,
      NULLIF(LEFT(TRIM(COALESCE(p_employer_town, '')), 50), ''),
      NULLIF(LEFT(TRIM(COALESCE(p_witness_name, '')), 35), ''),
      p_witness_date,
      COALESCE(p_application_date, CURRENT_DATE),
      p_reference_number,
      NULLIF(LEFT(TRIM(COALESCE(p_remarks, '')), 250), ''),
      -- submitted_by: UUID type — try parsed UUID, fall back to NULL
      v_submitted_by_uuid,
      -- submitted_at: parse safely from text
      CASE WHEN p_submitted_at IS NOT NULL AND p_submitted_at != ''
           THEN p_submitted_at::timestamptz ELSE NULL END,
      -- photo_location: VARCHAR(255)
      NULLIF(LEFT(TRIM(COALESCE(p_photo_url, '')), 255), ''),
      -- created_by: UUID of the approving user
      p_approved_by,
      NOW(),
      CURRENT_DATE,
      -- entered_by: VARCHAR(5) — use fixed system code for online conversions
      'CONV'
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'INSERT_FAILED',
      'message', 'Failed to insert IP master record: ' || SQLERRM,
      'detail',  SQLSTATE
    );
  END;

  -- ── Dependants: Stage (cannot insert into ip_depend until SSN is assigned) ───
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants) LOOP
      BEGIN
        -- Resolve relation code
        v_relation_code := NULL;
        IF (v_dep->>'relationship') IS NOT NULL AND LENGTH(TRIM(v_dep->>'relationship')) > 0 THEN
          SELECT code INTO v_relation_code FROM tb_relation
          WHERE UPPER(TRIM(code)) = UPPER(LEFT(TRIM(v_dep->>'relationship'), 3)) LIMIT 1;
          IF v_relation_code IS NULL THEN
            SELECT code INTO v_relation_code FROM tb_relation
            WHERE UPPER(TRIM(description)) = UPPER(TRIM(v_dep->>'relationship')) LIMIT 1;
          END IF;
        END IF;

        -- Parse DOB safely
        BEGIN
          v_dep_dob := CASE
            WHEN (v_dep->>'dateOfBirth') IS NOT NULL AND (v_dep->>'dateOfBirth') != ''
            THEN (v_dep->>'dateOfBirth')::date ELSE NULL END;
        EXCEPTION WHEN OTHERS THEN v_dep_dob := NULL; END;

        -- School child flag
        v_dep_school := CASE
          WHEN (v_dep->>'isInSchool') IN ('true','Y','Yes') THEN 'Y' ELSE 'N' END;

        -- Sex
        v_dep_sex := NULLIF(LEFT(TRIM(COALESCE(v_dep->>'gender', '')), 1), '');

        v_staging_note := CASE
          WHEN v_relation_code IS NULL AND (v_dep->>'relationship') IS NOT NULL
          THEN 'Relation "' || (v_dep->>'relationship') || '" not matched in tb_relation'
          ELSE NULL END;

        INSERT INTO ip_depend_staging (
          ip_master_id, application_ref, firstname, surname, dob, sex,
          relation_raw, relation, depend_addr1, school_child, dep_ssn, status, notes
        ) VALUES (
          v_new_id, p_reference_number,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'firstName', '')), 25), ''),
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'lastName', '')), 25), ''),
          v_dep_dob, v_dep_sex,
          NULLIF(TRIM(COALESCE(v_dep->>'relationship', '')), ''),
          v_relation_code,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'address', '')), 50), ''),
          v_dep_school,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'ssn', '')), 6), ''),
          'Pending', v_staging_note
        );
        v_dep_count := v_dep_count + 1;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO ip_depend_staging (ip_master_id, application_ref, firstname, status, notes)
        VALUES (v_new_id, p_reference_number,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'firstName', '')), 25), ''),
          'Error', 'Staging error: ' || SQLERRM);
      END;
      v_dep_seq := v_dep_seq + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success',           true,
    'ip_master_id',      v_new_id,
    'application_id',    v_application_id,
    'dependants_staged', v_dep_count,
    'dependants_note',   CASE WHEN v_dep_count > 0
      THEN v_dep_count || ' dependant(s) staged pending SSN assignment.'
      ELSE NULL END,
    'message', format('Application %s successfully converted to IP record.', p_reference_number)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false, 'error', 'UNEXPECTED_ERROR',
    'message', 'Unexpected error during IP conversion: ' || SQLERRM,
    'detail',  SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_application_to_ip TO anon, authenticated;
