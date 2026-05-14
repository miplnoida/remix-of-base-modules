-- Migration: Add city, state, country to er_master and er_locations

-- 1. Add columns to er_master
ALTER TABLE er_master
  ADD COLUMN IF NOT EXISTS hq_city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hq_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hq_country VARCHAR(10),
  ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mailing_country VARCHAR(10);

-- 2. Add columns to er_locations
ALTER TABLE er_locations
  ADD COLUMN IF NOT EXISTS city VARCHAR(50),
  ADD COLUMN IF NOT EXISTS state VARCHAR(50),
  ADD COLUMN IF NOT EXISTS country VARCHAR(10);

-- 3. Drop existing function overloads before recreation
DROP FUNCTION IF EXISTS public.convert_application_to_employer(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

-- 4. Recreate with new parameters
CREATE OR REPLACE FUNCTION public.convert_application_to_employer(
  p_application_reference TEXT DEFAULT NULL,
  p_employer_name TEXT DEFAULT NULL,
  p_trade_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_fax TEXT DEFAULT NULL,
  p_hq_addr1 TEXT DEFAULT NULL,
  p_hq_addr2 TEXT DEFAULT NULL,
  p_maddr1 TEXT DEFAULT NULL,
  p_maddr2 TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_mobile TEXT DEFAULT NULL,
  p_office_code TEXT DEFAULT NULL,
  p_ownership_code TEXT DEFAULT NULL,
  p_sector_code TEXT DEFAULT NULL,
  p_industrial_code TEXT DEFAULT NULL,
  p_village_code TEXT DEFAULT NULL,
  p_activity_type TEXT DEFAULT NULL,
  p_inspector_code TEXT DEFAULT NULL,
  p_males_employed INTEGER DEFAULT NULL,
  p_females_employed INTEGER DEFAULT NULL,
  p_date_wages_first_paid TEXT DEFAULT NULL,
  p_application_date TEXT DEFAULT NULL,
  p_date_incorporated TEXT DEFAULT NULL,
  p_date_of_acquisition TEXT DEFAULT NULL,
  p_previous_owner TEXT DEFAULT NULL,
  p_prev_owner_addr1 TEXT DEFAULT NULL,
  p_prev_owner_addr2 TEXT DEFAULT NULL,
  p_computer_payroll TEXT DEFAULT 'N',
  p_make_model TEXT DEFAULT NULL,
  p_acquired_code TEXT DEFAULT 'N',
  p_parent_regno TEXT DEFAULT NULL,
  p_registry_num TEXT DEFAULT NULL,
  p_entered_by TEXT DEFAULT NULL,
  p_user_id TEXT DEFAULT NULL,
  p_owners_json TEXT DEFAULT '[]',
  p_locations_json TEXT DEFAULT '[]',
  p_notes_json TEXT DEFAULT '[]',
  p_documents_json TEXT DEFAULT '[]',
  -- New address fields
  p_hq_city TEXT DEFAULT NULL,
  p_hq_state TEXT DEFAULT NULL,
  p_hq_country TEXT DEFAULT NULL,
  p_mailing_city TEXT DEFAULT NULL,
  p_mailing_state TEXT DEFAULT NULL,
  p_mailing_country TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regno TEXT;
  v_now TIMESTAMP := now();
  v_today DATE := CURRENT_DATE;
  v_location_id INTEGER := 0;
  v_owner_id INTEGER := 0;
  v_seq_no INTEGER := 0;
  v_location JSONB;
  v_owner JSONB;
  v_note JSONB;
  v_doc JSONB;
  v_doc_count INTEGER := 0;
  v_existing_regno TEXT;
BEGIN
  -- Check for duplicate application reference
  IF p_application_reference IS NOT NULL THEN
    SELECT regno INTO v_existing_regno
    FROM er_master
    WHERE registry_num = p_application_reference
    LIMIT 1;
    
    IF v_existing_regno IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', format('Application %s has already been converted to employer %s', p_application_reference, v_existing_regno),
        'regno', v_existing_regno
      );
    END IF;
  END IF;

  -- Generate temporary registration number (T-series)
  SELECT COALESCE(
    'T' || LPAD((COALESCE(MAX(SUBSTRING(regno FROM 2)::INTEGER), 0) + 1)::TEXT, 5, '0'),
    'T00001'
  ) INTO v_regno
  FROM er_master
  WHERE regno LIKE 'T%';

  -- Insert into er_master
  INSERT INTO er_master (
    regno, name, trade_name, phone, fax,
    hq_addr1, hq_addr2, maddr1, maddr2,
    email, mobile, office_code, ownership_code,
    sector_code, industrial_code, village_code,
    activity_type, inspector_code,
    males_employed, females_employed,
    date_wages_first_paid, application_date,
    date_incorporated, date_of_acquisition,
    previous_owner, prev_owner_addr1, prev_owner_addr2,
    computer_payroll, make_model, acquired_code,
    parent_regno, registry_num,
    entered_by, date_of_entry, status,
    arrears, legal_action,
    hq_city, hq_state, hq_country,
    mailing_city, mailing_state, mailing_country
  ) VALUES (
    v_regno, p_employer_name, p_trade_name, p_phone, p_fax,
    p_hq_addr1, p_hq_addr2, p_maddr1, p_maddr2,
    p_email, p_mobile, COALESCE(p_office_code, 'STK'), p_ownership_code,
    COALESCE(p_sector_code, 'O'), COALESCE(p_industrial_code, '0000'), COALESCE(p_village_code, '000'),
    p_activity_type, COALESCE(p_inspector_code, 'UNK'),
    p_males_employed, p_females_employed,
    p_date_wages_first_paid::DATE, COALESCE(p_application_date::DATE, v_today),
    p_date_incorporated::DATE, p_date_of_acquisition::DATE,
    p_previous_owner, p_prev_owner_addr1, p_prev_owner_addr2,
    COALESCE(p_computer_payroll, 'N'), p_make_model, COALESCE(p_acquired_code, 'N'),
    p_parent_regno, p_application_reference,
    p_entered_by, v_today, 'Z',
    'N', 'N',
    p_hq_city, p_hq_state, p_hq_country,
    p_mailing_city, p_mailing_state, p_mailing_country
  );

  -- Insert locations
  FOR v_location IN SELECT * FROM jsonb_array_elements(p_locations_json::JSONB) LOOP
    v_location_id := v_location_id + 1;
    INSERT INTO er_locations (
      regno, location_id, trade_name, loc_addr1, loc_addr2, activity_type,
      city, state, country
    ) VALUES (
      v_regno,
      v_location_id,
      v_location->>'trade_name',
      v_location->>'loc_addr1',
      v_location->>'loc_addr2',
      v_location->>'activity_type',
      v_location->>'city',
      v_location->>'state',
      v_location->>'country'
    );
  END LOOP;

  -- Insert owners
  FOR v_owner IN SELECT * FROM jsonb_array_elements(p_owners_json::JSONB) LOOP
    v_owner_id := v_owner_id + 1;
    INSERT INTO er_owner (
      regno, location_id, owner_id, name, title, phone, mobile, email, ssn
    ) VALUES (
      v_regno, 0, v_owner_id,
      v_owner->>'name',
      v_owner->>'title',
      v_owner->>'phone',
      v_owner->>'mobile',
      v_owner->>'email',
      v_owner->>'ssn'
    );
  END LOOP;

  -- Insert notes
  FOR v_note IN SELECT * FROM jsonb_array_elements(p_notes_json::JSONB) LOOP
    v_seq_no := v_seq_no + 1;
    INSERT INTO er_notes (
      regno, seq_no, note_date, note, user_id
    ) VALUES (
      v_regno,
      v_seq_no,
      COALESCE((v_note->>'note_date')::DATE, v_today),
      v_note->>'note',
      COALESCE(v_note->>'user_id', p_entered_by)
    );
  END LOOP;

  -- Insert documents
  FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents_json::JSONB) LOOP
    v_doc_count := v_doc_count + 1;
    INSERT INTO er_documents (
      regno, file_name, file_path, storage_url,
      document_type, document_description, doc_code,
      mime_type, file_size, uploaded_by, uploaded_by_code,
      is_supportive, metadata, created_at
    ) VALUES (
      v_regno,
      v_doc->>'file_name',
      v_doc->>'file_path',
      v_doc->>'storage_url',
      v_doc->>'document_type',
      v_doc->>'document_description',
      v_doc->>'doc_code',
      v_doc->>'mime_type',
      (v_doc->>'file_size')::BIGINT,
      p_user_id,
      p_entered_by,
      COALESCE((v_doc->>'is_supportive')::BOOLEAN, false),
      CASE WHEN v_doc->'metadata' IS NOT NULL THEN v_doc->'metadata' ELSE NULL END,
      v_now
    );
  END LOOP;

  -- Log audit trail
  INSERT INTO system_audit_trail (
    action, module, record_id, details, performed_by, performed_at
  ) VALUES (
    'CONVERT_APPLICATION',
    'employer-registration',
    v_regno,
    jsonb_build_object(
      'application_reference', p_application_reference,
      'employer_name', p_employer_name,
      'documents_added', v_doc_count,
      'locations_added', v_location_id,
      'owners_added', v_owner_id,
      'notes_added', v_seq_no
    ),
    COALESCE(p_entered_by, p_user_id),
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'regno', v_regno,
    'message', format('Employer registration %s created successfully', v_regno),
    'documents_added', v_doc_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', format('Failed to create employer registration: %s', SQLERRM)
  );
END;
$$;