
-- =====================================================================
-- PHASE 1: IP_MASTER COLUMN CONSOLIDATION MIGRATION
-- Removes duplicate columns after migrating data to canonical columns
-- =====================================================================

-- STEP 1: Create conflict audit table
CREATE TABLE IF NOT EXISTS public.ip_master_column_conflicts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_master_id UUID NOT NULL,
  duplicate_column_name TEXT NOT NULL,
  canonical_column_name TEXT NOT NULL,
  duplicate_value TEXT,
  canonical_value TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ip_master_column_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view conflicts" ON public.ip_master_column_conflicts FOR SELECT USING (true);

-- STEP 2: Create migration log table
CREATE TABLE IF NOT EXISTS public.schema_migration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_name TEXT NOT NULL,
  column_pair TEXT NOT NULL,
  rows_migrated INTEGER NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schema_migration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view migration logs" ON public.schema_migration_logs FOR SELECT USING (true);

-- STEP 3: Log detected conflicts (height_feet=6 vs heightfeet=0, height_inches=2 vs heightinches=0 for row 2ffe5207)
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'height_feet', 'heightfeet', height_feet::text, heightfeet::text
FROM ip_master WHERE height_feet IS NOT NULL AND heightfeet IS NOT NULL AND height_feet != heightfeet;

INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'height_inches', 'heightinches', height_inches::text, heightinches::text
FROM ip_master WHERE height_inches IS NOT NULL AND heightinches IS NOT NULL AND height_inches != heightinches;

-- Log any other potential conflicts across all pairs
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'last_name', 'surname', last_name, surname FROM ip_master WHERE last_name IS NOT NULL AND surname IS NOT NULL AND last_name != surname;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'first_name', 'firstname', first_name, firstname FROM ip_master WHERE first_name IS NOT NULL AND firstname IS NOT NULL AND first_name != firstname;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'gender', 'sex', gender, sex FROM ip_master WHERE gender IS NOT NULL AND sex IS NOT NULL AND gender != sex;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'date_of_birth', 'dob', date_of_birth::text, dob::text FROM ip_master WHERE date_of_birth IS NOT NULL AND dob IS NOT NULL AND date_of_birth != dob;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'maiden_name', 'previous_name', maiden_name, previous_name FROM ip_master WHERE maiden_name IS NOT NULL AND previous_name IS NOT NULL AND maiden_name != previous_name;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'resident_address_1', 'resident_addr1', resident_address_1, resident_addr1 FROM ip_master WHERE resident_address_1 IS NOT NULL AND resident_addr1 IS NOT NULL AND resident_address_1 != resident_addr1;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'resident_address_2', 'resident_addr2', resident_address_2, resident_addr2 FROM ip_master WHERE resident_address_2 IS NOT NULL AND resident_addr2 IS NOT NULL AND resident_address_2 != resident_addr2;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'postal_district', 'district', postal_district, district FROM ip_master WHERE postal_district IS NOT NULL AND district IS NOT NULL AND postal_district != district;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'email', 'email_addr', email, email_addr FROM ip_master WHERE email IS NOT NULL AND email_addr IS NOT NULL AND email != email_addr;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'title', 'name_prefix', title, name_prefix FROM ip_master WHERE title IS NOT NULL AND name_prefix IS NOT NULL AND title != name_prefix;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'suffix', 'name_suffix', suffix, name_suffix FROM ip_master WHERE suffix IS NOT NULL AND name_suffix IS NOT NULL AND suffix != name_suffix;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'birth_place_code', 'birth_place', birth_place_code, birth_place FROM ip_master WHERE birth_place_code IS NOT NULL AND birth_place IS NOT NULL AND birth_place_code != birth_place;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'nationality_code', 'nationality', nationality_code, nationality FROM ip_master WHERE nationality_code IS NOT NULL AND nationality IS NOT NULL AND nationality_code != nationality;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'place_of_residence_code', 'place_of_residence', place_of_residence_code, place_of_residence FROM ip_master WHERE place_of_residence_code IS NOT NULL AND place_of_residence IS NOT NULL AND place_of_residence_code != place_of_residence;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'eye_color', 'eyecolor', eye_color, eyecolor FROM ip_master WHERE eye_color IS NOT NULL AND eyecolor IS NOT NULL AND eye_color != eyecolor;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'date_resident', 'date_of_residency', date_resident::text, date_of_residency::text FROM ip_master WHERE date_resident IS NOT NULL AND date_of_residency IS NOT NULL AND date_resident != date_of_residency;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'work_permit_status', 'work_permit', work_permit_status, work_permit FROM ip_master WHERE work_permit_status IS NOT NULL AND work_permit IS NOT NULL AND work_permit_status != work_permit;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'occupation', 'primary_occup', occupation, primary_occup FROM ip_master WHERE occupation IS NOT NULL AND primary_occup IS NOT NULL AND occupation != primary_occup;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'npf_status', 'npf', npf_status, npf FROM ip_master WHERE npf_status IS NOT NULL AND npf IS NOT NULL AND npf_status != npf;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'signature_on_file', 'ip_signature', signature_on_file, ip_signature FROM ip_master WHERE signature_on_file IS NOT NULL AND ip_signature IS NOT NULL AND signature_on_file != ip_signature;
INSERT INTO public.ip_master_column_conflicts (ip_master_id, duplicate_column_name, canonical_column_name, duplicate_value, canonical_value)
SELECT id, 'work_permit_expiry', 'work_permit_expiration', work_permit_expiry::text, work_permit_expiration::text FROM ip_master WHERE work_permit_expiry IS NOT NULL AND work_permit_expiration IS NOT NULL AND work_permit_expiry != work_permit_expiration;

-- STEP 4: Data migration — copy duplicate value into canonical where canonical is NULL
-- For conflicts: use duplicate value (more recent/complete data) since canonical was 0/default

-- surname (from last_name)
UPDATE ip_master SET surname = last_name WHERE surname IS NULL AND last_name IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'last_name → surname', COUNT(*) FROM ip_master WHERE surname IS NOT NULL AND last_name IS NOT NULL AND surname = last_name;

-- firstname (from first_name)
UPDATE ip_master SET firstname = first_name WHERE firstname IS NULL AND first_name IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'first_name → firstname', COUNT(*) FROM ip_master WHERE firstname IS NOT NULL AND first_name IS NOT NULL AND firstname = first_name;

-- sex (from gender)
UPDATE ip_master SET sex = gender WHERE sex IS NULL AND gender IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'gender → sex', COUNT(*) FROM ip_master WHERE sex IS NOT NULL;

-- dob (from date_of_birth)
UPDATE ip_master SET dob = date_of_birth WHERE dob IS NULL AND date_of_birth IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'date_of_birth → dob', COUNT(*) FROM ip_master WHERE dob IS NOT NULL;

-- previous_name (from maiden_name)
UPDATE ip_master SET previous_name = maiden_name WHERE previous_name IS NULL AND maiden_name IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'maiden_name → previous_name', COUNT(*) FROM ip_master WHERE previous_name IS NOT NULL AND maiden_name IS NOT NULL;

-- resident_addr1 (from resident_address_1)
UPDATE ip_master SET resident_addr1 = resident_address_1 WHERE resident_addr1 IS NULL AND resident_address_1 IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'resident_address_1 → resident_addr1', COUNT(*) FROM ip_master WHERE resident_addr1 IS NOT NULL AND resident_address_1 IS NOT NULL;

-- resident_addr2 (from resident_address_2)
UPDATE ip_master SET resident_addr2 = resident_address_2 WHERE resident_addr2 IS NULL AND resident_address_2 IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'resident_address_2 → resident_addr2', COUNT(*) FROM ip_master WHERE resident_addr2 IS NOT NULL AND resident_address_2 IS NOT NULL;

-- district (from postal_district)
UPDATE ip_master SET district = postal_district WHERE district IS NULL AND postal_district IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'postal_district → district', COUNT(*) FROM ip_master WHERE district IS NOT NULL AND postal_district IS NOT NULL;

-- email_addr (from email)
UPDATE ip_master SET email_addr = email WHERE email_addr IS NULL AND email IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'email → email_addr', COUNT(*) FROM ip_master WHERE email_addr IS NOT NULL AND email IS NOT NULL;

-- name_prefix (from title)
UPDATE ip_master SET name_prefix = title WHERE name_prefix IS NULL AND title IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'title → name_prefix', COUNT(*) FROM ip_master WHERE name_prefix IS NOT NULL AND title IS NOT NULL;

-- name_suffix (from suffix)
UPDATE ip_master SET name_suffix = suffix WHERE name_suffix IS NULL AND suffix IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'suffix → name_suffix', COUNT(*) FROM ip_master WHERE name_suffix IS NOT NULL AND suffix IS NOT NULL;

-- birth_place (from birth_place_code — no rows needed since birth_place already has data)
UPDATE ip_master SET birth_place = birth_place_code WHERE birth_place IS NULL AND birth_place_code IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'birth_place_code → birth_place', COUNT(*) FROM ip_master WHERE birth_place IS NOT NULL AND birth_place_code IS NOT NULL;

-- nationality (from nationality_code)
UPDATE ip_master SET nationality = nationality_code WHERE nationality IS NULL AND nationality_code IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'nationality_code → nationality', COUNT(*) FROM ip_master WHERE nationality IS NOT NULL AND nationality_code IS NOT NULL;

-- place_of_residence (from place_of_residence_code)
UPDATE ip_master SET place_of_residence = place_of_residence_code WHERE place_of_residence IS NULL AND place_of_residence_code IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'place_of_residence_code → place_of_residence', COUNT(*) FROM ip_master WHERE place_of_residence IS NOT NULL AND place_of_residence_code IS NOT NULL;

-- eyecolor (from eye_color)
UPDATE ip_master SET eyecolor = eye_color WHERE eyecolor IS NULL AND eye_color IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'eye_color → eyecolor', COUNT(*) FROM ip_master WHERE eyecolor IS NOT NULL AND eye_color IS NOT NULL;

-- heightfeet (from height_feet) — for conflicts, prefer duplicate value
UPDATE ip_master SET heightfeet = height_feet WHERE (heightfeet IS NULL OR heightfeet = 0) AND height_feet IS NOT NULL AND height_feet != 0;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'height_feet → heightfeet', COUNT(*) FROM ip_master WHERE heightfeet IS NOT NULL AND height_feet IS NOT NULL;

-- heightinches (from height_inches) — for conflicts, prefer duplicate value
UPDATE ip_master SET heightinches = height_inches WHERE (heightinches IS NULL OR heightinches = 0) AND height_inches IS NOT NULL AND height_inches != 0;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'height_inches → heightinches', COUNT(*) FROM ip_master WHERE heightinches IS NOT NULL AND height_inches IS NOT NULL;

-- date_of_residency (from date_resident)
UPDATE ip_master SET date_of_residency = date_resident WHERE date_of_residency IS NULL AND date_resident IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'date_resident → date_of_residency', COUNT(*) FROM ip_master WHERE date_of_residency IS NOT NULL AND date_resident IS NOT NULL;

-- work_permit (from work_permit_status)
UPDATE ip_master SET work_permit = work_permit_status WHERE work_permit IS NULL AND work_permit_status IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'work_permit_status → work_permit', COUNT(*) FROM ip_master WHERE work_permit IS NOT NULL AND work_permit_status IS NOT NULL;

-- primary_occup (from occupation)
UPDATE ip_master SET primary_occup = occupation WHERE primary_occup IS NULL AND occupation IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'occupation → primary_occup', COUNT(*) FROM ip_master WHERE primary_occup IS NOT NULL AND occupation IS NOT NULL;

-- npf (from npf_status)
UPDATE ip_master SET npf = npf_status WHERE npf IS NULL AND npf_status IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'npf_status → npf', COUNT(*) FROM ip_master WHERE npf IS NOT NULL AND npf_status IS NOT NULL;

-- ip_signature (from signature_on_file)
UPDATE ip_master SET ip_signature = signature_on_file WHERE ip_signature IS NULL AND signature_on_file IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'signature_on_file → ip_signature', COUNT(*) FROM ip_master WHERE ip_signature IS NOT NULL AND signature_on_file IS NOT NULL;

-- work_permit_expiration (from work_permit_expiry)
UPDATE ip_master SET work_permit_expiration = work_permit_expiry WHERE work_permit_expiration IS NULL AND work_permit_expiry IS NOT NULL;
INSERT INTO schema_migration_logs (migration_name, column_pair, rows_migrated)
SELECT 'ip_master_column_consolidation', 'work_permit_expiry → work_permit_expiration', COUNT(*) FROM ip_master WHERE work_permit_expiration IS NOT NULL AND work_permit_expiry IS NOT NULL;

-- STEP 5: Transfer NOT NULL constraints to canonical columns
-- first_name (NOT NULL) → firstname (currently nullable)
ALTER TABLE ip_master ALTER COLUMN surname SET NOT NULL;
ALTER TABLE ip_master ALTER COLUMN firstname SET NOT NULL;
ALTER TABLE ip_master ALTER COLUMN sex SET NOT NULL;
ALTER TABLE ip_master ALTER COLUMN dob SET NOT NULL;
-- nationality is already NOT NULL

-- STEP 6: Update DB functions that reference duplicate columns

-- 6a: check_sep_eligibility
CREATE OR REPLACE FUNCTION public.check_sep_eligibility(p_ssn character varying)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip_exists boolean;
    v_self_ref_no varchar(6);
    v_ip_status text;
    v_ip_name text;
BEGIN
    SELECT EXISTS(SELECT 1 FROM ip_master WHERE ssn = p_ssn) INTO v_ip_exists;
    
    IF NOT v_ip_exists THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'SSN does not exist in ip_master', 'ip_exists', false, 'sep_exists', false, 'self_ref_no', null, 'ip_status', null, 'ip_name', null);
    END IF;

    SELECT status, COALESCE(firstname || ' ' || COALESCE(surname, ''), firstname) INTO v_ip_status, v_ip_name
    FROM ip_master WHERE ssn = p_ssn;

    SELECT self_ref_no INTO v_self_ref_no FROM ip_self_employ WHERE ssn = p_ssn LIMIT 1;

    IF v_ip_status IN ('S', 'C') THEN
        RETURN jsonb_build_object('eligible', false, 'reason', 'IP status does not allow SEP registration', 'ip_exists', true, 'sep_exists', v_self_ref_no IS NOT NULL, 'self_ref_no', v_self_ref_no, 'ip_status', v_ip_status, 'ip_name', v_ip_name);
    END IF;

    RETURN jsonb_build_object(
        'eligible', v_self_ref_no IS NULL,
        'reason', CASE WHEN v_self_ref_no IS NOT NULL THEN 'Already registered as self-employed' ELSE 'Eligible' END,
        'ip_exists', true, 'sep_exists', v_self_ref_no IS NOT NULL,
        'self_ref_no', v_self_ref_no, 'ip_status', v_ip_status, 'ip_name', v_ip_name
    );
END;
$$;

-- 6b: check_vc_eligibility
CREATE OR REPLACE FUNCTION public.check_vc_eligibility(p_ssn character varying)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip_record RECORD;
  v_age INTEGER;
  v_config RECORD;
  v_active_employment RECORD;
  v_last_employment_end DATE;
  v_last_self_emp_end DATE;
  v_termination_date DATE;
  v_weeks_since_termination INTEGER;
  v_today DATE := CURRENT_DATE;
  v_errors JSONB := '[]'::JSONB;
  v_is_eligible BOOLEAN := true;
  v_active_vc RECORD;
BEGIN
  SELECT * INTO v_config
  FROM public.tb_vc_eligibility_config
  WHERE is_active = true
    AND effstart <= v_today
    AND (effend IS NULL OR effend >= v_today)
  ORDER BY effstart DESC
  LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "NO_CONFIG", "message": "Voluntary contributor configuration not found"}]'::JSONB
    );
  END IF;

  SELECT * INTO v_ip_record
  FROM public.ip_master
  WHERE ssn = p_ssn;
  
  IF v_ip_record IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "SSN_NOT_FOUND", "message": "Insured person not found with the given SSN"}]'::JSONB
    );
  END IF;

  SELECT * INTO v_active_vc
  FROM public.ip_vol_contrib
  WHERE ssn = p_ssn AND date_ceased IS NULL;
  
  IF v_active_vc IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'errors', '[{"code": "ALREADY_VC", "message": "This person is already registered as an active voluntary contributor"}]'::JSONB
    );
  END IF;

  -- Check 1: Residency (canonical: place_of_residence)
  IF COALESCE(v_ip_record.place_of_residence, '') NOT IN ('STK', 'NEV') THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'INVALID_RESIDENCY',
      'message', 'Place of residence must be St. Kitts (STK) or Nevis (NEV). Current: ' || COALESCE(v_ip_record.place_of_residence, 'Not Set')
    ));
  END IF;

  -- Check 2: Age (canonical: dob)
  v_age := EXTRACT(YEAR FROM AGE(v_today, v_ip_record.dob));
  
  IF v_age IS NULL THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'NO_DOB',
      'message', 'Date of birth is required to verify age eligibility'
    ));
  ELSIF v_age < v_config.min_age OR v_age > v_config.max_age THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'AGE_OUT_OF_RANGE',
      'message', format('Age must be between %s and %s years. Current age: %s', v_config.min_age, v_config.max_age, v_age)
    ));
  END IF;

  SELECT * INTO v_active_employment
  FROM public.ip_employer
  WHERE ssn = p_ssn 
    AND term_end_date IS NULL
    AND posting_status = 'VAC'
  LIMIT 1;
  
  IF v_active_employment IS NOT NULL THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ACTIVELY_EMPLOYED',
      'message', 'Cannot register as voluntary contributor while actively employed. Current employer: ' || v_active_employment.employer_id
    ));
  END IF;

  IF COALESCE(v_ip_record.asp_num, 'N') = 'Y' THEN
    v_is_eligible := false;
    v_errors := v_errors || jsonb_build_array(jsonb_build_object(
      'code', 'ASSISTANCE_PENSIONER',
      'message', 'Assistance pensioners are not eligible for voluntary contribution'
    ));
  END IF;

  IF v_active_employment IS NULL THEN
    SELECT MAX(term_end_date) INTO v_last_employment_end
    FROM public.ip_employer
    WHERE ssn = p_ssn 
      AND term_end_date IS NOT NULL
      AND posting_status = 'VAC';
    
    SELECT MAX(effective_end_date::DATE) INTO v_last_self_emp_end
    FROM public.ip_self_category
    WHERE ssn = p_ssn 
      AND effective_end_date IS NOT NULL;
    
    v_termination_date := GREATEST(COALESCE(v_last_employment_end, '1900-01-01'::DATE), COALESCE(v_last_self_emp_end, '1900-01-01'::DATE));
    
    IF v_termination_date > '1900-01-01'::DATE THEN
      v_weeks_since_termination := FLOOR((v_today - v_termination_date)::INTEGER / 7)::INTEGER;
      
      IF v_weeks_since_termination > v_config.termination_grace_weeks THEN
        v_is_eligible := false;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'code', 'GRACE_PERIOD_EXPIRED',
          'message', format('Registration must occur within %s weeks of employment termination. Last termination: %s (%s weeks ago)', 
            v_config.termination_grace_weeks, v_termination_date::TEXT, v_weeks_since_termination)
        ));
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_is_eligible,
    'errors', v_errors,
    'ip_details', jsonb_build_object(
      'ssn', p_ssn,
      'name', v_ip_record.surname || ', ' || v_ip_record.firstname,
      'dob', v_ip_record.dob,
      'age', v_age,
      'place_of_residence', v_ip_record.place_of_residence,
      'vol_contrib', v_ip_record.vol_contrib
    ),
    'config', jsonb_build_object(
      'min_age', v_config.min_age,
      'max_age', v_config.max_age,
      'contrib_pct', v_config.vc_contrib_pct,
      'termination_grace_weeks', v_config.termination_grace_weeks,
      'wage_history_months', v_config.wage_history_months
    )
  );
END;
$$;

-- 6c: process_c3_employer_verification (trigger) — use primary_occup only
CREATE OR REPLACE FUNCTION public.process_c3_employer_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wage_record RECORD;
  v_latest_employer RECORD;
  v_current_occupation VARCHAR(10);
  v_verifier_code VARCHAR(10);
BEGIN
  IF NEW.posting_status = 'VAC' AND NEW.payer_type = 'ER' AND 
     (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');
    
    FOR v_wage_record IN
      SELECT DISTINCT ssn
      FROM public.ip_wages
      WHERE payer_id = NEW.payer_id
        AND sequence_no = NEW.sequence_no
        AND period = NEW.period
        AND ssn IS NOT NULL
    LOOP
      SELECT primary_occup INTO v_current_occupation
      FROM public.ip_master
      WHERE ssn = v_wage_record.ssn
      LIMIT 1;
      
      SELECT * INTO v_latest_employer
      FROM public.ip_employer
      WHERE ssn = v_wage_record.ssn
      ORDER BY date_entered DESC, created_at DESC
      LIMIT 1;
      
      IF v_latest_employer.id IS NULL OR
         v_latest_employer.employer_id IS DISTINCT FROM NEW.payer_id OR
         COALESCE(v_latest_employer.occupation, '') IS DISTINCT FROM COALESCE(v_current_occupation, '') THEN
        
        INSERT INTO public.ip_employer (
          ssn, employer_id, occupation, source, posting_status,
          entered_by, date_entered, term_start_date
        ) VALUES (
          v_wage_record.ssn, NEW.payer_id, v_current_occupation, 'C3', 'VAC',
          v_verifier_code, NOW() AT TIME ZONE 'UTC', NEW.period
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6d: validate_ip_master_contact_fields — remove email (duplicate) validation, keep email_addr
CREATE OR REPLACE FUNCTION public.validate_ip_master_contact_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- phone (varchar 10)
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF NEW.phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone) > 10 THEN
      RAISE EXCEPTION 'Phone exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- phone_mobile (varchar 10)
  IF NEW.phone_mobile IS NOT NULL AND NEW.phone_mobile <> '' THEN
    IF NEW.phone_mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone_mobile) > 10 THEN
      RAISE EXCEPTION 'Mobile exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- telephone (text)
  IF NEW.telephone IS NOT NULL AND NEW.telephone <> '' THEN
    IF NEW.telephone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Telephone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.telephone) > 15 THEN
      RAISE EXCEPTION 'Telephone exceeds maximum length of 15 characters';
    END IF;
  END IF;

  -- mobile (text)
  IF NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    IF NEW.mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.mobile) > 15 THEN
      RAISE EXCEPTION 'Mobile exceeds maximum length of 15 characters';
    END IF;
  END IF;

  -- contact_phone (varchar 10)
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    IF NEW.contact_phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Contact phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.contact_phone) > 10 THEN
      RAISE EXCEPTION 'Contact phone exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- contact_mobile (varchar 10)
  IF NEW.contact_mobile IS NOT NULL AND NEW.contact_mobile <> '' THEN
    IF NEW.contact_mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Contact mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.contact_mobile) > 10 THEN
      RAISE EXCEPTION 'Contact mobile exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- email_addr (canonical email column, varchar 40)
  IF NEW.email_addr IS NOT NULL AND NEW.email_addr <> '' THEN
    NEW.email_addr := trim(NEW.email_addr);
    IF length(NEW.email_addr) > 40 THEN
      RAISE EXCEPTION 'Email address exceeds maximum length of 40 characters';
    END IF;
    IF NEW.email_addr !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email address format';
    END IF;
  END IF;

  -- contact_email (varchar 40)
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
    NEW.contact_email := trim(NEW.contact_email);
    IF length(NEW.contact_email) > 40 THEN
      RAISE EXCEPTION 'Contact email exceeds maximum length of 40 characters';
    END IF;
    IF NEW.contact_email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid contact email format';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6e: check_ip_duplicates — use canonical columns
DROP FUNCTION IF EXISTS public.check_ip_duplicates(text, text, date, text, uuid);
CREATE OR REPLACE FUNCTION public.check_ip_duplicates(
  p_first_name text,
  p_last_name text,
  p_dob date,
  p_gender text,
  p_exclude_uuid uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, ssn text, full_name text, date_of_birth date, gender text, match_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.ssn::text,
    CONCAT(im.firstname, ' ', COALESCE(im.middle_name, ''), ' ', im.surname)::text as full_name,
    im.dob as date_of_birth,
    im.sex::text as gender,
    (
      CASE WHEN LOWER(im.firstname) = LOWER(p_first_name) THEN 30 ELSE 0 END +
      CASE WHEN LOWER(im.surname) = LOWER(p_last_name) THEN 30 ELSE 0 END +
      CASE WHEN im.dob = p_dob THEN 25 ELSE 0 END +
      CASE WHEN LOWER(im.sex) = LOWER(p_gender) THEN 15 ELSE 0 END
    ) as match_score
  FROM ip_master im
  WHERE im.unique_uuid != COALESCE(p_exclude_uuid, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (LOWER(im.firstname) = LOWER(p_first_name) AND LOWER(im.surname) = LOWER(p_last_name))
      OR (im.dob = p_dob AND LOWER(im.sex) = LOWER(p_gender))
    )
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$;

-- 6f: convert_application_to_ip — use canonical columns only
DROP FUNCTION IF EXISTS public.convert_application_to_ip(text,text,text,text,text,text,text,text,text,date,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,date,text,date,text,date,date,text,uuid,text,jsonb);
DROP FUNCTION IF EXISTS public.convert_application_to_ip(text,text,text,text,text,text,text,text,text,date,integer,integer,text,text,text,text,date,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,date,text,text,text,text,text,date,text,date,text,date,date,text,uuid,text,jsonb,text);

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
  p_second_middle_name TEXT DEFAULT NULL
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
    -- Canonical personal columns only
    surname, firstname, middle_name, second_middle_name, sex, dob,
    nationality, marital_status, birth_place, eyecolor,
    heightfeet, heightinches, date_married,
    previous_name, name_prefix, name_suffix, alias,
    -- Address
    resident_addr1, resident_addr2, district, mail_addr1, mail_addr2,
    -- Contact
    email_addr, telephone, mobile, phone, phone_mobile,
    -- Emergency contact
    contact, contact_relation, contact_addr1, contact_addr2,
    contact_email, contact_phone, contact_mobile,
    -- Relations
    father_name, mother_name, spouse_name, spouse_ssn, spouse_dob,
    -- Beneficiary
    beneficiary, ben_addr1, ben_addr2,
    -- Employment
    primary_occup, citizenship, citizenship_flag,
    date_of_residency, place_of_residence,
    work_permit, work_permit_expiration,
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
    p_last_name, p_first_name, p_middle_name, p_second_middle_name,
    LEFT(COALESCE(p_gender, 'N'), 1), p_date_of_birth,
    COALESCE(p_nationality, ''), COALESCE(p_marital_status, ''), p_birth_place, p_eye_color,
    p_height_feet, p_height_inches, p_date_married,
    p_maiden_name, p_title, p_suffix, p_alias,
    -- Address
    p_address_line1, p_address_line2, p_postal_district, p_mailing_addr1, p_mailing_addr2,
    -- Contact
    p_email, p_phone, p_phone_mobile, p_phone, p_phone_mobile,
    -- Emergency contact
    p_contact_name, p_contact_relation, p_contact_addr1, p_contact_addr2,
    p_contact_email, p_contact_phone, p_contact_mobile,
    -- Relations
    p_father_name, p_mother_name, p_spouse_name, p_spouse_ssn, p_spouse_dob,
    -- Beneficiary
    p_beneficiary_name, p_ben_addr1, p_ben_addr2,
    -- Employment
    p_occupation, p_citizenship,
    CASE WHEN p_citizenship IS NOT NULL AND p_citizenship != '' THEN 'Y' ELSE 'N' END,
    p_date_of_residency, p_citizenship,
    CASE WHEN COALESCE(p_has_work_permit, 'N') = 'Y' THEN 'Y' ELSE 'N' END,
    p_work_permit_expiry,
    -- Witness
    p_witness_name, p_witness_date,
    -- Application tracking
    COALESCE(p_application_date, CURRENT_DATE), p_reference_number, p_remarks,
    -- Photo
    p_photo_url,
    -- Audit
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

-- STEP 7: Drop all duplicate columns
ALTER TABLE ip_master DROP COLUMN IF EXISTS last_name;
ALTER TABLE ip_master DROP COLUMN IF EXISTS first_name;
ALTER TABLE ip_master DROP COLUMN IF EXISTS maiden_name;
ALTER TABLE ip_master DROP COLUMN IF EXISTS gender;
ALTER TABLE ip_master DROP COLUMN IF EXISTS date_of_birth;
ALTER TABLE ip_master DROP COLUMN IF EXISTS resident_address_1;
ALTER TABLE ip_master DROP COLUMN IF EXISTS resident_address_2;
ALTER TABLE ip_master DROP COLUMN IF EXISTS postal_district;
ALTER TABLE ip_master DROP COLUMN IF EXISTS birth_place_code;
ALTER TABLE ip_master DROP COLUMN IF EXISTS nationality_code;
ALTER TABLE ip_master DROP COLUMN IF EXISTS date_resident;
ALTER TABLE ip_master DROP COLUMN IF EXISTS work_permit_status;
ALTER TABLE ip_master DROP COLUMN IF EXISTS occupation;
ALTER TABLE ip_master DROP COLUMN IF EXISTS npf_status;
ALTER TABLE ip_master DROP COLUMN IF EXISTS signature_on_file;
ALTER TABLE ip_master DROP COLUMN IF EXISTS email;
ALTER TABLE ip_master DROP COLUMN IF EXISTS title;
ALTER TABLE ip_master DROP COLUMN IF EXISTS suffix;
ALTER TABLE ip_master DROP COLUMN IF EXISTS place_of_residence_code;
ALTER TABLE ip_master DROP COLUMN IF EXISTS height_feet;
ALTER TABLE ip_master DROP COLUMN IF EXISTS height_inches;
ALTER TABLE ip_master DROP COLUMN IF EXISTS eye_color;
ALTER TABLE ip_master DROP COLUMN IF EXISTS work_permit_expiry;
