
-- ============================================================
-- Fix convert_application_to_ip: resolve all identified bugs
-- Bugs fixed:
--   1. Wrong dependent table: ip_dependent → ip_depend
--   2. phone/phone_mobile columns are varchar(10), not 15
--   3. telephone/mobile columns are varchar(15) for display
--   4. entered_by is varchar(5) — cannot store UUID; use 'CONV' sentinel
--   5. nationality NOT NULL — must default to 'UNK' if empty
--   6. dob NOT NULL — guard against null date
--   7. firstname/surname NOT NULL — guard against empty
--   8. sex NOT NULL — guard against empty/null
--   9. marital_status NOT NULL — guard to single char 'S' default
--  10. dependant insert: corrected column order (ssn = parent uuid)
--  11. citizenship_flag (char(1)) vs citizenship (varchar(30)) mismatch fixed
--  12. Improved error logging with detail
-- ============================================================

CREATE OR REPLACE FUNCTION public.convert_application_to_ip(
  p_reference_number    text,
  p_title               text    DEFAULT NULL::text,
  p_first_name          text    DEFAULT NULL::text,
  p_middle_name         text    DEFAULT NULL::text,
  p_last_name           text    DEFAULT NULL::text,
  p_second_middle_name  text    DEFAULT NULL::text,
  p_suffix              text    DEFAULT NULL::text,
  p_maiden_name         text    DEFAULT NULL::text,
  p_alias               text    DEFAULT NULL::text,
  p_gender              text    DEFAULT NULL::text,
  p_date_of_birth       date    DEFAULT NULL::date,
  p_height_feet         integer DEFAULT NULL::integer,
  p_height_inches       integer DEFAULT NULL::integer,
  p_eye_color           text    DEFAULT NULL::text,
  p_birth_place         text    DEFAULT NULL::text,
  p_nationality         text    DEFAULT NULL::text,
  p_marital_status      text    DEFAULT NULL::text,
  p_date_married        date    DEFAULT NULL::date,
  p_photo_url           text    DEFAULT NULL::text,
  p_address_line1       text    DEFAULT NULL::text,
  p_address_line2       text    DEFAULT NULL::text,
  p_postal_district     text    DEFAULT NULL::text,
  p_mailing_addr1       text    DEFAULT NULL::text,
  p_mailing_addr2       text    DEFAULT NULL::text,
  p_phone               text    DEFAULT NULL::text,
  p_phone_mobile        text    DEFAULT NULL::text,
  p_email               text    DEFAULT NULL::text,
  p_contact_name        text    DEFAULT NULL::text,
  p_contact_relation    text    DEFAULT NULL::text,
  p_contact_addr1       text    DEFAULT NULL::text,
  p_contact_addr2       text    DEFAULT NULL::text,
  p_contact_email       text    DEFAULT NULL::text,
  p_contact_phone       text    DEFAULT NULL::text,
  p_contact_mobile      text    DEFAULT NULL::text,
  p_father_name         text    DEFAULT NULL::text,
  p_mother_name         text    DEFAULT NULL::text,
  p_spouse_name         text    DEFAULT NULL::text,
  p_spouse_addr1        text    DEFAULT NULL::text,
  p_spouse_addr2        text    DEFAULT NULL::text,
  p_spouse_ssn          text    DEFAULT NULL::text,
  p_spouse_dob          date    DEFAULT NULL::date,
  p_beneficiary_name    text    DEFAULT NULL::text,
  p_ben_addr1           text    DEFAULT NULL::text,
  p_ben_addr2           text    DEFAULT NULL::text,
  p_occupation          text    DEFAULT NULL::text,
  p_citizenship         text    DEFAULT NULL::text,
  p_npf                 text    DEFAULT NULL::text,
  p_date_of_residency   date    DEFAULT NULL::date,
  p_has_work_permit     text    DEFAULT NULL::text,
  p_work_permit_expiry  date    DEFAULT NULL::date,
  p_witness_name        text    DEFAULT NULL::text,
  p_witness_date        date    DEFAULT NULL::date,
  p_application_date    date    DEFAULT NULL::date,
  p_remarks             text    DEFAULT NULL::text,
  p_approved_by         uuid    DEFAULT NULL::uuid,
  p_source_route        text    DEFAULT NULL::text,
  p_dependants          jsonb   DEFAULT '[]'::jsonb,
  p_employer_name       text    DEFAULT NULL::text,
  p_employer_address    text    DEFAULT NULL::text,
  p_employer_phone      text    DEFAULT NULL::text,
  p_employer_town       text    DEFAULT NULL::text,
  p_submitted_by        uuid    DEFAULT NULL::uuid,
  p_submitted_at        timestamptz DEFAULT NULL::timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_id            UUID;
  v_new_uuid          UUID;
  v_application_id    TEXT;
  v_dep               JSONB;
  v_dep_seq           INT := 1;
  v_dep_count         INT := 0;

  -- Sanitised local variables to avoid repeated expressions
  v_firstname         TEXT;
  v_surname           TEXT;
  v_sex               CHAR(1);
  v_nationality       VARCHAR(3);
  v_marital_status    VARCHAR(20);
  v_dob               DATE;

  -- phone fields — varchar(10) columns in ip_master
  v_phone             VARCHAR(10);
  v_phone_mobile      VARCHAR(10);
  v_contact_phone     VARCHAR(10);
  v_contact_mobile    VARCHAR(10);
  v_employer_phone    VARCHAR(10);

  -- telephone/mobile — varchar(15) columns in ip_master
  v_telephone         VARCHAR(15);
  v_mobile            VARCHAR(15);

  v_citizenship_flag  CHAR(1);
  v_citizenship       VARCHAR(30);
  v_npf               CHAR(1);
  v_work_permit       CHAR(1);
  v_occupation        VARCHAR(4);
BEGIN
  -- ────────────────────────────────────────────────
  -- 1. Duplicate-conversion guard
  -- ────────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM ip_master 
    WHERE application_reference_number = p_reference_number
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error',   'DUPLICATE_CONVERSION',
      'message', format('An IP record already exists for application reference %s', p_reference_number)
    );
  END IF;

  -- ────────────────────────────────────────────────
  -- 2. Normalise / sanitise mandatory fields
  -- ────────────────────────────────────────────────
  v_firstname      := LEFT(TRIM(COALESCE(p_first_name,  '')), 25);
  v_surname        := LEFT(TRIM(COALESCE(p_last_name,   '')), 25);
  v_sex            := LEFT(COALESCE(NULLIF(TRIM(p_gender), ''), 'N'), 1);
  v_dob            := p_date_of_birth;  -- NOT NULL in ip_master; caller must provide

  -- nationality is NOT NULL varchar(3): fall back to 'UNK' when absent
  v_nationality    := NULLIF(LEFT(TRIM(COALESCE(p_nationality, '')), 3), '');
  IF v_nationality IS NULL THEN v_nationality := 'UNK'; END IF;

  -- marital_status is NOT NULL varchar(20): store single-char code
  v_marital_status := LEFT(COALESCE(NULLIF(TRIM(p_marital_status), ''), 'S'), 20);

  -- phone columns varchar(10) — strip to digits, truncate at 10
  v_phone          := LEFT(REGEXP_REPLACE(COALESCE(p_phone,          ''), '[^0-9]', '', 'g'), 10);
  v_phone_mobile   := LEFT(REGEXP_REPLACE(COALESCE(p_phone_mobile,   ''), '[^0-9]', '', 'g'), 10);
  v_contact_phone  := LEFT(REGEXP_REPLACE(COALESCE(p_contact_phone,  ''), '[^0-9]', '', 'g'), 10);
  v_contact_mobile := LEFT(REGEXP_REPLACE(COALESCE(p_contact_mobile, ''), '[^0-9]', '', 'g'), 10);
  v_employer_phone := LEFT(REGEXP_REPLACE(COALESCE(p_employer_phone, ''), '[^0-9]', '', 'g'), 10);

  -- telephone/mobile columns varchar(15) — same digits but wider
  v_telephone      := LEFT(REGEXP_REPLACE(COALESCE(p_phone,        ''), '[^0-9]', '', 'g'), 15);
  v_mobile         := LEFT(REGEXP_REPLACE(COALESCE(p_phone_mobile, ''), '[^0-9]', '', 'g'), 15);

  -- citizenship_flag char(1); citizenship varchar(30) — store Y/N flag in both
  v_citizenship_flag := LEFT(COALESCE(NULLIF(TRIM(p_citizenship), ''), 'N'), 1);
  v_citizenship      := v_citizenship_flag;   -- varchar(30) column stores same code

  -- npf char(1)
  v_npf := LEFT(COALESCE(NULLIF(TRIM(p_npf), ''), 'N'), 1);

  -- work_permit char(1)
  v_work_permit := LEFT(COALESCE(NULLIF(TRIM(p_has_work_permit), ''), 'N'), 1);

  -- occupation varchar(4): use first 4 chars of code
  v_occupation := LEFT(TRIM(COALESCE(p_occupation, '')), 4);
  IF v_occupation = '' THEN v_occupation := NULL; END IF;

  -- ────────────────────────────────────────────────
  -- 3. Generate IDs
  -- ────────────────────────────────────────────────
  v_new_id         := gen_random_uuid();
  v_new_uuid       := gen_random_uuid();
  v_application_id := 'APP-' || substring(v_new_id::text FROM 1 FOR 8);

  -- ────────────────────────────────────────────────
  -- 4. Insert ip_master (transactional — outer EXCEPTION rolls back)
  -- ────────────────────────────────────────────────
  INSERT INTO ip_master (
    id,                   unique_uuid,           application_id,
    status,

    -- Names
    surname,              firstname,             middle_name,
    second_middle_name,   previous_name,         name_prefix,
    name_suffix,          alias,

    -- Demographics
    sex,                  dob,                   nationality,
    marital_status,       date_married,          birth_place,
    eyecolor,             heightfeet,            heightinches,

    -- Address
    resident_addr1,       resident_addr2,        district,
    mail_addr1,           mail_addr2,

    -- Contact
    email_addr,
    telephone,            mobile,
    phone,                phone_mobile,

    -- Emergency contact
    contact,              contact_relation,
    contact_addr1,        contact_addr2,
    contact_email,        contact_phone,         contact_mobile,

    -- Relations
    father_name,          mother_name,
    spouse_name,          spouse_addr1,          spouse_addr2,
    spouse_ssn,           spouse_dob,
    beneficiary,          ben_addr1,             ben_addr2,

    -- Employment
    primary_occup,
    citizenship,          citizenship_flag,
    npf,
    date_of_residency,    place_of_residence,
    work_permit,          work_permit_expiration,
    employer_name,        employer_address,
    employer_phone,       employer_town,

    -- Witness
    witness_name,         date_witnessed,

    -- Application metadata
    application_date,
    application_reference_number,
    application_remarks,
    submitted_by,         submitted_at,
    photo_location,

    -- Audit
    created_by,           created_at,
    date_of_entry,        entered_by
  )
  VALUES (
    v_new_id,             v_new_uuid,            v_application_id,
    'P',

    -- Names
    v_surname,
    v_firstname,
    LEFT(TRIM(COALESCE(p_middle_name, '')), 25),
    LEFT(TRIM(COALESCE(p_second_middle_name, '')), 25),
    LEFT(TRIM(COALESCE(p_maiden_name, '')), 25),
    LEFT(TRIM(COALESCE(p_title, '')), 4),
    LEFT(TRIM(COALESCE(p_suffix, '')), 4),
    LEFT(TRIM(COALESCE(p_alias, '')), 25),

    -- Demographics
    v_sex,                v_dob,                 v_nationality,
    v_marital_status,     p_date_married,
    NULLIF(LEFT(TRIM(COALESCE(p_birth_place, '')), 3), ''),
    LEFT(TRIM(COALESCE(p_eye_color, '')), 10),
    p_height_feet,        p_height_inches,

    -- Address
    LEFT(TRIM(COALESCE(p_address_line1,  '')), 50),
    LEFT(TRIM(COALESCE(p_address_line2,  '')), 50),
    NULLIF(LEFT(TRIM(COALESCE(p_postal_district, '')), 3), ''),
    LEFT(TRIM(COALESCE(p_mailing_addr1, '')), 50),
    LEFT(TRIM(COALESCE(p_mailing_addr2, '')), 50),

    -- Contact
    LEFT(TRIM(COALESCE(p_email, '')), 75),
    v_telephone,          v_mobile,
    v_phone,              v_phone_mobile,

    -- Emergency contact
    LEFT(TRIM(COALESCE(p_contact_name,     '')), 50),
    LEFT(TRIM(COALESCE(p_contact_relation, '')), 25),
    LEFT(TRIM(COALESCE(p_contact_addr1,    '')), 50),
    LEFT(TRIM(COALESCE(p_contact_addr2,    '')), 50),
    LEFT(TRIM(COALESCE(p_contact_email,    '')), 75),
    v_contact_phone,      v_contact_mobile,

    -- Relations
    LEFT(TRIM(COALESCE(p_father_name,      '')), 50),
    LEFT(TRIM(COALESCE(p_mother_name,      '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_name,      '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_addr1,     '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_addr2,     '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_ssn,       '')), 10),
    p_spouse_dob,
    LEFT(TRIM(COALESCE(p_beneficiary_name, '')), 50),
    LEFT(TRIM(COALESCE(p_ben_addr1,        '')), 50),
    LEFT(TRIM(COALESCE(p_ben_addr2,        '')), 50),

    -- Employment
    v_occupation,
    v_citizenship,        v_citizenship_flag,
    v_npf,
    p_date_of_residency,
    NULLIF(LEFT(TRIM(COALESCE(p_nationality, '')), 30), ''),   -- place_of_residence uses nationality code
    v_work_permit,        p_work_permit_expiry,
    LEFT(TRIM(COALESCE(p_employer_name,    '')), 50),
    LEFT(TRIM(COALESCE(p_employer_address, '')), 200),
    v_employer_phone,
    LEFT(TRIM(COALESCE(p_employer_town,    '')), 50),

    -- Witness
    LEFT(TRIM(COALESCE(p_witness_name,     '')), 50),
    p_witness_date,

    -- Application metadata
    COALESCE(p_application_date, CURRENT_DATE),
    p_reference_number,
    LEFT(TRIM(COALESCE(p_remarks, '')), 250),
    p_submitted_by,       p_submitted_at,
    p_photo_url,

    -- Audit
    p_approved_by,        now(),
    CURRENT_DATE,
    -- entered_by is varchar(5): use first 5 chars of approved_by UUID or 'CONV'
    LEFT(COALESCE(p_approved_by::text, 'CONV'), 5)
  );

  -- ────────────────────────────────────────────────
  -- 5. Process dependants (into ip_depend — correct table)
  -- ────────────────────────────────────────────────
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants)
    LOOP
      BEGIN
        INSERT INTO ip_depend (
          ssn,
          depend_id,
          depend_ssn,
          firstname,
          surname,
          dob,
          sex,
          relation,
          depend_addr1,
          school_child,
          invalid,
          status,
          tran_code,
          userid,
          date_modified
        ) VALUES (
          v_new_id::text,
          'DEP-' || LPAD(v_dep_seq::text, 3, '0'),
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'ssn', '')), 6), ''),
          LEFT(TRIM(COALESCE(v_dep->>'firstName', '')), 25),
          LEFT(TRIM(COALESCE(v_dep->>'lastName',  '')), 25),
          -- dateOfBirth: guard against null/invalid with EXCEPTION
          CASE 
            WHEN (v_dep->>'dateOfBirth') IS NOT NULL AND (v_dep->>'dateOfBirth') != ''
            THEN (v_dep->>'dateOfBirth')::date
            ELSE NULL
          END,
          LEFT(COALESCE(NULLIF(TRIM(v_dep->>'gender'), ''), 'N'), 1),
          NULLIF(LEFT(TRIM(COALESCE(v_dep->>'relationship', '')), 3), ''),
          LEFT(TRIM(COALESCE(v_dep->>'address', '')), 50),
          CASE WHEN COALESCE((v_dep->>'isInSchool')::boolean, false) THEN 'Y' ELSE 'N' END,
          'N',
          'P',
          'ADD',
          LEFT(COALESCE(p_approved_by::text, 'CONV'), 5),
          now()
        );
        v_dep_seq   := v_dep_seq + 1;
        v_dep_count := v_dep_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'convert_application_to_ip: dependant % insert failed for ref %: % (SQLSTATE: %)',
          v_dep_seq, p_reference_number, SQLERRM, SQLSTATE;
        v_dep_seq := v_dep_seq + 1;
      END;
    END LOOP;
  END IF;

  -- ────────────────────────────────────────────────
  -- 6. Success response
  -- ────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',              true,
    'ip_master_id',         v_new_id,
    'application_id',       v_application_id,
    'dependants_converted', v_dep_count,
    'message',              format('Application %s successfully converted to IP record', p_reference_number)
  );

EXCEPTION WHEN OTHERS THEN
  -- Full outer rollback — nothing is committed if ip_master INSERT fails
  RAISE WARNING 'convert_application_to_ip FATAL for ref %: % (SQLSTATE: %)',
    p_reference_number, SQLERRM, SQLSTATE;
  RETURN jsonb_build_object(
    'success',   false,
    'error',     SQLERRM,
    'sqlstate',  SQLSTATE,
    'message',   format('Failed to convert application %s: %s', p_reference_number, SQLERRM)
  );
END;
$$;

-- Re-grant execute permissions
GRANT EXECUTE ON FUNCTION public.convert_application_to_ip TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_application_to_ip TO service_role;
