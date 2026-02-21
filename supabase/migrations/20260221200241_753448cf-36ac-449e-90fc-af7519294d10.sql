
-- ============================================================
-- 1. Create ip_application_documents table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ip_application_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ssn VARCHAR(6) NOT NULL,
  document_name VARCHAR(255),
  document_type VARCHAR(100),
  file_name VARCHAR(255),
  file_path TEXT,
  url TEXT,
  signed_url TEXT,
  mime_type VARCHAR(100),
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ,
  source_document_id VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT fk_ip_application_documents_ssn
    FOREIGN KEY (ssn) REFERENCES ip_master(ssn)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ip_application_documents_ssn ON public.ip_application_documents(ssn);

ALTER TABLE public.ip_application_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ip_application_documents' AND policyname='Authenticated users can view ip_application_documents') THEN
    CREATE POLICY "Authenticated users can view ip_application_documents"
      ON public.ip_application_documents FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ip_application_documents' AND policyname='Authenticated users can insert ip_application_documents') THEN
    CREATE POLICY "Authenticated users can insert ip_application_documents"
      ON public.ip_application_documents FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 2. Drop ALL overloads of convert_application_atomic, then recreate
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'convert_application_atomic'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- Recreate with correct signature
CREATE FUNCTION public.convert_application_atomic(
  p_unique_uuid           UUID,
  p_application_id        VARCHAR(20),
  p_temp_ssn              VARCHAR(6),
  p_name_prefix           VARCHAR(6),
  p_firstname             VARCHAR(25),
  p_middle_name           VARCHAR(25),
  p_second_middle_name    VARCHAR(25),
  p_surname               VARCHAR(25),
  p_name_suffix           VARCHAR(6),
  p_previous_name         VARCHAR(25),
  p_alias                 VARCHAR(25),
  p_sex                   CHAR(1),
  p_dob                   DATE,
  p_birth_place           VARCHAR(3),
  p_nationality           VARCHAR(3),
  p_marital_status        VARCHAR(20),
  p_date_married          DATE,
  p_heightfeet            SMALLINT,
  p_heightinches          SMALLINT,
  p_eyecolor              VARCHAR(10),
  p_resident_addr1        VARCHAR(50),
  p_resident_addr2        VARCHAR(50),
  p_district              VARCHAR(3),
  p_mail_addr1            VARCHAR(50),
  p_mail_addr2            VARCHAR(50),
  p_email_addr            VARCHAR(40),
  p_phone                 VARCHAR(15),
  p_phone_mobile          VARCHAR(15),
  p_contact               VARCHAR(35),
  p_contact_relation      VARCHAR(20),
  p_contact_addr1         VARCHAR(50),
  p_contact_addr2         VARCHAR(50),
  p_contact_phone         VARCHAR(10),
  p_contact_mobile        VARCHAR(10),
  p_contact_email         VARCHAR(40),
  p_father_name           VARCHAR(35),
  p_mother_name           VARCHAR(35),
  p_spouse_name           VARCHAR(35),
  p_spouse_addr1          VARCHAR(50),
  p_spouse_addr2          VARCHAR(50),
  p_spouse_ssn            VARCHAR(6),
  p_spouse_dob            DATE,
  p_witness_name          VARCHAR(35),
  p_date_witnessed        DATE,
  p_beneficiary           VARCHAR(35),
  p_ben_addr1             VARCHAR(50),
  p_ben_addr2             VARCHAR(50),
  p_primary_occup         VARCHAR(4),
  p_work_permit           CHAR(1),
  p_work_permit_expiration DATE,
  p_npf                   CHAR(1),
  p_citizenship_flag      CHAR(1),
  p_application_date      DATE,
  p_date_of_residency     DATE,
  p_place_of_residence    VARCHAR(30),
  p_employer_name         VARCHAR(50),
  p_employer_address      VARCHAR(200),
  p_employer_phone        VARCHAR(10),
  p_employer_town         VARCHAR(50),
  p_entered_by            VARCHAR(5),
  p_created_by            UUID,
  p_photo_location        VARCHAR(255),
  p_remarks               TEXT,
  p_application_ref_number VARCHAR(50) DEFAULT NULL,
  p_dependants            JSONB DEFAULT '[]'::JSONB,
  p_documents             JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_id             UUID;
  v_final_ssn             VARCHAR(6);
  v_submit_result         JSONB;
  v_dep                   JSONB;
  v_depend_id             VARCHAR(6);
  v_dep_idx               INTEGER := 0;
  v_dependants_added      INTEGER := 0;
  v_dep_relation          VARCHAR(3);
  v_dep_sex               CHAR(1);
  v_dep_dob               DATE;
  v_dep_ssn               VARCHAR(6);
  v_doc                   JSONB;
  v_docs_added            INTEGER := 0;
  v_uploaded_at           TIMESTAMPTZ;
BEGIN
  IF p_application_ref_number IS NULL OR TRIM(p_application_ref_number) = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: application_reference_number (applicationId) is required and cannot be null or empty';
  END IF;

  INSERT INTO ip_master (
    unique_uuid, application_id, application_reference_number, ssn, status,
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
    NULLIF(p_name_prefix,''), p_firstname, NULLIF(p_middle_name,''), NULLIF(p_second_middle_name,''),
    p_surname, NULLIF(p_name_suffix,''), NULLIF(p_previous_name,''), NULLIF(p_alias,''),
    p_sex, p_dob, NULLIF(p_birth_place,''), p_nationality,
    p_marital_status, p_date_married,
    p_heightfeet, p_heightinches, NULLIF(p_eyecolor,''),
    NULLIF(p_resident_addr1,''), NULLIF(p_resident_addr2,''), NULLIF(p_district,''),
    NULLIF(p_mail_addr1,''), NULLIF(p_mail_addr2,''),
    NULLIF(p_email_addr,''), NULLIF(p_phone,''), NULLIF(p_phone_mobile,''), NULLIF(p_phone,''), NULLIF(p_phone_mobile,''),
    NULLIF(p_contact,''), NULLIF(p_contact_relation,''), NULLIF(p_contact_addr1,''), NULLIF(p_contact_addr2,''),
    NULLIF(p_contact_phone,''), NULLIF(p_contact_mobile,''), NULLIF(p_contact_email,''),
    NULLIF(p_father_name,''), NULLIF(p_mother_name,''),
    NULLIF(p_spouse_name,''), NULLIF(p_spouse_addr1,''), NULLIF(p_spouse_addr2,''), NULLIF(p_spouse_ssn,''), p_spouse_dob,
    NULLIF(p_witness_name,''), p_date_witnessed,
    NULLIF(p_beneficiary,''), NULLIF(p_ben_addr1,''), NULLIF(p_ben_addr2,''),
    NULLIF(p_primary_occup,''), COALESCE(p_work_permit,'N'), p_work_permit_expiration,
    COALESCE(p_npf,'N'), COALESCE(p_citizenship_flag,'N'), COALESCE(p_citizenship_flag,'N'),
    'N', COALESCE(p_application_date, CURRENT_DATE), p_date_of_residency, NULLIF(p_place_of_residence,''),
    NULLIF(p_employer_name,''), NULLIF(p_employer_address,''), NULLIF(p_employer_phone,''), NULLIF(p_employer_town,''),
    NULLIF(p_photo_location,''), NULLIF(LEFT(TRIM(COALESCE(p_remarks,'')),250),''),
    p_entered_by, p_created_by, p_created_by, NOW(), NOW()
  ) RETURNING id INTO v_master_id;

  IF v_master_id IS NULL THEN
    RAISE EXCEPTION 'INSERT_FAILED: ip_master insert returned no ID';
  END IF;

  SELECT submit_ip_registration(p_unique_uuid) INTO v_submit_result;
  IF v_submit_result IS NULL OR NOT (v_submit_result->>'success')::BOOLEAN THEN
    RAISE EXCEPTION 'SUBMIT_FAILED: %', COALESCE(v_submit_result->>'message', 'submit_ip_registration returned failure');
  END IF;

  v_final_ssn := v_submit_result->>'ssn';
  IF v_final_ssn IS NULL OR LENGTH(v_final_ssn) = 0 THEN
    RAISE EXCEPTION 'SUBMIT_FAILED: submit_ip_registration succeeded but returned no SSN';
  END IF;

  FOR v_dep IN SELECT * FROM jsonb_array_elements(p_dependants)
  LOOP
    v_dep_idx := v_dep_idx + 1;
    IF NULLIF(TRIM(v_dep->>'firstName'),'') IS NULL AND NULLIF(TRIM(v_dep->>'lastName'),'') IS NULL THEN CONTINUE; END IF;
    SELECT generate_depend_id(v_final_ssn) INTO v_depend_id;
    v_depend_id := COALESCE(v_depend_id, LPAD(v_dep_idx::TEXT, 6, '0'));
    v_dep_sex := CASE WHEN UPPER(v_dep->>'gender') IN ('M','MALE') THEN 'M' WHEN UPPER(v_dep->>'gender') IN ('F','FEMALE') THEN 'F' ELSE 'N' END;
    v_dep_relation := NULL;
    IF v_dep->>'relationCode' IS NOT NULL AND LENGTH(TRIM(v_dep->>'relationCode')) > 0 THEN
      SELECT code INTO v_dep_relation FROM tb_relation WHERE UPPER(code) = UPPER(TRIM(LEFT(v_dep->>'relationCode', 3))) LIMIT 1;
    END IF;
    BEGIN v_dep_dob := (v_dep->>'dob')::DATE; EXCEPTION WHEN OTHERS THEN v_dep_dob := NULL; END;
    v_dep_ssn := NULLIF(TRIM(LEFT(COALESCE(v_dep->>'depSsn',''),6)),'');
    INSERT INTO ip_depend (ssn, depend_id, depend_ssn, surname, firstname, middle_name, dob, sex, relation, depend_addr1, depend_addr2, school_child, invalid, status, userid, tran_code, date_modified)
    VALUES (v_final_ssn, v_depend_id, v_dep_ssn,
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'lastName',''),25)),''), NULLIF(TRIM(LEFT(COALESCE(v_dep->>'firstName',''),25)),''), NULLIF(TRIM(LEFT(COALESCE(v_dep->>'middleName',''),25)),''),
      v_dep_dob, v_dep_sex, v_dep_relation,
      NULLIF(TRIM(LEFT(COALESCE(v_dep->>'address',''),50)),''), NULLIF(TRIM(LEFT(COALESCE(v_dep->>'address1',''),50)),''),
      CASE WHEN (v_dep->>'isInSchool')::BOOLEAN THEN 'Y' ELSE 'N' END, CASE WHEN (v_dep->>'isInvalid')::BOOLEAN THEN 'Y' ELSE 'N' END,
      'P', NULLIF(LEFT(COALESCE(v_dep->>'userCode', p_entered_by,''),5),''), 'ADD', NOW());
    v_dependants_added := v_dependants_added + 1;
  END LOOP;

  IF p_documents IS NOT NULL AND jsonb_array_length(p_documents) > 0 THEN
    FOR v_doc IN SELECT * FROM jsonb_array_elements(p_documents) LOOP
      BEGIN v_uploaded_at := (v_doc->>'uploadedAt')::TIMESTAMPTZ; EXCEPTION WHEN OTHERS THEN v_uploaded_at := NOW(); END;
      INSERT INTO ip_application_documents (ssn, document_name, document_type, file_name, file_path, url, signed_url, mime_type, file_size, uploaded_at, source_document_id, metadata, created_by)
      VALUES (v_final_ssn,
        NULLIF(TRIM(COALESCE(v_doc->>'name', v_doc->>'fileName','')),''),
        NULLIF(TRIM(COALESCE(v_doc->>'documentType', v_doc->>'type','')),''),
        NULLIF(TRIM(COALESCE(v_doc->>'fileName', v_doc->>'name','')),''),
        NULLIF(TRIM(v_doc->>'filePath'),''), NULLIF(TRIM(v_doc->>'url'),''), NULLIF(TRIM(v_doc->>'signedUrl'),''),
        NULLIF(TRIM(v_doc->>'mimeType'),''),
        CASE WHEN v_doc->>'fileSize' IS NOT NULL AND v_doc->>'fileSize' ~ '^\d+$' THEN (v_doc->>'fileSize')::BIGINT ELSE NULL END,
        v_uploaded_at, NULLIF(TRIM(v_doc->>'id'),''),
        CASE WHEN v_doc ? 'metadata' THEN v_doc->'metadata' ELSE NULL END, p_created_by);
      v_docs_added := v_docs_added + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE, 'ssn', v_final_ssn, 'ip_master_id', v_master_id, 'unique_uuid', p_unique_uuid,
    'dependants_added', v_dependants_added, 'documents_added', v_docs_added,
    'application_reference_number', TRIM(p_application_ref_number),
    'message', 'IP Registration created successfully. SSN: ' || v_final_ssn ||
      CASE WHEN v_dependants_added > 0 THEN ' (' || v_dependants_added || ' dependant(s) linked)' ELSE '' END ||
      CASE WHEN v_docs_added > 0 THEN ' (' || v_docs_added || ' document(s) saved)' ELSE '' END
  );
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '%', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_application_atomic TO authenticated, anon;
