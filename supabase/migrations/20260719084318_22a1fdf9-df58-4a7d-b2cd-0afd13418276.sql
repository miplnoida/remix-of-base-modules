
CREATE OR REPLACE FUNCTION public.bn_appeal_submit_claimant(
  p_actor_user_id       uuid,
  p_actor_user_code     text,
  p_correlation_id      uuid,
  p_command_id          uuid,
  p_bn_claim_id         uuid,
  p_appeal_type_code    text,
  p_reason_summary      text,
  p_grounds             jsonb,
  p_decision_snapshot   jsonb
) RETURNS TABLE (appeal_id uuid, appeal_number text, row_version bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owned          boolean;
  v_claim_status   text;
  v_appeal_id      uuid := gen_random_uuid();
  v_appeal_no      text;
  v_year           text := to_char(now(), 'YYYY');
  v_seq            bigint;
  v_now            timestamptz := now();
  v_source_dec_dt  date;
  v_deadline_days  integer := 30;
  v_ground         jsonb;
  v_claim_ssn      text;
BEGIN
  IF p_actor_user_id IS NULL OR p_bn_claim_id IS NULL OR p_appeal_type_code IS NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_SUBMIT_MISSING_INPUT';
  END IF;

  SELECT c.status, c.decision_date, c.ssn
    INTO v_claim_status, v_source_dec_dt, v_claim_ssn
  FROM public.bn_claim c
  WHERE c.id = p_bn_claim_id;

  IF v_claim_ssn IS NULL THEN
    RAISE EXCEPTION 'BN_APPEAL_CLAIM_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.external_user_person_link l
    WHERE l.user_id = p_actor_user_id
      AND l.ssn = v_claim_ssn
      AND COALESCE(l.verification_status, 'verified') IN ('verified','confirmed','active')
  ) INTO v_owned;

  IF NOT v_owned THEN
    RAISE EXCEPTION 'BN_APPEAL_CLAIM_NOT_OWNED';
  END IF;

  v_seq := nextval('public.bn_appeal_seq');
  v_appeal_no := 'AP-' || v_year || '-' || lpad(v_seq::text, 6, '0');

  INSERT INTO public.bn_appeal (
    id, appeal_number, bn_claim_id, source_module_code, source_decision_date,
    appeal_type_code, appeal_channel,
    submitted_by_user_id, submitted_by_user_code,
    status, statutory_filing_days, filing_deadline_date, submitted_at,
    reason_summary, correlation_id, entered_by, entered_at, modified_by, modified_at
  )
  VALUES (
    v_appeal_id, v_appeal_no, p_bn_claim_id, 'bn_claim', v_source_dec_dt,
    p_appeal_type_code, 'CLAIMANT_PORTAL',
    p_actor_user_id, p_actor_user_code,
    'SUBMITTED', v_deadline_days,
    (COALESCE(v_source_dec_dt, current_date) + v_deadline_days * INTERVAL '1 day')::date,
    v_now,
    p_reason_summary, p_correlation_id, p_actor_user_code, v_now, p_actor_user_code, v_now
  );

  INSERT INTO public.bn_appeal_decision_snapshot (appeal_id, source_module_code, snapshot_json)
  VALUES (v_appeal_id, 'bn_claim', COALESCE(p_decision_snapshot, jsonb_build_object('claim_id', p_bn_claim_id, 'status', v_claim_status)));

  IF p_grounds IS NOT NULL AND jsonb_typeof(p_grounds) = 'array' THEN
    FOR v_ground IN SELECT * FROM jsonb_array_elements(p_grounds) LOOP
      INSERT INTO public.bn_appeal_ground (appeal_id, ground_code, ground_text, entered_by)
      VALUES (
        v_appeal_id,
        COALESCE(v_ground->>'ground_code', 'GENERAL'),
        COALESCE(v_ground->>'ground_text', ''),
        p_actor_user_code
      );
    END LOOP;
  END IF;

  INSERT INTO public.bn_appeal_event (
    appeal_id, event_code, from_status, to_status, correlation_id, command_id,
    actor_user_id, actor_user_code, notes
  ) VALUES (
    v_appeal_id, 'SUBMITTED', 'DRAFT', 'SUBMITTED', p_correlation_id, p_command_id,
    p_actor_user_id, p_actor_user_code, 'Claimant portal submission'
  );

  RETURN QUERY SELECT v_appeal_id, v_appeal_no, 1::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_appeal_submit_claimant(uuid, text, uuid, uuid, uuid, text, text, jsonb, jsonb) TO authenticated, service_role;
