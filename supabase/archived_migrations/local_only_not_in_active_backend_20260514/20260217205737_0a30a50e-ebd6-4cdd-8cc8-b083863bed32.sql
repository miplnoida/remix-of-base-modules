
-- Step 1: Drop the existing overload by its exact signature (without p_npf)
DROP FUNCTION IF EXISTS public.convert_application_to_ip(
  text, text, text, text, text, text, text, text, text, text,
  date, integer, integer, text, text, text, text, date, text, text,
  text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text, text, text, text,
  date, text, text, text, text, text, date, text, date, text,
  date, date, text, uuid, text, jsonb, text, text, text, text,
  uuid, timestamptz
);

-- Step 2: Recreate with p_npf added (between p_citizenship and p_date_of_residency)
CREATE OR REPLACE FUNCTION public.convert_application_to_ip(
  p_reference_number text,
  p_title text DEFAULT NULL::text,
  p_first_name text DEFAULT NULL::text,
  p_middle_name text DEFAULT NULL::text,
  p_last_name text DEFAULT NULL::text,
  p_second_middle_name text DEFAULT NULL::text,
  p_suffix text DEFAULT NULL::text,
  p_maiden_name text DEFAULT NULL::text,
  p_alias text DEFAULT NULL::text,
  p_gender text DEFAULT NULL::text,
  p_date_of_birth date DEFAULT NULL::date,
  p_height_feet integer DEFAULT NULL::integer,
  p_height_inches integer DEFAULT NULL::integer,
  p_eye_color text DEFAULT NULL::text,
  p_birth_place text DEFAULT NULL::text,
  p_nationality text DEFAULT NULL::text,
  p_marital_status text DEFAULT NULL::text,
  p_date_married date DEFAULT NULL::date,
  p_photo_url text DEFAULT NULL::text,
  p_address_line1 text DEFAULT NULL::text,
  p_address_line2 text DEFAULT NULL::text,
  p_postal_district text DEFAULT NULL::text,
  p_mailing_addr1 text DEFAULT NULL::text,
  p_mailing_addr2 text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_phone_mobile text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_contact_name text DEFAULT NULL::text,
  p_contact_relation text DEFAULT NULL::text,
  p_contact_addr1 text DEFAULT NULL::text,
  p_contact_addr2 text DEFAULT NULL::text,
  p_contact_email text DEFAULT NULL::text,
  p_contact_phone text DEFAULT NULL::text,
  p_contact_mobile text DEFAULT NULL::text,
  p_father_name text DEFAULT NULL::text,
  p_mother_name text DEFAULT NULL::text,
  p_spouse_name text DEFAULT NULL::text,
  p_spouse_addr1 text DEFAULT NULL::text,
  p_spouse_addr2 text DEFAULT NULL::text,
  p_spouse_ssn text DEFAULT NULL::text,
  p_spouse_dob date DEFAULT NULL::date,
  p_beneficiary_name text DEFAULT NULL::text,
  p_ben_addr1 text DEFAULT NULL::text,
  p_ben_addr2 text DEFAULT NULL::text,
  p_occupation text DEFAULT NULL::text,
  p_citizenship text DEFAULT NULL::text,
  p_npf text DEFAULT NULL::text,
  p_date_of_residency date DEFAULT NULL::date,
  p_has_work_permit text DEFAULT NULL::text,
  p_work_permit_expiry date DEFAULT NULL::date,
  p_witness_name text DEFAULT NULL::text,
  p_witness_date date DEFAULT NULL::date,
  p_application_date date DEFAULT NULL::date,
  p_remarks text DEFAULT NULL::text,
  p_approved_by uuid DEFAULT NULL::uuid,
  p_source_route text DEFAULT NULL::text,
  p_dependants jsonb DEFAULT '[]'::jsonb,
  p_employer_name text DEFAULT NULL::text,
  p_employer_address text DEFAULT NULL::text,
  p_employer_phone text DEFAULT NULL::text,
  p_employer_town text DEFAULT NULL::text,
  p_submitted_by uuid DEFAULT NULL::uuid,
  p_submitted_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_id UUID;
  v_new_uuid UUID;
  v_application_id TEXT;
  v_dep JSONB;
  v_dep_seq INT := 1;
  v_dep_count INT := 0;
BEGIN
  -- Duplicate-conversion guard
  IF EXISTS (
    SELECT 1 FROM ip_master 
    WHERE application_reference_number = p_reference_number
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DUPLICATE_CONVERSION',
      'message', format('An IP record already exists for application reference %s', p_reference_number)
    );
  END IF;

  v_new_id := gen_random_uuid();
  v_new_uuid := gen_random_uuid();
  v_application_id := 'APP-' || substring(v_new_id::text from 1 for 8);

  INSERT INTO ip_master (
    id, unique_uuid, application_id, status,
    surname, firstname, middle_name, second_middle_name, sex, dob,
    nationality, marital_status, birth_place, eyecolor,
    heightfeet, heightinches, date_married,
    previous_name, name_prefix, name_suffix, alias,
    resident_addr1, resident_addr2, district, mail_addr1, mail_addr2,
    email_addr, telephone, mobile, phone, phone_mobile,
    contact, contact_relation, contact_addr1, contact_addr2,
    contact_email, contact_phone, contact_mobile,
    father_name, mother_name,
    spouse_name, spouse_addr1, spouse_addr2, spouse_ssn, spouse_dob,
    beneficiary, ben_addr1, ben_addr2,
    primary_occup, citizenship, citizenship_flag,
    npf,
    date_of_residency, place_of_residence,
    work_permit, work_permit_expiration,
    employer_name, employer_address, employer_phone, employer_town,
    witness_name, date_witnessed,
    application_date, application_reference_number, application_remarks,
    submitted_by, submitted_at,
    photo_location,
    created_by, created_at, date_of_entry, entered_by
  ) VALUES (
    v_new_id, v_new_uuid, v_application_id, 'P',
    LEFT(TRIM(COALESCE(p_last_name, '')), 25),
    LEFT(TRIM(COALESCE(p_first_name, '')), 25),
    LEFT(TRIM(COALESCE(p_middle_name, '')), 25),
    LEFT(TRIM(COALESCE(p_second_middle_name, '')), 25),
    LEFT(COALESCE(p_gender, 'N'), 1),
    p_date_of_birth,
    LEFT(TRIM(COALESCE(p_nationality, '')), 3),
    LEFT(COALESCE(p_marital_status, 'S'), 1),
    LEFT(TRIM(COALESCE(p_birth_place, '')), 3),
    LEFT(TRIM(COALESCE(p_eye_color, '')), 10),
    p_height_feet,
    p_height_inches,
    p_date_married,
    LEFT(TRIM(COALESCE(p_maiden_name, '')), 25),
    LEFT(TRIM(COALESCE(p_title, '')), 4),
    LEFT(TRIM(COALESCE(p_suffix, '')), 4),
    LEFT(TRIM(COALESCE(p_alias, '')), 25),
    LEFT(TRIM(COALESCE(p_address_line1, '')), 50),
    LEFT(TRIM(COALESCE(p_address_line2, '')), 50),
    LEFT(TRIM(COALESCE(p_postal_district, '')), 3),
    LEFT(TRIM(COALESCE(p_mailing_addr1, '')), 50),
    LEFT(TRIM(COALESCE(p_mailing_addr2, '')), 50),
    LEFT(TRIM(COALESCE(p_email, '')), 75),
    LEFT(TRIM(COALESCE(p_phone, '')), 15),
    LEFT(TRIM(COALESCE(p_phone_mobile, '')), 15),
    LEFT(TRIM(COALESCE(p_phone, '')), 15),
    LEFT(TRIM(COALESCE(p_phone_mobile, '')), 15),
    LEFT(TRIM(COALESCE(p_contact_name, '')), 50),
    LEFT(TRIM(COALESCE(p_contact_relation, '')), 25),
    LEFT(TRIM(COALESCE(p_contact_addr1, '')), 50),
    LEFT(TRIM(COALESCE(p_contact_addr2, '')), 50),
    LEFT(TRIM(COALESCE(p_contact_email, '')), 75),
    LEFT(TRIM(COALESCE(p_contact_phone, '')), 15),
    LEFT(TRIM(COALESCE(p_contact_mobile, '')), 15),
    LEFT(TRIM(COALESCE(p_father_name, '')), 50),
    LEFT(TRIM(COALESCE(p_mother_name, '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_name, '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_addr1, '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_addr2, '')), 50),
    LEFT(TRIM(COALESCE(p_spouse_ssn, '')), 10),
    p_spouse_dob,
    LEFT(TRIM(COALESCE(p_beneficiary_name, '')), 50),
    LEFT(TRIM(COALESCE(p_ben_addr1, '')), 50),
    LEFT(TRIM(COALESCE(p_ben_addr2, '')), 50),
    LEFT(TRIM(COALESCE(p_occupation, '')), 4),
    LEFT(COALESCE(p_citizenship, 'N'), 1),
    LEFT(COALESCE(p_citizenship, 'N'), 1),
    LEFT(COALESCE(p_npf, 'N'), 1),
    p_date_of_residency,
    LEFT(TRIM(COALESCE(p_nationality, '')), 3),
    LEFT(COALESCE(p_has_work_permit, 'N'), 1),
    p_work_permit_expiry,
    LEFT(TRIM(COALESCE(p_employer_name, '')), 50),
    LEFT(TRIM(COALESCE(p_employer_address, '')), 200),
    LEFT(TRIM(COALESCE(p_employer_phone, '')), 15),
    LEFT(TRIM(COALESCE(p_employer_town, '')), 50),
    LEFT(TRIM(COALESCE(p_witness_name, '')), 50),
    p_witness_date,
    COALESCE(p_application_date, CURRENT_DATE),
    p_reference_number,
    LEFT(TRIM(COALESCE(p_remarks, '')), 250),
    p_submitted_by,
    p_submitted_at,
    p_photo_url,
    p_approved_by,
    now(),
    CURRENT_DATE,
    p_approved_by::text
  );

  -- Process dependants
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants)
    LOOP
      BEGIN
        INSERT INTO ip_dependent (
          ssn, depend_id, depend_ssn,
          firstname, surname, dob, sex,
          relation, depend_addr1,
          school_child, invalid,
          status, tran_code,
          userid, date_modified
        ) VALUES (
          v_new_id::text,
          'DEP-' || v_dep_seq,
          COALESCE(v_dep->>'ssn', ''),
          LEFT(TRIM(COALESCE(v_dep->>'firstName', '')), 25),
          LEFT(TRIM(COALESCE(v_dep->>'lastName', '')), 25),
          (v_dep->>'dateOfBirth')::date,
          LEFT(COALESCE(v_dep->>'gender', 'N'), 1),
          LEFT(TRIM(COALESCE(v_dep->>'relationship', '')), 3),
          LEFT(TRIM(COALESCE(v_dep->>'address', '')), 50),
          CASE WHEN (v_dep->>'isInSchool')::boolean THEN 'Y' ELSE 'N' END,
          'N',
          'P', 'ADD',
          p_approved_by::text,
          now()
        );
        v_dep_seq := v_dep_seq + 1;
        v_dep_count := v_dep_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to insert dependant %: %', v_dep_seq, SQLERRM;
        v_dep_seq := v_dep_seq + 1;
      END;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ip_master_id', v_new_id,
    'application_id', v_application_id,
    'dependants_converted', v_dep_count,
    'message', format('Application %s successfully converted to IP record', p_reference_number)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'convert_application_to_ip failed for ref %: %', p_reference_number, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', format('Failed to convert application %s: %s', p_reference_number, SQLERRM)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_application_to_ip TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_application_to_ip TO service_role;
