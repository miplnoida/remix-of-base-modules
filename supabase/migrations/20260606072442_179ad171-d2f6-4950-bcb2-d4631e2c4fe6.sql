CREATE OR REPLACE FUNCTION public.bn_submit_claim_application(
  p_ssn text,
  p_product_code text,
  p_claim_date date,
  p_channel text,
  p_form_payload jsonb,
  p_employer_regno text DEFAULT NULL::text,
  p_submitted_by_user_id text DEFAULT NULL::text,
  p_source_ip text DEFAULT NULL::text,
  p_user_agent text DEFAULT NULL::text
)
RETURNS TABLE(claim_id uuid, claim_number text, workflow_instance_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id UUID;
  v_version_id UUID;
  v_channel_config_id UUID;
  v_workflow_template_id UUID;
  v_workflow_def_id UUID;
  v_claim_id UUID;
  v_claim_no TEXT;
  v_wf_instance UUID;
  v_first_step_id UUID;
  v_workflow_name TEXT;
  v_person RECORD;
  v_employer RECORD;
  v_contrib RECORD;
  v_user_text TEXT := COALESCE(NULLIF(p_submitted_by_user_id, ''), 'SYSTEM');
  v_user_uuid UUID;
  v_channel_config_code TEXT;
BEGIN
  BEGIN
    v_user_uuid := NULLIF(p_submitted_by_user_id, '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_uuid := NULL;
  END;

  v_channel_config_code := CASE
    WHEN p_channel = 'PUBLIC_ONLINE' THEN 'ONLINE'
    ELSE 'OFFLINE'
  END;

  SELECT p.id, pv.id, pcc.id,
         COALESCE(pcc.workflow_template_id, pv.workflow_template_id),
         pcc.workflow_definition_id
    INTO v_product_id, v_version_id, v_channel_config_id, v_workflow_template_id, v_workflow_def_id
  FROM public.bn_product p
  JOIN public.bn_product_version pv ON pv.product_id = p.id
  LEFT JOIN public.bn_product_channel_config pcc
    ON pcc.product_version_id = pv.id
   AND pcc.channel_code = v_channel_config_code
   AND COALESCE(pcc.is_enabled, true) = true
  WHERE p.benefit_code = p_product_code
    AND p.status = 'ACTIVE'
    AND pv.status = 'ACTIVE'
    AND pv.effective_from <= p_claim_date
    AND (pv.effective_to IS NULL OR pv.effective_to >= p_claim_date)
  ORDER BY pv.effective_from DESC
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'No active product version found for % on %', p_product_code, p_claim_date;
  END IF;

  IF v_workflow_def_id IS NULL AND v_workflow_template_id IS NOT NULL THEN
    SELECT workflow_definition_id
      INTO v_workflow_def_id
    FROM public.bn_workflow_template
    WHERE id = v_workflow_template_id
      AND COALESCE(is_active, true) = true
    LIMIT 1;
  END IF;

  v_claim_no := 'BN-' || to_char(now(),'YYYYMMDD') || '-' || lpad((floor(random()*100000))::text, 5, '0');

  INSERT INTO public.bn_claim (
    claim_number, ssn, product_id, product_version_id, employer_regno,
    status, priority, claim_date, submission_date, source, application_channel, channel_code,
    contact_phone, contact_email, bank_account, bank_routing_number,
    declaration, entered_by, entered_at, workflow_definition_id, channel_config_id
  )
  VALUES (
    v_claim_no, p_ssn, v_product_id, v_version_id, p_employer_regno,
    'INTAKE', COALESCE(NULLIF(p_form_payload->>'priority', ''), 'NORMAL'), p_claim_date, now(), p_channel, p_channel, v_channel_config_code,
    NULLIF(p_form_payload->>'contact_phone', ''), NULLIF(p_form_payload->>'contact_email', ''),
    NULLIF(p_form_payload->>'bank_account', ''), NULLIF(p_form_payload->>'bank_routing_number', ''),
    COALESCE((p_form_payload->>'declaration_accepted')::boolean, false),
    v_user_text, now(), v_workflow_def_id, v_channel_config_id
  )
  RETURNING id INTO v_claim_id;

  INSERT INTO public.bn_claim_application (
    claim_id, product_id, product_version_id, application_channel,
    submitted_by_type, submitted_by_user_id, submitted_at,
    declaration_accepted, raw_application_json, source_ip, user_agent,
    entered_by
  ) VALUES (
    v_claim_id, v_product_id, v_version_id, p_channel,
    CASE WHEN p_channel='PUBLIC_ONLINE' THEN 'PUBLIC_USER' ELSE 'EMPLOYEE' END,
    v_user_text, now(),
    COALESCE((p_form_payload->>'declaration_accepted')::boolean, false),
    p_form_payload, p_source_ip, p_user_agent, v_user_text
  );

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

  IF p_employer_regno IS NOT NULL THEN
    SELECT regno, name, status, maddr1, maddr2, hq_addr1, hq_addr2
      INTO v_employer
    FROM public.er_master WHERE regno = p_employer_regno LIMIT 1;
    IF FOUND THEN
      INSERT INTO public.bn_claim_employer_snapshot (
        claim_id, employer_regno, employer_name, employer_status, address_json
      ) VALUES (
        v_claim_id, v_employer.regno, v_employer.name, v_employer.status,
        jsonb_build_object('line1', COALESCE(v_employer.maddr1, v_employer.hq_addr1),
                           'line2', COALESCE(v_employer.maddr2, v_employer.hq_addr2))
      );
    END IF;
  END IF;

  BEGIN
    SELECT
      MIN(period) AS period_from,
      MAX(period) AS period_to,
      COUNT(*)::int AS total_weeks,
      COALESCE(SUM(total_wages),0) AS total_wages
    INTO v_contrib
    FROM public.ip_wages
    WHERE ssn = p_ssn;

    INSERT INTO public.bn_claim_contribution_snapshot (
      claim_id, period_from, period_to, total_weeks, paid_weeks, credited_weeks,
      total_wages, average_weekly_wage, contribution_json
    ) VALUES (
      v_claim_id, v_contrib.period_from, v_contrib.period_to,
      COALESCE(v_contrib.total_weeks, 0), COALESCE(v_contrib.total_weeks, 0), 0,
      COALESCE(v_contrib.total_wages, 0),
      CASE WHEN COALESCE(v_contrib.total_weeks, 0) > 0 THEN COALESCE(v_contrib.total_wages, 0) / v_contrib.total_weeks ELSE 0 END,
      jsonb_build_object('source','ip_wages', 'rows', COALESCE(v_contrib.total_weeks, 0))
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.bn_claim_intake_validation (claim_id, check_code, status, message, details_json)
    VALUES (v_claim_id, 'CONTRIBUTION_SNAPSHOT', 'WARN', 'Contribution snapshot could not be generated', jsonb_build_object('error', SQLERRM));
  END;

  BEGIN
    INSERT INTO public.bn_evidence_checklist (claim_id, requirement_id, status, is_blocking, entered_at)
    SELECT v_claim_id, dr.id, 'OUTSTANDING', COALESCE(dr.blocks_submission, true), now()
    FROM public.bn_doc_requirement dr
    WHERE dr.product_version_id = v_version_id
      AND COALESCE(dr.is_active, true) = true;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.bn_claim_intake_validation (claim_id, check_code, status, message, details_json)
    VALUES (v_claim_id, 'DOCUMENT_CHECKLIST', 'WARN', 'Document checklist could not be generated', jsonb_build_object('error', SQLERRM));
  END;

  INSERT INTO public.bn_claim_intake_validation (claim_id, check_code, status, message)
  VALUES
    (v_claim_id, 'PERSON_FOUND',
       CASE WHEN v_person.ssn IS NOT NULL THEN 'PASS' ELSE 'FAIL' END,
       CASE WHEN v_person.ssn IS NOT NULL THEN 'Claimant matched in ip_master' ELSE 'No matching person for SSN' END),
    (v_claim_id, 'PRODUCT_VERSION_ACTIVE', 'PASS', 'Active product version resolved');

  IF v_workflow_def_id IS NOT NULL THEN
    BEGIN
      SELECT wd.name, ws.id
        INTO v_workflow_name, v_first_step_id
      FROM public.workflow_definitions wd
      LEFT JOIN public.workflow_steps ws
        ON ws.workflow_id = wd.id
      WHERE wd.id = v_workflow_def_id
        AND COALESCE(wd.is_active, true) = true
      ORDER BY ws.step_number ASC NULLS LAST
      LIMIT 1;

      IF v_workflow_name IS NOT NULL THEN
        INSERT INTO public.workflow_instances (
          workflow_id, workflow_name, source_module, source_record_id, source_record_name,
          current_step_id, status, started_by, started_by_name, metadata
        ) VALUES (
          v_workflow_def_id, v_workflow_name, 'bn_claim', v_claim_id::text, v_claim_no,
          v_first_step_id, 'InProgress', v_user_uuid, v_user_text,
          jsonb_build_object('ssn', p_ssn, 'product_code', p_product_code, 'product_version_id', v_version_id, 'channel', p_channel)
        ) RETURNING id INTO v_wf_instance;

        UPDATE public.bn_claim SET workflow_instance_id = v_wf_instance WHERE id = v_claim_id;

        INSERT INTO public.bn_claim_event (claim_id, event_type, from_status, to_status, notes, performed_by, metadata)
        VALUES (v_claim_id, 'WORKFLOW_STARTED', NULL, 'INTAKE', 'Central workflow instance started', v_user_text, jsonb_build_object('workflow_instance_id', v_wf_instance));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.bn_claim_intake_validation (claim_id, check_code, status, message, details_json)
      VALUES (v_claim_id, 'WORKFLOW_START', 'WARN', 'Workflow could not be started; claim registration continued', jsonb_build_object('error', SQLERRM));
    END;
  END IF;

  INSERT INTO public.bn_claim_event (claim_id, event_type, from_status, to_status, notes, performed_by, metadata)
  VALUES (v_claim_id, 'CLAIM_SUBMITTED', NULL, 'INTAKE', 'Claim submitted via intake registration', v_user_text, jsonb_build_object('channel', p_channel, 'workflow_instance_id', v_wf_instance));

  RETURN QUERY SELECT v_claim_id, v_claim_no, v_wf_instance;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.bn_submit_claim_application(TEXT, TEXT, DATE, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;