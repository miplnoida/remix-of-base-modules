
-- ============================================================
-- FIX: convert_application_to_ip - Critical Bug Resolution
-- Root causes identified:
-- 1. ip_depend.ssn FK references ip_master.ssn (VARCHAR 6) but function 
--    inserts v_new_id::text (UUID, 36 chars) => FK violation + length overflow
-- 2. ip_depend.relation FK references tb_relation(code) but may receive 
--    unmapped values from online application
-- 3. entered_by VARCHAR(5) received UUID substring instead of user_code
-- 4. ip_depend insert fails silently crashing the entire transaction
-- FIX: Skip dependant inserts (master SSN not assigned yet at insert time),
--      store dependants in a pending staging table, ensure main INSERT is atomic
-- ============================================================

-- Step 1: Create a staging table for pending dependants 
-- (to be linked once SSN is assigned to the ip_master record)
CREATE TABLE IF NOT EXISTS public.ip_depend_staging (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_master_id    UUID NOT NULL,  -- references ip_master.id (UUID, assigned immediately)
  application_ref TEXT NOT NULL,
  firstname       VARCHAR(25),
  surname         VARCHAR(25),
  dob             DATE,
  sex             CHAR(1),
  relation_raw    VARCHAR(50),    -- raw value from online application
  relation        VARCHAR(3),     -- resolved tb_relation code (if matched)
  depend_addr1    VARCHAR(50),
  depend_addr2    VARCHAR(50),
  school_child    CHAR(1) DEFAULT 'N',
  dep_ssn         VARCHAR(6),
  status          VARCHAR(20) NOT NULL DEFAULT 'Pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT
);

ALTER TABLE public.ip_depend_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated" ON public.ip_depend_staging
  FOR ALL USING (true) WITH CHECK (true);

-- Step 2: Recreate convert_application_to_ip with all bugs fixed
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
  
  -- Phone: strip all non-digits, truncate to 10 (phone/phone_mobile columns) and 15 (telephone/mobile)
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
  
  -- Generate IDs
  v_new_id           := gen_random_uuid();
  v_new_uuid         := gen_random_uuid();
  v_application_id   := 'APP-' || substring(v_new_id::text FROM 1 FOR 8);

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
      -- submitted_by: TEXT field from online app (not UUID)
      NULLIF(LEFT(TRIM(COALESCE(p_submitted_by, '')), 50), ''),
      -- submitted_at: parse safely
      CASE WHEN p_submitted_at IS NOT NULL AND p_submitted_at != ''
           THEN p_submitted_at::timestamptz ELSE NULL END,
      p_photo_url,
      -- created_by: UUID of approver
      p_approved_by,
      NOW(),
      CURRENT_DATE,
      -- entered_by: VARCHAR(5) user code - use 'CONV' as system code for conversions
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

  -- ── Dependants: Stage them (cannot insert into ip_depend yet because ──────────
  -- ip_depend.ssn FK references ip_master.ssn which is NULL until SSN is assigned)
  -- Dependants are stored in ip_depend_staging referencing ip_master.id (UUID)
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants) LOOP
      BEGIN
        -- Resolve relation code: look up tb_relation by code first, then description
        v_relation_code := NULL;
        IF (v_dep->>'relationship') IS NOT NULL AND LENGTH(TRIM(v_dep->>'relationship')) > 0 THEN
          -- Try exact 3-char code match
          SELECT code INTO v_relation_code
          FROM tb_relation
          WHERE UPPER(TRIM(code)) = UPPER(LEFT(TRIM(v_dep->>'relationship'), 3))
          LIMIT 1;
          
          -- If not found, try description match
          IF v_relation_code IS NULL THEN
            SELECT code INTO v_relation_code
            FROM tb_relation
            WHERE UPPER(TRIM(description)) = UPPER(TRIM(v_dep->>'relationship'))
            LIMIT 1;
          END IF;
        END IF;

        -- Parse DOB safely
        BEGIN
          v_dep_dob := CASE 
            WHEN (v_dep->>'dateOfBirth') IS NOT NULL AND (v_dep->>'dateOfBirth') != ''
            THEN (v_dep->>'dateOfBirth')::date 
            ELSE NULL 
          END;
        EXCEPTION WHEN OTHERS THEN
          v_dep_dob := NULL;
        END;

        -- Parse school child flag
        v_dep_school := CASE
          WHEN (v_dep->>'isInSchool')::boolean = true THEN 'Y'
          WHEN (v_dep->>'isInSchool') IN ('true','Y','Yes') THEN 'Y'
          ELSE 'N'
        END;

        -- Parse sex
        v_dep_sex := NULLIF(LEFT(TRIM(COALESCE(v_dep->>'gender', '')), 1), '');

        -- Stage the dependant (linked by ip_master.id UUID, not SSN)
        v_staging_note := CASE 
          WHEN v_relation_code IS NULL AND (v_dep->>'relationship') IS NOT NULL 
          THEN 'Relation code "' || (v_dep->>'relationship') || '" not found in tb_relation'
          ELSE NULL
        END;

        INSERT INTO ip_depend_staging (
          ip_master_id, application_ref, firstname, surname, dob, sex,
          relation_raw, relation, depend_addr1, school_child, dep_ssn, status, notes
        ) VALUES (
          v_new_id,
          p_reference_number,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'firstName', '')), 25), ''),
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'lastName', '')), 25), ''),
          v_dep_dob,
          v_dep_sex,
          NULLIF(TRIM(COALESCE(v_dep->>'relationship', '')), ''),
          v_relation_code,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'address', '')), 50), ''),
          v_dep_school,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'ssn', '')), 6), ''),
          'Pending',
          v_staging_note
        );

        v_dep_count := v_dep_count + 1;
      EXCEPTION WHEN OTHERS THEN
        -- Log staging failure but do NOT fail the whole transaction
        INSERT INTO ip_depend_staging (
          ip_master_id, application_ref, firstname, status, notes
        ) VALUES (
          v_new_id, p_reference_number,
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'firstName', '')), 25), ''),
          'Error',
          'Staging error: ' || SQLERRM
        );
      END;

      v_dep_seq := v_dep_seq + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success',               true,
    'ip_master_id',          v_new_id,
    'application_id',        v_application_id,
    'dependants_staged',     v_dep_count,
    'dependants_note',       CASE WHEN v_dep_count > 0 
      THEN 'Dependants staged pending SSN assignment. Review ip_depend_staging table.'
      ELSE NULL END,
    'message', format('Application %s successfully converted to IP record. SSN will be assigned by staff.',
      p_reference_number)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error',   'UNEXPECTED_ERROR',
    'message', 'Unexpected error during IP conversion: ' || SQLERRM,
    'detail',  SQLSTATE
  );
END;
$$;

-- Step 3: Update validate function to also check dependant relation codes
-- and add the FK staging note to validation output
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

      -- Check first/last name
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
              '" not found in system. Dependant will be staged for manual review.'
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

  -- Inform about dependant staging behaviour
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'field', 'dependants',
      'type', 'INFO',
      'message', jsonb_array_length(p_dependants) || ' dependant(s) will be staged pending SSN assignment to the IP master record. They must be linked manually after SSN is issued.'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid',          jsonb_array_length(v_errors) = 0,
    'already_converted', false,
    'errors',         v_errors,
    'warnings',       v_warnings,
    'error_count',    jsonb_array_length(v_errors),
    'warning_count',  jsonb_array_length(v_warnings),
    'server_time',    NOW()::text
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

GRANT EXECUTE ON FUNCTION public.convert_application_to_ip TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_application_for_conversion TO anon, authenticated;
GRANT ALL ON TABLE public.ip_depend_staging TO anon, authenticated;
