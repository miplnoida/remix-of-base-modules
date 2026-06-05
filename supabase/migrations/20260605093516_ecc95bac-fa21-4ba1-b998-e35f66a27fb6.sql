
-- 1. Extend bn_claim with application_channel (channel_code already exists but keeping a normalized intake channel separately)
ALTER TABLE public.bn_claim
  ADD COLUMN IF NOT EXISTS application_channel VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_bn_claim_status_channel ON public.bn_claim(status, application_channel);
CREATE INDEX IF NOT EXISTS idx_bn_claim_assigned_status ON public.bn_claim(assigned_to, status);

-- 2. bn_claim_application
CREATE TABLE IF NOT EXISTS public.bn_claim_application (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  product_id UUID,
  product_version_id UUID,
  application_channel VARCHAR(40) NOT NULL,
  submitted_by_type VARCHAR(20) NOT NULL,
  submitted_by_user_id VARCHAR(100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  form_template_id UUID,
  declaration_accepted BOOLEAN DEFAULT false,
  raw_application_json JSONB,
  source_ip VARCHAR(64),
  user_agent TEXT,
  entered_by VARCHAR(100),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_application TO authenticated;
GRANT ALL ON public.bn_claim_application TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_claim_application_claim ON public.bn_claim_application(claim_id);

-- 3. bn_claim_person_snapshot
CREATE TABLE IF NOT EXISTS public.bn_claim_person_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  ssn VARCHAR(20),
  full_name TEXT,
  date_of_birth DATE,
  gender VARCHAR(2),
  person_status VARCHAR(30),
  address_json JSONB,
  phone VARCHAR(40),
  email VARCHAR(150),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_person_snapshot TO authenticated;
GRANT ALL ON public.bn_claim_person_snapshot TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_claim_person_snapshot_claim ON public.bn_claim_person_snapshot(claim_id);

-- 4. bn_claim_employer_snapshot
CREATE TABLE IF NOT EXISTS public.bn_claim_employer_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  employer_regno VARCHAR(20),
  employer_name TEXT,
  employer_status VARCHAR(30),
  address_json JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_employer_snapshot TO authenticated;
GRANT ALL ON public.bn_claim_employer_snapshot TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_claim_employer_snapshot_claim ON public.bn_claim_employer_snapshot(claim_id);

-- 5. bn_claim_contribution_snapshot
CREATE TABLE IF NOT EXISTS public.bn_claim_contribution_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  period_from DATE,
  period_to DATE,
  total_weeks INTEGER DEFAULT 0,
  paid_weeks INTEGER DEFAULT 0,
  credited_weeks INTEGER DEFAULT 0,
  total_wages NUMERIC(18,2) DEFAULT 0,
  average_weekly_wage NUMERIC(18,2) DEFAULT 0,
  contribution_json JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_contribution_snapshot TO authenticated;
GRANT ALL ON public.bn_claim_contribution_snapshot TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_claim_contrib_snapshot_claim ON public.bn_claim_contribution_snapshot(claim_id);

-- 6. bn_claim_intake_validation
CREATE TABLE IF NOT EXISTS public.bn_claim_intake_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  check_code VARCHAR(80) NOT NULL,
  status VARCHAR(10) NOT NULL,
  message TEXT,
  details_json JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_intake_validation TO authenticated;
GRANT ALL ON public.bn_claim_intake_validation TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_claim_intake_validation_claim ON public.bn_claim_intake_validation(claim_id);

-- 7. RPC bn_submit_claim_application
DROP FUNCTION IF EXISTS public.bn_submit_claim_application(text, text, date, text, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION public.bn_submit_claim_application(
  p_ssn TEXT,
  p_product_code TEXT,
  p_claim_date DATE,
  p_channel TEXT,
  p_form_payload JSONB,
  p_employer_regno TEXT DEFAULT NULL,
  p_submitted_by_user_id TEXT DEFAULT NULL,
  p_source_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(claim_id UUID, claim_number TEXT, workflow_instance_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
  v_version_id UUID;
  v_workflow_def_id UUID;
  v_claim_id UUID;
  v_claim_no TEXT;
  v_wf_instance UUID;
  v_person RECORD;
  v_employer RECORD;
  v_contrib RECORD;
  v_user TEXT := COALESCE(p_submitted_by_user_id, 'SYSTEM');
BEGIN
  -- Resolve product + active version
  SELECT p.id, pv.id, pv.workflow_definition_id
    INTO v_product_id, v_version_id, v_workflow_def_id
  FROM public.bn_product p
  JOIN public.bn_product_version pv ON pv.product_id = p.id
  WHERE p.benefit_code = p_product_code
    AND pv.status = 'ACTIVE'
    AND pv.effective_from <= p_claim_date
    AND (pv.effective_to IS NULL OR pv.effective_to >= p_claim_date)
  ORDER BY pv.effective_from DESC
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'No active product version found for % on %', p_product_code, p_claim_date;
  END IF;

  v_claim_no := 'BN-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*100000))::text, 5, '0');

  -- Create claim
  INSERT INTO public.bn_claim (
    claim_number, ssn, product_id, product_version_id, employer_regno,
    status, claim_date, submission_date, source, application_channel, channel_code,
    entered_by, entered_at, workflow_definition_id
  )
  VALUES (
    v_claim_no, p_ssn, v_product_id, v_version_id, p_employer_regno,
    'INTAKE', p_claim_date, now(), p_channel, p_channel, p_channel,
    v_user, now(), v_workflow_def_id
  )
  RETURNING id INTO v_claim_id;

  -- Application payload
  INSERT INTO public.bn_claim_application (
    claim_id, product_id, product_version_id, application_channel,
    submitted_by_type, submitted_by_user_id, submitted_at,
    declaration_accepted, raw_application_json, source_ip, user_agent,
    entered_by
  ) VALUES (
    v_claim_id, v_product_id, v_version_id, p_channel,
    CASE WHEN p_channel='PUBLIC_ONLINE' THEN 'PUBLIC_USER' ELSE 'EMPLOYEE' END,
    v_user, now(),
    COALESCE((p_form_payload->>'declaration_accepted')::boolean, false),
    p_form_payload, p_source_ip, p_user_agent, v_user
  );

  -- Person snapshot
  SELECT ssn, firstname, surname, dob, sex, status, email_addr, phone,
         resident_addr1, resident_addr2, district, place_of_residence
    INTO v_person
  FROM public.ip_master WHERE ssn = p_ssn LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.bn_claim_person_snapshot (
      claim_id, ssn, full_name, date_of_birth, gender, person_status,
      address_json, phone, email
    ) VALUES (
      v_claim_id, v_person.ssn,
      trim(coalesce(v_person.firstname,'') || ' ' || coalesce(v_person.surname,'')),
      v_person.dob, v_person.sex, v_person.status,
      jsonb_build_object('line1', v_person.resident_addr1, 'line2', v_person.resident_addr2,
                         'district', v_person.district, 'country', v_person.place_of_residence),
      v_person.phone, v_person.email_addr
    );
  END IF;

  -- Employer snapshot
  IF p_employer_regno IS NOT NULL THEN
    SELECT employer_reg_no, name, status, addr1, addr2, city
      INTO v_employer
    FROM public.er_master WHERE employer_reg_no = p_employer_regno LIMIT 1;
    IF FOUND THEN
      INSERT INTO public.bn_claim_employer_snapshot (
        claim_id, employer_regno, employer_name, employer_status, address_json
      ) VALUES (
        v_claim_id, v_employer.employer_reg_no, v_employer.name, v_employer.status,
        jsonb_build_object('line1', v_employer.addr1, 'line2', v_employer.addr2, 'city', v_employer.city)
      );
    END IF;
  END IF;

  -- Contribution snapshot (simple totals)
  BEGIN
    SELECT 
      MIN(period) AS period_from,
      MAX(period) AS period_to,
      COALESCE(SUM(weeks),0)::int AS total_weeks,
      COALESCE(SUM(contributions),0) AS total_wages
    INTO v_contrib
    FROM public.ip_wages WHERE ssn = p_ssn;

    INSERT INTO public.bn_claim_contribution_snapshot (
      claim_id, period_from, period_to, total_weeks, paid_weeks, credited_weeks,
      total_wages, average_weekly_wage, contribution_json
    ) VALUES (
      v_claim_id, v_contrib.period_from, v_contrib.period_to,
      v_contrib.total_weeks, v_contrib.total_weeks, 0,
      v_contrib.total_wages,
      CASE WHEN v_contrib.total_weeks > 0 THEN v_contrib.total_wages / v_contrib.total_weeks ELSE 0 END,
      jsonb_build_object('source','ip_wages')
    );
  EXCEPTION WHEN OTHERS THEN
    -- non-fatal
    NULL;
  END;

  -- Evidence checklist materialize
  BEGIN
    INSERT INTO public.bn_evidence_checklist (claim_id, requirement_id, status, required, entered_at)
    SELECT v_claim_id, dr.id, 'PENDING', COALESCE(dr.is_mandatory,true), now()
    FROM public.bn_doc_requirement dr
    WHERE dr.product_version_id = v_version_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Intake validations (light)
  INSERT INTO public.bn_claim_intake_validation (claim_id, check_code, status, message)
  VALUES
    (v_claim_id, 'PERSON_FOUND',
       CASE WHEN v_person.ssn IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
       CASE WHEN v_person.ssn IS NOT NULL THEN 'Claimant matched in ip_master' ELSE 'No matching person for SSN' END),
    (v_claim_id, 'PRODUCT_VERSION_ACTIVE', 'PASS', 'Active product version resolved');

  -- Workflow instance (best-effort)
  IF v_workflow_def_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.workflow_instances (
        workflow_definition_id, source_module, source_record_id, status, initiated_by, created_at
      ) VALUES (
        v_workflow_def_id, 'bn_claim', v_claim_id, 'active', v_user, now()
      ) RETURNING id INTO v_wf_instance;

      UPDATE public.bn_claim SET workflow_instance_id = v_wf_instance WHERE id = v_claim_id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN QUERY SELECT v_claim_id, v_claim_no, v_wf_instance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_submit_claim_application(TEXT, TEXT, DATE, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
