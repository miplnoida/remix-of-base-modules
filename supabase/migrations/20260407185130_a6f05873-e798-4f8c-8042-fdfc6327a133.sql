
-- Drop all overloads of convert_application_to_employer
DROP FUNCTION IF EXISTS public.convert_application_to_employer(
  text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text, text,
  double precision, double precision,
  text, text, text, text, text, text, text,
  text, text, text, text, text, text, uuid, text, text, text
);

DROP FUNCTION IF EXISTS public.convert_application_to_employer;

-- Recreate with p_documents_json parameter
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
  p_office_code TEXT DEFAULT 'STK',
  p_ownership_code TEXT DEFAULT NULL,
  p_sector_code TEXT DEFAULT 'O',
  p_industrial_code TEXT DEFAULT '0000',
  p_village_code TEXT DEFAULT '000',
  p_activity_type TEXT DEFAULT NULL,
  p_inspector_code TEXT DEFAULT 'UNK',
  p_males_employed FLOAT DEFAULT NULL,
  p_females_employed FLOAT DEFAULT NULL,
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
  p_user_id UUID DEFAULT NULL,
  p_owners_json TEXT DEFAULT '[]',
  p_locations_json TEXT DEFAULT '[]',
  p_notes_json TEXT DEFAULT '[]',
  p_documents_json TEXT DEFAULT '[]'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_regno TEXT;
  v_owner JSONB;
  v_location JSONB;
  v_note JSONB;
  v_doc JSONB;
  v_location_seq BIGINT := 0;
  v_owner_seq BIGINT := 0;
  v_note_seq BIGINT := 0;
  v_doc_count BIGINT := 0;
  v_owners_arr JSONB;
  v_locations_arr JSONB;
  v_notes_arr JSONB;
  v_docs_arr JSONB;
BEGIN
  -- ── Duplicate check ──────────────────────────────────────────────────────
  IF p_application_reference IS NOT NULL AND p_application_reference <> '' THEN
    IF EXISTS (
      SELECT 1 FROM er_master WHERE registry_num = p_application_reference
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'An employer registration already exists for application reference: ' || p_application_reference
      );
    END IF;
  END IF;

  -- ── Generate registration number ─────────────────────────────────────────
  v_regno := public.generate_temp_er_regno();

  -- ── Insert er_master ─────────────────────────────────────────────────────
  INSERT INTO er_master (
    regno, name, trade_name, phone, fax,
    hq_addr1, hq_addr2, maddr1, maddr2,
    email, mobile,
    office_code, ownership_code, sector_code, industrial_code, village_code,
    activity_type, inspector_code,
    males_employed, females_employed,
    date_wages_first_paid, application_date, date_incorporated, date_of_acquisition,
    previous_owner, prev_owner_addr1, prev_owner_addr2,
    computer_payroll, make_model, acquired_code,
    parent_regno, registry_num,
    status, entered_by, date_of_entry,
    arrears, legal_action
  ) VALUES (
    v_regno,
    COALESCE(p_employer_name, 'Unknown'),
    p_trade_name,
    p_phone,
    p_fax,
    p_hq_addr1,
    p_hq_addr2,
    p_maddr1,
    p_maddr2,
    p_email,
    p_mobile,
    COALESCE(p_office_code, 'STK'),
    p_ownership_code,
    COALESCE(p_sector_code, 'O'),
    COALESCE(p_industrial_code, '0000'),
    COALESCE(p_village_code, '000'),
    p_activity_type,
    COALESCE(p_inspector_code, 'UNK'),
    p_males_employed,
    p_females_employed,
    CASE WHEN p_date_wages_first_paid IS NOT NULL THEN p_date_wages_first_paid::timestamp ELSE NULL END,
    CASE WHEN p_application_date IS NOT NULL THEN p_application_date::timestamp ELSE now() END,
    CASE WHEN p_date_incorporated IS NOT NULL THEN p_date_incorporated::timestamp ELSE NULL END,
    CASE WHEN p_date_of_acquisition IS NOT NULL THEN p_date_of_acquisition::timestamp ELSE NULL END,
    p_previous_owner,
    p_prev_owner_addr1,
    p_prev_owner_addr2,
    COALESCE(p_computer_payroll, 'N'),
    p_make_model,
    COALESCE(p_acquired_code, 'N'),
    p_parent_regno,
    p_application_reference,
    'P',
    p_entered_by,
    now(),
    'N',
    'N'
  );

  -- ── Insert owners ─────────────────────────────────────────────────────────
  v_owners_arr := p_owners_json::jsonb;
  IF jsonb_array_length(v_owners_arr) > 0 THEN
    FOR v_owner IN SELECT * FROM jsonb_array_elements(v_owners_arr)
    LOOP
      v_owner_seq := v_owner_seq + 1;
      INSERT INTO er_owner (
        regno, location_id, owner_id,
        name, title, phone, mobile, email, ssn
      ) VALUES (
        v_regno,
        0,
        v_owner_seq,
        v_owner->>'name',
        v_owner->>'title',
        v_owner->>'phone',
        v_owner->>'mobile',
        v_owner->>'email',
        v_owner->>'ssn'
      );
    END LOOP;
  END IF;

  -- ── Insert locations ─────────────────────────────────────────────────────
  v_locations_arr := p_locations_json::jsonb;
  IF jsonb_array_length(v_locations_arr) > 0 THEN
    FOR v_location IN SELECT * FROM jsonb_array_elements(v_locations_arr)
    LOOP
      v_location_seq := v_location_seq + 1;
      INSERT INTO er_locations (
        regno, location_id,
        trade_name, loc_addr1, loc_addr2, activity_type
      ) VALUES (
        v_regno,
        v_location_seq,
        v_location->>'trade_name',
        v_location->>'loc_addr1',
        v_location->>'loc_addr2',
        v_location->>'activity_type'
      );
    END LOOP;
  END IF;

  -- ── Insert notes ─────────────────────────────────────────────────────────
  v_notes_arr := p_notes_json::jsonb;
  IF jsonb_array_length(v_notes_arr) > 0 THEN
    FOR v_note IN SELECT * FROM jsonb_array_elements(v_notes_arr)
    LOOP
      v_note_seq := v_note_seq + 1;
      INSERT INTO er_notes (
        regno, seq_no, note, note_date, user_id
      ) VALUES (
        v_regno,
        v_note_seq,
        v_note->>'note',
        CASE WHEN (v_note->>'note_date') IS NOT NULL THEN (v_note->>'note_date')::timestamp ELSE now() END,
        COALESCE(v_note->>'user_id', p_entered_by)
      );
    END LOOP;
  END IF;

  -- ── Insert documents (atomic — rolls back entire transaction on failure) ─
  v_docs_arr := p_documents_json::jsonb;
  IF jsonb_array_length(v_docs_arr) > 0 THEN
    FOR v_doc IN SELECT * FROM jsonb_array_elements(v_docs_arr)
    LOOP
      v_doc_count := v_doc_count + 1;
      INSERT INTO er_application_documents (
        regno,
        source_application_reference,
        doc_code,
        document_type,
        document_description,
        file_name,
        file_path,
        storage_url,
        file_size,
        mime_type,
        uploaded_by,
        uploaded_by_code,
        transferred_by,
        is_active,
        metadata
      ) VALUES (
        v_regno,
        COALESCE(p_application_reference, ''),
        v_doc->>'doc_code',
        v_doc->>'document_type',
        v_doc->>'document_description',
        COALESCE(v_doc->>'file_name', 'unknown'),
        COALESCE(v_doc->>'file_path', ''),
        COALESCE(v_doc->>'storage_url', ''),
        (v_doc->>'file_size')::bigint,
        v_doc->>'mime_type',
        v_doc->>'uploaded_by',
        v_doc->>'uploaded_by_code',
        p_entered_by,
        true,
        CASE WHEN v_doc->'metadata' IS NOT NULL AND v_doc->>'metadata' <> 'null' THEN v_doc->'metadata' ELSE NULL END
      );
    END LOOP;
  END IF;

  -- ── Return success ───────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success', true,
    'regno', v_regno,
    'message', 'Employer Registration ' || v_regno || ' created successfully',
    'owners_added', v_owner_seq,
    'locations_added', v_location_seq,
    'notes_added', v_note_seq,
    'documents_added', v_doc_count
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Conversion failed: ' || SQLERRM
    );
END;
$$;
