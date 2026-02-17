
-- Drop both existing overloads explicitly
DROP FUNCTION IF EXISTS public.convert_application_to_ip(text,text,text,text,text,text,text,text,text,date,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,date,text,date,text,date,date,text,uuid,text,jsonb);
DROP FUNCTION IF EXISTS public.convert_application_to_ip(text,text,text,text,text,text,text,text,text,date,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,date,text,date,text,date,date,text,uuid,text,jsonb,text);

CREATE OR REPLACE FUNCTION public.convert_application_to_ip(
  p_reference_number TEXT,
  p_title TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_middle_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_second_middle_name TEXT DEFAULT NULL,
  p_suffix TEXT DEFAULT NULL,
  p_maiden_name TEXT DEFAULT NULL,
  p_alias TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_height_feet INTEGER DEFAULT NULL,
  p_height_inches INTEGER DEFAULT NULL,
  p_eye_color TEXT DEFAULT NULL,
  p_birth_place TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL,
  p_marital_status TEXT DEFAULT NULL,
  p_date_married DATE DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_address_line1 TEXT DEFAULT NULL,
  p_address_line2 TEXT DEFAULT NULL,
  p_postal_district TEXT DEFAULT NULL,
  p_mailing_addr1 TEXT DEFAULT NULL,
  p_mailing_addr2 TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_phone_mobile TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_contact_relation TEXT DEFAULT NULL,
  p_contact_addr1 TEXT DEFAULT NULL,
  p_contact_addr2 TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_contact_mobile TEXT DEFAULT NULL,
  p_father_name TEXT DEFAULT NULL,
  p_mother_name TEXT DEFAULT NULL,
  p_spouse_name TEXT DEFAULT NULL,
  p_spouse_addr1 TEXT DEFAULT NULL,
  p_spouse_addr2 TEXT DEFAULT NULL,
  p_spouse_ssn TEXT DEFAULT NULL,
  p_spouse_dob DATE DEFAULT NULL,
  p_beneficiary_name TEXT DEFAULT NULL,
  p_ben_addr1 TEXT DEFAULT NULL,
  p_ben_addr2 TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_citizenship TEXT DEFAULT NULL,
  p_date_of_residency DATE DEFAULT NULL,
  p_has_work_permit TEXT DEFAULT NULL,
  p_work_permit_expiry DATE DEFAULT NULL,
  p_witness_name TEXT DEFAULT NULL,
  p_witness_date DATE DEFAULT NULL,
  p_application_date DATE DEFAULT NULL,
  p_remarks TEXT DEFAULT NULL,
  p_approved_by UUID DEFAULT NULL,
  p_source_route TEXT DEFAULT NULL,
  p_dependants JSONB DEFAULT '[]'::JSONB,
  p_employer_name TEXT DEFAULT NULL,
  p_employer_address TEXT DEFAULT NULL,
  p_employer_phone TEXT DEFAULT NULL,
  p_employer_town TEXT DEFAULT NULL,
  p_submitted_by UUID DEFAULT NULL,
  p_submitted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
  v_new_uuid UUID;
  v_application_id TEXT;
  v_dep JSONB;
  v_dep_seq INT := 1;
  v_dep_count INT := 0;
BEGIN
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
    LEFT(TRIM(p_middle_name), 25),
    LEFT(TRIM(p_second_middle_name), 25),
    LEFT(COALESCE(p_gender, 'N'), 1),
    p_date_of_birth,
    COALESCE(LEFT(TRIM(p_nationality), 3), ''),
    COALESCE(LEFT(TRIM(p_marital_status), 1), ''),
    LEFT(TRIM(p_birth_place), 3),
    LEFT(TRIM(p_eye_color), 10),
    p_height_feet,
    p_height_inches,
    p_date_married,
    LEFT(TRIM(p_maiden_name), 25),
    LEFT(TRIM(p_title), 5),
    LEFT(TRIM(p_suffix), 5),
    LEFT(TRIM(p_alias), 25),
    LEFT(TRIM(p_address_line1), 30),
    LEFT(TRIM(p_address_line2), 30),
    LEFT(TRIM(p_postal_district), 3),
    LEFT(TRIM(p_mailing_addr1), 30),
    LEFT(TRIM(p_mailing_addr2), 30),
    LEFT(TRIM(p_email), 40),
    LEFT(TRIM(p_phone), 10),
    LEFT(TRIM(p_phone_mobile), 10),
    LEFT(TRIM(p_phone), 10),
    LEFT(TRIM(p_phone_mobile), 10),
    LEFT(TRIM(p_contact_name), 25),
    LEFT(TRIM(p_contact_relation), 3),
    LEFT(TRIM(p_contact_addr1), 30),
    LEFT(TRIM(p_contact_addr2), 30),
    LEFT(TRIM(p_contact_email), 40),
    LEFT(TRIM(p_contact_phone), 10),
    LEFT(TRIM(p_contact_mobile), 10),
    LEFT(TRIM(p_father_name), 50),
    LEFT(TRIM(p_mother_name), 50),
    LEFT(TRIM(p_spouse_name), 25),
    LEFT(TRIM(p_spouse_addr1), 30),
    LEFT(TRIM(p_spouse_addr2), 30),
    LEFT(TRIM(p_spouse_ssn), 6),
    p_spouse_dob,
    LEFT(TRIM(p_beneficiary_name), 50),
    LEFT(TRIM(p_ben_addr1), 30),
    LEFT(TRIM(p_ben_addr2), 30),
    LEFT(TRIM(p_occupation), 4),
    LEFT(TRIM(p_citizenship), 3),
    CASE WHEN p_citizenship IS NOT NULL AND TRIM(p_citizenship) != '' THEN 'Y' ELSE 'N' END,
    p_date_of_residency,
    LEFT(TRIM(p_citizenship), 3),
    CASE WHEN COALESCE(p_has_work_permit, 'N') = 'Y' THEN 'Y' ELSE 'N' END,
    p_work_permit_expiry,
    LEFT(TRIM(p_employer_name), 50),
    LEFT(TRIM(p_employer_address), 200),
    LEFT(TRIM(p_employer_phone), 10),
    LEFT(TRIM(p_employer_town), 50),
    LEFT(TRIM(p_witness_name), 25),
    p_witness_date,
    COALESCE(p_application_date, CURRENT_DATE),
    p_reference_number,
    p_remarks,
    p_submitted_by,
    COALESCE(p_submitted_at, NOW()),
    p_photo_url,
    p_approved_by, NOW(), CURRENT_DATE, COALESCE(p_approved_by::text, 'SYSTEM')
  );

  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants)
    LOOP
      INSERT INTO ip_depend (
        ssn, depend_id, surname, firstname, middle_name,
        dob, sex, relation, depend_addr1, depend_addr2,
        school_child, status, date_modified, tran_code
      ) VALUES (
        '',
        v_dep_seq::varchar,
        LEFT(TRIM(v_dep->>'lastName'), 25),
        LEFT(TRIM(v_dep->>'firstName'), 25),
        NULL,
        (v_dep->>'dateOfBirth')::timestamp,
        LEFT(COALESCE(v_dep->>'gender', 'N'), 1),
        LEFT(v_dep->>'relationship', 3),
        LEFT(TRIM(v_dep->>'address'), 30),
        NULL,
        CASE WHEN (v_dep->>'isInSchool')::boolean THEN 'Y' ELSE 'N' END,
        'P',
        NOW(),
        'ADD'
      );
      v_dep_seq := v_dep_seq + 1;
      v_dep_count := v_dep_count + 1;
    END LOOP;
  END IF;

  INSERT INTO system_audit_trail (
    action, entity_type, entity_id, module,
    user_id, user_name, timestamp, severity,
    payload_json
  ) VALUES (
    'application_conversion', 'ip_master', v_new_uuid::text, 'insured-person-applications',
    p_approved_by, COALESCE(p_approved_by::text, 'SYSTEM'), NOW(), 'info',
    jsonb_build_object(
      'application_reference', p_reference_number,
      'new_ip_master_id', v_new_uuid,
      'source_route', p_source_route,
      'dependants_converted', v_dep_count,
      'employer_name', p_employer_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'ip_master_id', v_new_uuid,
    'application_id', v_application_id,
    'dependants_converted', v_dep_count,
    'message', format('Application %s converted to IP record successfully', p_reference_number)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLSTATE,
    'message', SQLERRM
  );
END;
$$;

-- Governance audit log
INSERT INTO schema_change_approvals (
  change_description, table_name, change_type, risk_level,
  impacted_modules, rollback_script, data_loss_risk,
  approval_status, approver_identity, approved_at, environment
) VALUES (
  'Updated convert_application_to_ip RPC: added spouse_addr1/2, employer fields, submitted_by/at. Added LEFT/TRIM truncation.',
  'convert_application_to_ip (function)',
  'FUNCTION_UPDATE',
  'medium',
  ARRAY['insured-person-applications', 'workflow', 'meetings'],
  'Restore previous function definitions from migration 20260216220510',
  'None - function change only',
  'approved',
  'system-migration',
  NOW(),
  'development'
);
