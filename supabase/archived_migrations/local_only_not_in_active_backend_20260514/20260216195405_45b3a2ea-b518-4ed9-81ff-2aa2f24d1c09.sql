
-- 1. Remove mailing_address column from ip_master
ALTER TABLE public.ip_master DROP COLUMN IF EXISTS mailing_address;

-- 2. Update the RPC to fix field mappings
CREATE OR REPLACE FUNCTION public.convert_application_to_ip(
  p_reference_number TEXT,
  p_title TEXT DEFAULT NULL,
  p_first_name TEXT DEFAULT NULL,
  p_middle_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_suffix TEXT DEFAULT NULL,
  p_maiden_name TEXT DEFAULT NULL,
  p_alias TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_height_feet INT DEFAULT NULL,
  p_height_inches INT DEFAULT NULL,
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
  p_dependants JSONB DEFAULT '[]'::JSONB
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
  -- 1. Duplicate prevention check
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

  -- 2. Generate IDs
  v_new_id := gen_random_uuid();
  v_new_uuid := gen_random_uuid();
  v_application_id := 'APP-' || substring(v_new_id::text from 1 for 8);

  -- 3. Insert ip_master record
  INSERT INTO ip_master (
    id, unique_uuid, application_id, status,
    -- Personal
    first_name, last_name, middle_name, gender, date_of_birth, 
    nationality, marital_status, birth_place, eye_color,
    height_feet, height_inches, date_married,
    -- Legacy personal fields
    surname, firstname, previous_name, name_prefix, name_suffix,
    alias, sex, dob, heightfeet, heightinches, eyecolor,
    -- Address (no more mailing_address)
    resident_address_1, resident_address_2, postal_district,
    resident_addr1, resident_addr2, district, mail_addr1, mail_addr2,
    -- Contact
    email, telephone, mobile,
    email_addr, phone, phone_mobile,
    -- Emergency contact
    contact, contact_relation, contact_addr1, contact_addr2,
    contact_email, contact_phone, contact_mobile,
    -- Relations: father_name and mother_name directly from params
    father_name, mother_name, spouse_name, spouse_ssn, spouse_dob,
    -- Beneficiary: ben_addr1 and ben_addr2 directly from params
    beneficiary, ben_addr1, ben_addr2,
    -- Employment
    occupation, primary_occup, citizenship, citizenship_flag,
    date_of_residency, date_resident,
    work_permit_status, work_permit, work_permit_expiry, work_permit_expiration,
    -- Witness
    witness_name, date_witnessed,
    -- Application tracking
    application_date, application_reference_number, application_remarks,
    -- Photo
    photo_location,
    -- Audit
    created_by, created_at, date_of_entry, entered_by
  ) VALUES (
    v_new_id, v_new_uuid, v_application_id, 'P',
    -- Personal
    p_first_name, p_last_name, p_middle_name, COALESCE(p_gender, 'N'), p_date_of_birth,
    COALESCE(p_nationality, ''), COALESCE(p_marital_status, ''), p_birth_place, p_eye_color,
    p_height_feet, p_height_inches, p_date_married,
    -- Legacy personal
    p_last_name, p_first_name, p_maiden_name, p_title, p_suffix,
    p_alias, LEFT(COALESCE(p_gender, 'N'), 1), p_date_of_birth, p_height_feet, p_height_inches, p_eye_color,
    -- Address: mailingAddr1 → mail_addr1, mailingAddr2 → mail_addr2
    p_address_line1, p_address_line2, p_postal_district,
    p_address_line1, p_address_line2, p_postal_district, p_mailing_addr1, p_mailing_addr2,
    -- Contact
    p_email, p_phone, p_phone_mobile,
    p_email, p_phone, p_phone_mobile,
    -- Emergency contact: contactAddress → contact_addr1, contactAddress1 → contact_addr2
    p_contact_name, p_contact_relation, p_contact_addr1, p_contact_addr2,
    p_contact_email, p_contact_phone, p_contact_mobile,
    -- Relations: fatherName → father_name, motherName → mother_name (direct single strings)
    p_father_name, p_mother_name, p_spouse_name, p_spouse_ssn, p_spouse_dob,
    -- Beneficiary: beneficiaryAddress → ben_addr1, beneficiaryAddress1 → ben_addr2
    p_beneficiary_name, p_ben_addr1, p_ben_addr2,
    -- Employment
    p_occupation, p_occupation, p_citizenship, 
    CASE WHEN p_citizenship IS NOT NULL AND p_citizenship != '' THEN 'Y' ELSE 'N' END,
    p_date_of_residency, p_date_of_residency,
    CASE WHEN COALESCE(p_has_work_permit, 'N') = 'Y' THEN 'Y' ELSE 'N' END,
    CASE WHEN COALESCE(p_has_work_permit, 'N') = 'Y' THEN 'Y' ELSE 'N' END,
    p_work_permit_expiry, p_work_permit_expiry,
    -- Witness
    p_witness_name, p_witness_date,
    -- Application tracking
    COALESCE(p_application_date, CURRENT_DATE), p_reference_number, p_remarks,
    -- Photo
    p_photo_url,
    -- Audit
    p_approved_by, NOW(), CURRENT_DATE, COALESCE(p_approved_by::text, 'SYSTEM')
  );

  -- 4. Insert dependants
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
        v_dep->>'lastName',
        v_dep->>'firstName',
        NULL,
        (v_dep->>'dateOfBirth')::timestamp,
        LEFT(COALESCE(v_dep->>'gender', 'N'), 1),
        v_dep->>'relationship',
        v_dep->>'address',
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

  -- 5. Audit trail
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
      'dependants_converted', v_dep_count
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
