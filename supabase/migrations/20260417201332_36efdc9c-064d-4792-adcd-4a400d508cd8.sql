
ALTER TABLE public.er_documents ALTER COLUMN regno TYPE VARCHAR(20);
ALTER TABLE public.er_documents ALTER COLUMN document_type TYPE TEXT;
ALTER TABLE public.er_documents ALTER COLUMN doc_code TYPE VARCHAR(20);
ALTER TABLE public.er_documents ALTER COLUMN mime_type TYPE VARCHAR(150);
ALTER TABLE public.er_documents ALTER COLUMN uploaded_by TYPE TEXT;
ALTER TABLE public.er_documents ALTER COLUMN uploaded_by_code TYPE TEXT;

ALTER TABLE public.er_documents ADD COLUMN IF NOT EXISTS source_application_reference TEXT;
ALTER TABLE public.er_documents ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.er_documents ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;
ALTER TABLE public.er_documents ADD COLUMN IF NOT EXISTS transferred_by TEXT;
ALTER TABLE public.er_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_er_documents_updated_at ON public.er_documents;
CREATE TRIGGER trg_er_documents_updated_at
BEFORE UPDATE ON public.er_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_er_documents_regno_active ON public.er_documents(regno, is_active);

CREATE OR REPLACE FUNCTION public.convert_application_to_employer(
  p_application_reference text DEFAULT NULL::text,
  p_employer_name text DEFAULT NULL::text,
  p_trade_name text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_fax text DEFAULT NULL::text,
  p_hq_addr1 text DEFAULT NULL::text,
  p_hq_addr2 text DEFAULT NULL::text,
  p_maddr1 text DEFAULT NULL::text,
  p_maddr2 text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_mobile text DEFAULT NULL::text,
  p_office_code text DEFAULT NULL::text,
  p_ownership_code text DEFAULT NULL::text,
  p_sector_code text DEFAULT NULL::text,
  p_industrial_code text DEFAULT NULL::text,
  p_village_code text DEFAULT NULL::text,
  p_activity_type text DEFAULT NULL::text,
  p_inspector_code text DEFAULT NULL::text,
  p_males_employed integer DEFAULT NULL::integer,
  p_females_employed integer DEFAULT NULL::integer,
  p_date_wages_first_paid text DEFAULT NULL::text,
  p_application_date text DEFAULT NULL::text,
  p_date_incorporated text DEFAULT NULL::text,
  p_date_of_acquisition text DEFAULT NULL::text,
  p_previous_owner text DEFAULT NULL::text,
  p_prev_owner_addr1 text DEFAULT NULL::text,
  p_prev_owner_addr2 text DEFAULT NULL::text,
  p_computer_payroll text DEFAULT 'N'::text,
  p_make_model text DEFAULT NULL::text,
  p_acquired_code text DEFAULT 'N'::text,
  p_parent_regno text DEFAULT NULL::text,
  p_registry_num text DEFAULT NULL::text,
  p_entered_by text DEFAULT NULL::text,
  p_user_id text DEFAULT NULL::text,
  p_owners_json text DEFAULT '[]'::text,
  p_locations_json text DEFAULT '[]'::text,
  p_notes_json text DEFAULT '[]'::text,
  p_documents_json text DEFAULT '[]'::text,
  p_hq_city text DEFAULT NULL::text,
  p_hq_state text DEFAULT NULL::text,
  p_hq_country text DEFAULT NULL::text,
  p_mailing_city text DEFAULT NULL::text,
  p_mailing_state text DEFAULT NULL::text,
  p_mailing_country text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  IF p_application_reference IS NOT NULL THEN
    SELECT regno INTO v_existing_regno FROM er_master WHERE registry_num = p_application_reference LIMIT 1;
    IF v_existing_regno IS NOT NULL THEN
      RETURN jsonb_build_object('success', false,
        'message', format('Application %s has already been converted to employer %s', p_application_reference, v_existing_regno),
        'regno', v_existing_regno);
    END IF;
  END IF;

  SELECT COALESCE('T' || LPAD((COALESCE(MAX(SUBSTRING(regno FROM 2)::INTEGER), 0) + 1)::TEXT, 5, '0'), 'T00001')
  INTO v_regno FROM er_master WHERE regno ~ '^T\d{5}$';

  INSERT INTO er_master (
    regno, name, trade_name, phone, fax, hq_addr1, hq_addr2, maddr1, maddr2,
    email, mobile, office_code, ownership_code, sector_code, industrial_code, village_code,
    activity_type, inspector_code, males_employed, females_employed,
    date_wages_first_paid, application_date, date_incorporated, date_of_acquisition,
    previous_owner, prev_owner_addr1, prev_owner_addr2, computer_payroll, make_model, acquired_code,
    parent_regno, registry_num, entered_by, date_of_entry, status, arrears, legal_action,
    hq_city, hq_state, hq_country, mailing_city, mailing_state, mailing_country
  ) VALUES (
    v_regno, p_employer_name, p_trade_name, p_phone, p_fax, p_hq_addr1, p_hq_addr2, p_maddr1, p_maddr2,
    p_email, p_mobile, COALESCE(p_office_code, 'STK'), p_ownership_code,
    COALESCE(p_sector_code, 'O'), COALESCE(p_industrial_code, '0000'), COALESCE(p_village_code, '000'),
    p_activity_type, COALESCE(p_inspector_code, 'UNK'), p_males_employed, p_females_employed,
    p_date_wages_first_paid::DATE, COALESCE(p_application_date::DATE, v_today),
    p_date_incorporated::DATE, p_date_of_acquisition::DATE,
    p_previous_owner, p_prev_owner_addr1, p_prev_owner_addr2,
    COALESCE(p_computer_payroll, 'N'), p_make_model, COALESCE(p_acquired_code, 'N'),
    p_parent_regno, p_application_reference, p_entered_by, v_today, 'Z', 'N', 'N',
    p_hq_city, p_hq_state, p_hq_country, p_mailing_city, p_mailing_state, p_mailing_country
  );

  FOR v_location IN SELECT * FROM jsonb_array_elements(p_locations_json::JSONB) LOOP
    v_location_id := v_location_id + 1;
    INSERT INTO er_locations (regno, location_id, trade_name, loc_addr1, loc_addr2, activity_type, city, state, country)
    VALUES (v_regno, v_location_id, v_location->>'trade_name', v_location->>'loc_addr1', v_location->>'loc_addr2',
      v_location->>'activity_type', v_location->>'city', v_location->>'state', v_location->>'country');
  END LOOP;

  FOR v_owner IN SELECT * FROM jsonb_array_elements(p_owners_json::JSONB) LOOP
    v_owner_id := v_owner_id + 1;
    INSERT INTO er_owner (regno, location_id, owner_id, name, title, phone, mobile, email, ssn)
    VALUES (v_regno, 0, v_owner_id, v_owner->>'name', v_owner->>'title', v_owner->>'phone',
      v_owner->>'mobile', v_owner->>'email', v_owner->>'ssn');
  END LOOP;

  FOR v_note IN SELECT * FROM jsonb_array_elements(p_notes_json::JSONB) LOOP
    v_seq_no := v_seq_no + 1;
    INSERT INTO er_notes (regno, seq_no, note_date, note, user_id)
    VALUES (v_regno, v_seq_no, COALESCE((v_note->>'note_date')::DATE, v_today),
      v_note->>'note', COALESCE(v_note->>'user_id', p_entered_by));
  END LOOP;

  FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents_json::JSONB) LOOP
    v_doc_count := v_doc_count + 1;
    INSERT INTO er_documents (
      regno, file_name, file_path, storage_url,
      document_type, document_description, doc_code,
      mime_type, file_size, uploaded_by, uploaded_by_code,
      is_supportive, metadata, created_at,
      source_application_reference, is_active, transferred_at, transferred_by, updated_at
    ) VALUES (
      v_regno, v_doc->>'file_name', v_doc->>'file_path', v_doc->>'storage_url',
      v_doc->>'document_type', v_doc->>'document_description', v_doc->>'doc_code',
      v_doc->>'mime_type', (v_doc->>'file_size')::BIGINT,
      p_user_id, p_entered_by,
      COALESCE((v_doc->>'is_supportive')::BOOLEAN, false),
      CASE WHEN v_doc->'metadata' IS NOT NULL THEN v_doc->'metadata' ELSE NULL END,
      v_now,
      p_application_reference, true, v_now, p_entered_by, v_now
    );
  END LOOP;

  INSERT INTO system_audit_trail (action, module, entity_type, entity_id, payload_json, user_name, created_at)
  VALUES ('CONVERT_APPLICATION', 'employer-registration', 'employer', v_regno,
    jsonb_build_object('application_reference', p_application_reference, 'employer_name', p_employer_name,
      'documents_added', v_doc_count, 'locations_added', v_location_id,
      'owners_added', v_owner_id, 'notes_added', v_seq_no),
    COALESCE(p_entered_by, p_user_id), v_now);

  RETURN jsonb_build_object('success', true, 'regno', v_regno,
    'message', format('Employer registration %s created successfully', v_regno),
    'documents_added', v_doc_count);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false,
    'message', format('Failed to create employer registration: %s', SQLERRM));
END;
$function$;

INSERT INTO public.er_documents (
  regno, file_name, file_path, storage_url,
  document_type, document_description, doc_code,
  mime_type, file_size, uploaded_by, uploaded_by_code,
  is_supportive, metadata, created_at,
  source_application_reference, is_active, transferred_at, transferred_by, updated_at
)
SELECT
  a.regno, a.file_name, a.file_path, a.storage_url,
  a.document_type, a.document_description, a.doc_code,
  a.mime_type, a.file_size, a.uploaded_by, a.uploaded_by_code,
  false, a.metadata, COALESCE(a.created_at, now()),
  a.source_application_reference, COALESCE(a.is_active, true),
  COALESCE(a.transferred_at, a.created_at, now()),
  a.transferred_by, COALESCE(a.updated_at, a.created_at, now())
FROM public.er_application_documents a
WHERE a.regno IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.er_documents d
    WHERE d.regno = a.regno AND d.file_path = a.file_path
  );
