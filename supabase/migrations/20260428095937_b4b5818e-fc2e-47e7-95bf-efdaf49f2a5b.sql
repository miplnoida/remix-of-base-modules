
-- =====================================================================
-- 1. Audit table for merge decisions
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ip_application_doc_merge_audit (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_reference_number VARCHAR(50) NOT NULL,
  ssn                         VARCHAR(6),
  unique_uuid                 UUID,
  source_document_id          VARCHAR(100),
  decision                    TEXT NOT NULL CHECK (decision IN
                                ('kept_external','replaced_by_reviewer','reviewer_added','deleted_by_reviewer')),
  before_snapshot             JSONB,
  after_snapshot              JSONB,
  created_by                  UUID,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_app_doc_merge_audit_app_ref
  ON public.ip_application_doc_merge_audit (application_reference_number);
CREATE INDEX IF NOT EXISTS idx_ip_app_doc_merge_audit_unique_uuid
  ON public.ip_application_doc_merge_audit (unique_uuid);

-- =====================================================================
-- 2. New resolver used by the conversion path
-- =====================================================================
DROP FUNCTION IF EXISTS public.ip_app_docs_resolve_for_conversion(text, jsonb);

CREATE OR REPLACE FUNCTION public.ip_app_docs_resolve_for_conversion(
  p_application_reference text,
  p_external_docs         jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_decisions      jsonb := '[]'::jsonb;
  v_merged         jsonb := '[]'::jsonb;
  v_missing        text[] := ARRAY[]::text[];
  v_ext            jsonb;
  v_ovr            RECORD;
  v_match          RECORD;
  v_present_cats   text[] := ARRAY[]::text[];
  v_mandatory_cats text[] := ARRAY['birth_status','name_status'];
  v_doc_id         text;
  v_used_override_ids uuid[] := ARRAY[]::uuid[];
  v_norm           jsonb;
  v_is_supportive  boolean;
  v_v_cat          text;
  v_doc_code       text;
BEGIN
  -- Iterate external docs first
  IF p_external_docs IS NOT NULL THEN
    FOR v_ext IN SELECT * FROM jsonb_array_elements(COALESCE(p_external_docs, '[]'::jsonb))
    LOOP
      v_doc_id := COALESCE(v_ext->>'id', v_ext->>'documentId', v_ext->>'document_id');

      -- Find a matching reviewer override (active OR deleted) by source_document_id
      SELECT * INTO v_match
        FROM public.ip_application_documents
       WHERE application_reference_number = p_application_reference
         AND source_document_id IS NOT NULL
         AND source_document_id = v_doc_id
       ORDER BY (CASE WHEN is_deleted THEN 1 ELSE 0 END), version DESC
       LIMIT 1;

      IF FOUND AND COALESCE(v_match.is_deleted, FALSE) = TRUE THEN
        -- Reviewer deleted this external doc → exclude from merged
        v_decisions := v_decisions || jsonb_build_object(
          'source_document_id', v_doc_id,
          'decision',           'deleted_by_reviewer',
          'before_snapshot',    v_ext,
          'after_snapshot',     NULL
        );
        v_used_override_ids := v_used_override_ids || v_match.id;
        CONTINUE;
      ELSIF FOUND THEN
        -- Reviewer replaced → use the override row, normalized
        v_v_cat         := COALESCE(v_match.verification_category, '');
        v_is_supportive := COALESCE(v_match.is_supportive, FALSE)
                           OR v_v_cat = 'supportive'
                           OR v_match.supportive_doc_type IS NOT NULL;
        v_doc_code      := COALESCE(v_match.metadata->>'doc_code', NULL);
        IF v_doc_code IS NULL AND v_match.document_type IS NOT NULL
           AND char_length(v_match.document_type) = 1 THEN
          v_doc_code := upper(v_match.document_type);
        END IF;

        v_norm := jsonb_build_object(
          'id',                v_match.id::text,
          'name',              COALESCE(v_match.document_name, v_match.file_name),
          'fileName',          COALESCE(v_match.file_name, v_match.document_name),
          'documentType',      v_match.document_type,
          'type',              v_match.document_type,
          'verificationType',  NULLIF(v_v_cat, ''),
          'filePath',          v_match.file_path,
          'url',               v_match.url,
          'signedUrl',         v_match.signed_url,
          'mimeType',          v_match.mime_type,
          'fileSize',          CASE WHEN v_match.file_size IS NOT NULL THEN v_match.file_size::text ELSE NULL END,
          'uploadedAt',        v_match.uploaded_at,
          'isSupportive',      v_is_supportive,
          'supportiveDocType', v_match.supportive_doc_type,
          'docCode',           v_doc_code,
          'metadata',          COALESCE(v_match.metadata, '{}'::jsonb)
                                || jsonb_build_object('doc_code', v_doc_code)
        );

        v_merged    := v_merged || v_norm;
        v_decisions := v_decisions || jsonb_build_object(
          'source_document_id', v_doc_id,
          'decision',           'replaced_by_reviewer',
          'before_snapshot',    v_ext,
          'after_snapshot',     v_norm
        );
        v_used_override_ids := v_used_override_ids || v_match.id;
        IF NULLIF(v_v_cat, '') IS NOT NULL THEN
          v_present_cats := v_present_cats || v_v_cat;
        END IF;
        CONTINUE;
      END IF;

      -- Kept external as-is (already in canonical RPC shape from the client)
      v_merged    := v_merged || v_ext;
      v_decisions := v_decisions || jsonb_build_object(
        'source_document_id', v_doc_id,
        'decision',           'kept_external',
        'before_snapshot',    v_ext,
        'after_snapshot',     v_ext
      );
      IF v_ext ? 'verificationType' AND NULLIF(v_ext->>'verificationType','') IS NOT NULL THEN
        v_present_cats := v_present_cats || (v_ext->>'verificationType');
      END IF;
    END LOOP;
  END IF;

  -- Reviewer-added docs (active overrides not already consumed above)
  FOR v_ovr IN
    SELECT *
      FROM public.ip_application_documents
     WHERE application_reference_number = p_application_reference
       AND COALESCE(is_active, TRUE) = TRUE
       AND COALESCE(is_deleted, FALSE) = FALSE
       AND COALESCE(file_path, url, '') <> ''
       AND NOT (id = ANY(v_used_override_ids))
  LOOP
    v_v_cat         := COALESCE(v_ovr.verification_category, '');
    v_is_supportive := COALESCE(v_ovr.is_supportive, FALSE)
                       OR v_v_cat = 'supportive'
                       OR v_ovr.supportive_doc_type IS NOT NULL;
    v_doc_code      := COALESCE(v_ovr.metadata->>'doc_code', NULL);
    IF v_doc_code IS NULL AND v_ovr.document_type IS NOT NULL
       AND char_length(v_ovr.document_type) = 1 THEN
      v_doc_code := upper(v_ovr.document_type);
    END IF;

    v_norm := jsonb_build_object(
      'id',                v_ovr.id::text,
      'name',              COALESCE(v_ovr.document_name, v_ovr.file_name),
      'fileName',          COALESCE(v_ovr.file_name, v_ovr.document_name),
      'documentType',      v_ovr.document_type,
      'type',              v_ovr.document_type,
      'verificationType',  NULLIF(v_v_cat, ''),
      'filePath',          v_ovr.file_path,
      'url',               v_ovr.url,
      'signedUrl',         v_ovr.signed_url,
      'mimeType',          v_ovr.mime_type,
      'fileSize',          CASE WHEN v_ovr.file_size IS NOT NULL THEN v_ovr.file_size::text ELSE NULL END,
      'uploadedAt',        v_ovr.uploaded_at,
      'isSupportive',      v_is_supportive,
      'supportiveDocType', v_ovr.supportive_doc_type,
      'docCode',           v_doc_code,
      'metadata',          COALESCE(v_ovr.metadata, '{}'::jsonb)
                            || jsonb_build_object('doc_code', v_doc_code)
    );

    v_merged    := v_merged || v_norm;
    v_decisions := v_decisions || jsonb_build_object(
      'source_document_id', v_ovr.source_document_id,
      'decision',           'reviewer_added',
      'before_snapshot',    NULL,
      'after_snapshot',     v_norm
    );
    IF NULLIF(v_v_cat, '') IS NOT NULL THEN
      v_present_cats := v_present_cats || v_v_cat;
    END IF;
  END LOOP;

  -- Mandatory document check (mandatory categories minus 'supportive')
  SELECT COALESCE(array_agg(c), ARRAY[]::text[])
    INTO v_missing
    FROM unnest(v_mandatory_cats) c
   WHERE NOT (c = ANY(v_present_cats));

  RETURN jsonb_build_object(
    'merged',            v_merged,
    'decisions',         v_decisions,
    'missing_mandatory', to_jsonb(v_missing)
  );
END;
$$;

-- =====================================================================
-- 3. Update convert_application_atomic
--    - new param p_doc_decisions jsonb
--    - writes ip_application_doc_merge_audit rows
--    - tightens is_supportive / doc_code derivation in the master mirror
--    Drop old overload first to avoid signature ambiguity.
-- =====================================================================
DROP FUNCTION IF EXISTS public.convert_application_atomic(
  uuid, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
  varchar, varchar, char, date, varchar, varchar, varchar, date, numeric, numeric, varchar,
  varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
  varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar,
  date, varchar, date, varchar, varchar, varchar, varchar, varchar, date, varchar, varchar,
  varchar, date, date, varchar, varchar, varchar, varchar, varchar, text, text, varchar, uuid,
  jsonb, jsonb
);

CREATE OR REPLACE FUNCTION public.convert_application_atomic(
  p_unique_uuid            uuid,
  p_application_id         varchar,
  p_application_ref_number varchar,
  p_temp_ssn               varchar,
  p_name_prefix            varchar,
  p_firstname              varchar,
  p_middle_name            varchar,
  p_second_middle_name     varchar,
  p_surname                varchar,
  p_name_suffix            varchar,
  p_previous_name          varchar,
  p_alias                  varchar,
  p_sex                    char,
  p_dob                    date,
  p_birth_place            varchar,
  p_nationality            varchar,
  p_marital_status         varchar,
  p_date_married           date,
  p_heightfeet             numeric,
  p_heightinches           numeric,
  p_eyecolor               varchar,
  p_resident_addr1         varchar,
  p_resident_addr2         varchar,
  p_district               varchar,
  p_mail_addr1             varchar,
  p_mail_addr2             varchar,
  p_email_addr             varchar,
  p_phone                  varchar,
  p_phone_mobile           varchar,
  p_contact                varchar,
  p_contact_relation       varchar,
  p_contact_addr1          varchar,
  p_contact_addr2          varchar,
  p_contact_phone          varchar,
  p_contact_mobile         varchar,
  p_contact_email          varchar,
  p_father_name            varchar,
  p_mother_name            varchar,
  p_spouse_name            varchar,
  p_spouse_addr1           varchar,
  p_spouse_addr2           varchar,
  p_spouse_ssn             varchar,
  p_spouse_dob             date,
  p_witness_name           varchar,
  p_date_witnessed         date,
  p_beneficiary            varchar,
  p_ben_addr1              varchar,
  p_ben_addr2              varchar,
  p_primary_occup          varchar,
  p_work_permit            varchar,
  p_work_permit_expiration date,
  p_npf                    varchar,
  p_citizenship_flag       varchar,
  p_ip_signature           varchar,
  p_application_date       date,
  p_date_of_residency      date,
  p_place_of_residence     varchar,
  p_employer_name          varchar,
  p_employer_address       varchar,
  p_employer_phone         varchar,
  p_employer_town          varchar,
  p_photo_location         text,
  p_remarks                text,
  p_entered_by             varchar,
  p_created_by             uuid,
  p_dependants             jsonb DEFAULT '[]'::jsonb,
  p_documents              jsonb DEFAULT '[]'::jsonb,
  p_doc_decisions          jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_master_id            UUID;
  v_submit_result        JSONB;
  v_final_ssn            VARCHAR(6);
  v_dep                  JSONB;
  v_dep_idx              INT := 0;
  v_depend_id            VARCHAR(6);
  v_dep_sex              CHAR(1);
  v_dep_relation         VARCHAR(3);
  v_dep_dob              DATE;
  v_dep_ssn              VARCHAR(6);
  v_dependants_added     INT := 0;
  v_doc                  JSONB;
  v_decision             JSONB;
  v_docs_added           INT := 0;
  v_master_docs_mirrored INT := 0;
  v_uploaded_at          TIMESTAMPTZ;
  v_record_name          TEXT;
  v_workflow_instance_id UUID;
  v_doc_count            INT;
BEGIN
  v_doc_count := COALESCE(jsonb_array_length(p_documents), 0);
  RAISE LOG '[convert_application_atomic] Received % document(s) for app_ref=%', v_doc_count, p_application_ref_number;

  IF NULLIF(TRIM(p_application_ref_number), '') IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: application_reference_number is required for conversion';
  END IF;

  IF EXISTS (SELECT 1 FROM ip_master WHERE application_id = p_application_id) THEN
    RAISE EXCEPTION 'DUPLICATE_APPLICATION: Application ID % has already been converted', p_application_id;
  END IF;

  INSERT INTO ip_master (
    unique_uuid, application_id, application_reference_number, temp_ssn, status,
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
    photo_location, application_remarks,
    entered_by, created_by, updated_by, created_at, updated_at
  ) VALUES (
    p_unique_uuid, p_application_id, TRIM(p_application_ref_number), p_temp_ssn, 'Z',
    p_name_prefix, p_firstname, p_middle_name, p_second_middle_name,
    p_surname, p_name_suffix, p_previous_name, p_alias,
    p_sex, p_dob, p_birth_place, p_nationality,
    p_marital_status, p_date_married,
    p_heightfeet, p_heightinches, p_eyecolor,
    p_resident_addr1, p_resident_addr2, p_district,
    p_mail_addr1, p_mail_addr2,
    p_email_addr, p_phone, p_phone_mobile, p_phone, p_phone_mobile,
    p_contact, p_contact_relation, p_contact_addr1, p_contact_addr2,
    p_contact_phone, p_contact_mobile, p_contact_email,
    p_father_name, p_mother_name,
    p_spouse_name, p_spouse_addr1, p_spouse_addr2, p_spouse_ssn, p_spouse_dob,
    p_witness_name, p_date_witnessed,
    p_beneficiary, p_ben_addr1, p_ben_addr2,
    p_primary_occup, p_work_permit, p_work_permit_expiration,
    p_npf, p_citizenship_flag, p_citizenship_flag,
    p_ip_signature, p_application_date, p_date_of_residency, p_place_of_residence,
    p_employer_name, p_employer_address, p_employer_phone, p_employer_town,
    p_photo_location, p_remarks,
    p_entered_by, p_created_by, p_created_by, NOW(), NOW()
  )
  RETURNING id, COALESCE(ssn, temp_ssn) INTO v_master_id, v_final_ssn;

  -- Submit (assigns permanent SSN if your existing flow does so)
  BEGIN
    v_submit_result := submit_ip_application(p_unique_uuid, p_created_by);
    IF v_submit_result IS NOT NULL AND (v_submit_result->>'ssn') IS NOT NULL THEN
      v_final_ssn := v_submit_result->>'ssn';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'SUBMIT_FAILED: %', SQLERRM;
  END;

  -- Dependants
  IF p_dependants IS NOT NULL AND jsonb_array_length(p_dependants) > 0 THEN
    FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants) LOOP
      v_dep_idx := v_dep_idx + 1;
      v_depend_id := lpad(v_dep_idx::text, 6, '0');
      v_dep_sex   := COALESCE(NULLIF(v_dep->>'gender',''), 'N');
      v_dep_relation := NULLIF(TRIM(v_dep->>'relationCode'), '');
      BEGIN v_dep_dob := (v_dep->>'dob')::DATE; EXCEPTION WHEN OTHERS THEN v_dep_dob := NULL; END;
      v_dep_ssn := NULLIF(TRIM(v_dep->>'depSsn'), '');

      BEGIN
        INSERT INTO ip_depend (
          ssn, depend_id, depend_ssn, surname, firstname, middle_name_dep,
          dob, sex, relation, depend_addr1, depend_addr2,
          school_child, invalid, status, userid, tran_code, date_modified
        ) VALUES (
          v_final_ssn, v_depend_id, v_dep_ssn,
          NULLIF(TRIM(v_dep->>'lastName'), ''),
          NULLIF(TRIM(v_dep->>'firstName'), ''),
          NULLIF(TRIM(v_dep->>'middleName'), ''),
          v_dep_dob, v_dep_sex, v_dep_relation,
          NULLIF(TRIM(v_dep->>'address'),  ''),
          NULLIF(TRIM(v_dep->>'address1'), ''),
          CASE WHEN COALESCE((v_dep->>'isInSchool')::BOOLEAN, FALSE) THEN 'Y' ELSE 'N' END,
          CASE WHEN COALESCE((v_dep->>'isInvalid')::BOOLEAN,  FALSE) THEN 'Y' ELSE 'N' END,
          'P',
          NULLIF(v_dep->>'userCode', ''),
          'ADD',
          NOW()
        );
        v_dependants_added := v_dependants_added + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'DEPENDANT_INSERT_FAILED: dep#% — %', v_dep_idx, SQLERRM;
      END;
    END LOOP;
  END IF;

  -- Insert into ip_application_documents (staging/audit)
  IF p_documents IS NOT NULL AND jsonb_array_length(p_documents) > 0 THEN
    RAISE LOG '[convert_application_atomic] Inserting % staging document(s) for SSN=% app_ref=%',
      jsonb_array_length(p_documents), v_final_ssn, p_application_ref_number;
    FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents) LOOP
      BEGIN v_uploaded_at := (v_doc->>'uploadedAt')::TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN v_uploaded_at := NOW(); END;
      BEGIN
        INSERT INTO ip_application_documents (
          ssn, application_reference_number, document_name, document_type, file_name, file_path, url, signed_url,
          mime_type, file_size, uploaded_at, source_document_id, verification_type, verification_category,
          is_supportive, supportive_doc_type, metadata, created_by, version, is_active
        )
        VALUES (
          v_final_ssn,
          NULLIF(TRIM(p_application_ref_number), ''),
          NULLIF(TRIM(COALESCE(v_doc->>'name', v_doc->>'fileName','')),''),
          NULLIF(TRIM(COALESCE(v_doc->>'documentType', v_doc->>'type','')),''),
          NULLIF(TRIM(COALESCE(v_doc->>'fileName', v_doc->>'name','')),''),
          NULLIF(TRIM(v_doc->>'filePath'),''),
          NULLIF(TRIM(v_doc->>'url'),''),
          NULLIF(TRIM(v_doc->>'signedUrl'),''),
          NULLIF(TRIM(v_doc->>'mimeType'),''),
          CASE WHEN v_doc->>'fileSize' IS NOT NULL AND v_doc->>'fileSize' ~ '^\d+$' THEN (v_doc->>'fileSize')::BIGINT ELSE NULL END,
          v_uploaded_at,
          NULLIF(TRIM(v_doc->>'id'),''),
          NULLIF(TRIM(COALESCE(v_doc->>'verificationType', v_doc->>'verification_type','')),''),
          NULLIF(TRIM(COALESCE(v_doc->>'verificationType', v_doc->>'verification_type','')),''),
          COALESCE((v_doc->>'isSupportive')::BOOLEAN, FALSE),
          NULLIF(TRIM(COALESCE(v_doc->>'supportiveDocType','')),''),
          CASE WHEN v_doc ? 'metadata' THEN v_doc->'metadata' ELSE NULL END,
          p_created_by,
          1, TRUE
        );
        v_docs_added := v_docs_added + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'DOCUMENT_INSERT_FAILED: Failed to insert document "%" — %',
          COALESCE(v_doc->>'name', v_doc->>'fileName', 'unknown'), SQLERRM;
      END;
    END LOOP;
    RAISE LOG '[convert_application_atomic] Successfully inserted % staging document(s)', v_docs_added;
  END IF;

  -- Inline mirror to ip_documents (master) — same transaction
  BEGIN
    INSERT INTO ip_documents (
      unique_uuid, ssn, document_type, document_name, doc_code,
      file_name, file_path, mime_type, file_size, uploaded_at, uploaded_by,
      verification_type, verification_category, is_supportive, supportive_doc_type,
      source_document_id, application_reference_number, is_active, transfer_status, metadata
    )
    SELECT
      p_unique_uuid,
      iad.ssn,
      iad.document_type,
      iad.document_name,
      COALESCE(
        iad.metadata->>'doc_code',
        CASE WHEN iad.document_type IS NOT NULL AND char_length(iad.document_type) = 1
             THEN upper(iad.document_type) ELSE NULL END
      ),
      iad.file_name,
      iad.file_path,
      iad.mime_type,
      iad.file_size,
      iad.uploaded_at,
      p_created_by,
      iad.verification_type,
      iad.verification_category,
      COALESCE(iad.is_supportive, FALSE)
        OR COALESCE(iad.verification_category,'') = 'supportive'
        OR iad.supportive_doc_type IS NOT NULL,
      iad.supportive_doc_type,
      iad.source_document_id,
      iad.application_reference_number,
      TRUE,
      'Pending',
      iad.metadata
    FROM ip_application_documents iad
    WHERE iad.application_reference_number = TRIM(p_application_ref_number)
      AND COALESCE(iad.is_active, TRUE) = TRUE
      AND COALESCE(iad.is_deleted, FALSE) = FALSE
      AND COALESCE(iad.file_path, iad.url, '') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM ip_documents d
         WHERE d.unique_uuid = p_unique_uuid
           AND COALESCE(d.source_document_id, '') = COALESCE(iad.source_document_id, '')
           AND COALESCE(d.file_path, '') = COALESCE(iad.file_path, '')
      );

    GET DIAGNOSTICS v_master_docs_mirrored = ROW_COUNT;
    RAISE LOG '[convert_application_atomic] Mirrored % doc(s) into ip_documents for SSN=%', v_master_docs_mirrored, v_final_ssn;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'MASTER_DOC_MIRROR_FAILED: %', SQLERRM;
  END;

  -- Persist merge audit decisions (one row per decision)
  IF p_doc_decisions IS NOT NULL AND jsonb_array_length(p_doc_decisions) > 0 THEN
    BEGIN
      FOR v_decision IN SELECT * FROM jsonb_array_elements(p_doc_decisions) LOOP
        INSERT INTO ip_application_doc_merge_audit (
          application_reference_number, ssn, unique_uuid, source_document_id,
          decision, before_snapshot, after_snapshot, created_by
        ) VALUES (
          TRIM(p_application_ref_number),
          v_final_ssn,
          p_unique_uuid,
          NULLIF(TRIM(v_decision->>'source_document_id'), ''),
          v_decision->>'decision',
          v_decision->'before_snapshot',
          v_decision->'after_snapshot',
          p_created_by
        );
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[convert_application_atomic] Merge audit write failed (non-blocking): %', SQLERRM;
    END;
  END IF;

  -- Workflow
  v_record_name := TRIM(COALESCE(p_firstname, '') || ' ' || COALESCE(p_surname, ''));
  v_workflow_instance_id := initiate_ip_registration_workflow(
    p_unique_uuid,
    v_final_ssn,
    v_record_name,
    p_created_by,
    COALESCE(p_entered_by, 'SYSTEM'),
    'online_application_conversion'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'ssn', v_final_ssn,
    'ip_master_id', v_master_id,
    'unique_uuid', p_unique_uuid,
    'dependants_added', v_dependants_added,
    'documents_added', v_docs_added,
    'master_documents_mirrored', v_master_docs_mirrored,
    'application_reference_number', TRIM(p_application_ref_number),
    'workflow_instance_id', v_workflow_instance_id,
    'message', 'IP Registration created successfully. SSN: ' || v_final_ssn ||
      CASE WHEN v_dependants_added > 0 THEN ' (' || v_dependants_added || ' dependant(s) linked)' ELSE '' END ||
      CASE WHEN v_docs_added > 0 THEN ' (' || v_docs_added || ' document(s) saved, ' || v_master_docs_mirrored || ' mirrored to master)' ELSE '' END ||
      CASE WHEN v_workflow_instance_id IS NOT NULL THEN ' [Workflow initiated]' ELSE '' END
  );
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;
