
-- 1. Fix canonical enum values in the execute-command RPC ---------------------
CREATE OR REPLACE FUNCTION public.bn_mortality_execute_command(
  p_command_name text,
  p_entity_id uuid,
  p_actor_user_id uuid,
  p_actor_user_code text,
  p_correlation_id uuid,
  p_expected_row_version bigint,
  p_reason_code text,
  p_justification text,
  p_payload jsonb,
  p_payload_hash text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.bn_mortality_event%ROWTYPE;
  v_from text;
  v_to text;
  v_now timestamptz := now();
  v_data jsonb := '{}'::jsonb;
  v_new_entity uuid := p_entity_id;
BEGIN
  CASE p_command_name
    WHEN 'BN_MORTALITY_DRAFT_SAVE'                   THEN v_to := 'DRAFT';
    WHEN 'BN_MORTALITY_REGISTER_REPORT'              THEN v_to := 'REPORTED';
    WHEN 'BN_MORTALITY_CANCEL'                       THEN v_to := 'CANCELLED';
    WHEN 'BN_MORTALITY_MATCH_PERSON'                 THEN v_to := NULL;
    WHEN 'BN_MORTALITY_MARK_DUPLICATE'               THEN v_to := 'DUPLICATE';
    WHEN 'BN_MORTALITY_ASSIGN'                       THEN v_to := NULL;
    WHEN 'BN_MORTALITY_ATTACH_EVIDENCE'              THEN v_to := NULL;
    WHEN 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION'      THEN v_to := 'VERIFICATION_PENDING';
    WHEN 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD'       THEN v_to := 'PROVISIONALLY_HELD';
    WHEN 'BN_MORTALITY_RELEASE_HOLD'                 THEN v_to := 'VERIFICATION_PENDING';
    WHEN 'BN_MORTALITY_RECORD_CONFLICT'              THEN v_to := 'CONFLICT';
    WHEN 'BN_MORTALITY_RESOLVE_CONFLICT'             THEN v_to := 'VERIFICATION_PENDING';
    WHEN 'BN_MORTALITY_CONFIRM_VERIFICATION'         THEN v_to := 'VERIFIED';
    WHEN 'BN_MORTALITY_REJECT_REPORT'                THEN v_to := 'REJECTED';
    WHEN 'BN_MORTALITY_PREPARE_IMPACT'               THEN v_to := 'IMPACT_REVIEW';
    WHEN 'BN_MORTALITY_SUBMIT_IMPACT'                THEN v_to := 'APPROVAL_PENDING';
    WHEN 'BN_MORTALITY_RETURN_IMPACT'                THEN v_to := 'IMPACT_REVIEW';
    WHEN 'BN_MORTALITY_APPROVE_IMPACT'               THEN v_to := 'CONFIRMED';
    WHEN 'BN_MORTALITY_TERMINATE_AWARD'              THEN v_to := 'FOLLOW_ON_PROCESSING';
    WHEN 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT'       THEN v_to := NULL;
    WHEN 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT' THEN v_to := NULL;
    WHEN 'BN_MORTALITY_INITIATE_FUNERAL_GRANT'       THEN v_to := NULL;
    WHEN 'BN_MORTALITY_COMPLETE_FOLLOWON'            THEN v_to := 'COMPLETED';
    WHEN 'BN_MORTALITY_REFER_LEGAL'                  THEN v_to := NULL;
    WHEN 'BN_MORTALITY_REVERSE_CONFIRMATION'         THEN v_to := 'REVERSED';
    WHEN 'BN_MORTALITY_CLOSE_EVENT'                  THEN v_to := 'CLOSED';
    ELSE
      RAISE EXCEPTION 'COMMAND_UNKNOWN:%', p_command_name;
  END CASE;

  IF p_command_name = 'BN_MORTALITY_DRAFT_SAVE' AND p_entity_id IS NULL THEN
    INSERT INTO public.bn_mortality_event(status, source, deceased_full_name, correlation_id, created_by, updated_by)
    VALUES ('DRAFT',
            COALESCE(p_payload->>'source','MANUAL'),
            p_payload->>'deceased_full_name',
            p_correlation_id,
            p_actor_user_id,
            p_actor_user_id)
    RETURNING * INTO v_row;
    v_new_entity := v_row.id;
  ELSIF p_command_name = 'BN_MORTALITY_REGISTER_REPORT' AND p_entity_id IS NULL THEN
    INSERT INTO public.bn_mortality_event(status, source, deceased_full_name, correlation_id, created_by, updated_by, reported_at)
    VALUES ('REPORTED',
            COALESCE(p_payload->>'source','MANUAL'),
            p_payload->>'deceased_full_name',
            p_correlation_id,
            p_actor_user_id,
            p_actor_user_id,
            v_now)
    RETURNING * INTO v_row;
    v_new_entity := v_row.id;
  ELSE
    IF p_entity_id IS NULL THEN
      RAISE EXCEPTION 'ENTITY_REQUIRED:%', p_command_name;
    END IF;
    SELECT * INTO v_row FROM public.bn_mortality_event WHERE id = p_entity_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ENTITY_NOT_FOUND:%', p_entity_id;
    END IF;
    IF p_expected_row_version IS NOT NULL AND v_row.row_version <> p_expected_row_version THEN
      RAISE EXCEPTION 'ROW_VERSION_CONFLICT:expected=%,actual=%', p_expected_row_version, v_row.row_version;
    END IF;
    v_from := v_row.status;

    CASE p_command_name
      WHEN 'BN_MORTALITY_CANCEL' THEN
        IF v_from NOT IN ('DRAFT','REPORTED') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_MATCH_PERSON' THEN
        IF v_from NOT IN ('DRAFT','REPORTED','VERIFICATION_PENDING','CONFLICT') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION' THEN
        IF v_from NOT IN ('DRAFT','REPORTED') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD' THEN
        IF v_from NOT IN ('REPORTED','VERIFICATION_PENDING','CONFLICT') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_RELEASE_HOLD' THEN
        IF v_from <> 'PROVISIONALLY_HELD' THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_CONFIRM_VERIFICATION' THEN
        IF v_from NOT IN ('VERIFICATION_PENDING','PROVISIONALLY_HELD') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_REJECT_REPORT' THEN
        IF v_from NOT IN ('VERIFICATION_PENDING','CONFLICT','PROVISIONALLY_HELD') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_PREPARE_IMPACT' THEN
        IF v_from NOT IN ('VERIFIED','IMPACT_REVIEW') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_SUBMIT_IMPACT' THEN
        IF v_from <> 'IMPACT_REVIEW' THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_RETURN_IMPACT' THEN
        IF v_from <> 'APPROVAL_PENDING' THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_APPROVE_IMPACT' THEN
        IF v_from <> 'APPROVAL_PENDING' THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_TERMINATE_AWARD' THEN
        IF v_from NOT IN ('CONFIRMED','FOLLOW_ON_PROCESSING') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_COMPLETE_FOLLOWON' THEN
        IF v_from <> 'FOLLOW_ON_PROCESSING' THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_REVERSE_CONFIRMATION' THEN
        IF v_from NOT IN ('VERIFIED','CONFIRMED','FOLLOW_ON_PROCESSING','COMPLETED') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      WHEN 'BN_MORTALITY_CLOSE_EVENT' THEN
        IF v_from NOT IN ('COMPLETED','REJECTED','REVERSED') THEN RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to; END IF;
      ELSE NULL;
    END CASE;
  END IF;

  -- Command-specific side-effects
  CASE p_command_name
    WHEN 'BN_MORTALITY_MATCH_PERSON' THEN
      UPDATE public.bn_mortality_event SET
        matched_ip_id = NULLIF(p_payload->>'ip_id','')::uuid,
        match_confidence = COALESCE(p_payload->>'confidence','HIGH'),
        matched_at = v_now,
        match_score = NULLIF(p_payload->>'score','')::numeric,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;
    WHEN 'BN_MORTALITY_ASSIGN' THEN
      UPDATE public.bn_mortality_event SET
        assigned_to = NULLIF(p_payload->>'assignee_user_id','')::uuid,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;
    WHEN 'BN_MORTALITY_ATTACH_EVIDENCE' THEN
      UPDATE public.bn_mortality_event SET
        row_version = row_version + 1,
        updated_by = p_actor_user_id,
        metadata_json = COALESCE(metadata_json,'{}'::jsonb) ||
          jsonb_build_object(
            'evidence',
            COALESCE(metadata_json->'evidence','[]'::jsonb) ||
            jsonb_build_array(jsonb_build_object(
              'attached_at', v_now,
              'attached_by', p_actor_user_id,
              'ref', p_payload->>'evidence_ref',
              'kind', p_payload->>'evidence_kind'
            ))
          )
      WHERE id = v_new_entity RETURNING * INTO v_row;
    WHEN 'BN_MORTALITY_REJECT_REPORT' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        rejected_reason = p_payload->>'reason',
        closed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    -- FIXED: use canonical enum values that satisfy the CHECK constraints.
    WHEN 'BN_MORTALITY_APPROVE_IMPACT' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;
      UPDATE public.bn_mortality_award_impact SET
        approval_state = 'APPROVED',
        approved_at = v_now,
        approved_by = p_actor_user_id,
        impact_status = 'APPLIED',
        applied_at = v_now,
        row_version = row_version + 1,
        updated_at = v_now
      WHERE event_id = v_new_entity
        AND approval_state = 'PENDING';

    WHEN 'BN_MORTALITY_TERMINATE_AWARD' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;
      UPDATE public.bn_mortality_award_impact SET
        termination_status = 'APPLIED',
        termination_effective_date = COALESCE(termination_effective_date, v_now::date),
        row_version = row_version + 1,
        updated_at = v_now
      WHERE event_id = v_new_entity
        AND termination_required = true
        AND approval_state = 'APPROVED';

    WHEN 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT' THEN
      UPDATE public.bn_mortality_award_impact SET
        overpayment_id = COALESCE(overpayment_id, NULLIF(p_payload->>'overpayment_id','')::uuid),
        overpayment_reference = COALESCE(overpayment_reference, p_payload->>'overpayment_reference'),
        payment_after_death_minor = COALESCE((p_payload->>'amount_minor')::bigint, payment_after_death_minor),
        updated_at = v_now
      WHERE event_id = v_new_entity;
      UPDATE public.bn_mortality_event SET row_version = row_version + 1, updated_by = p_actor_user_id WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT',
         'BN_MORTALITY_INITIATE_FUNERAL_GRANT',
         'BN_MORTALITY_REFER_LEGAL' THEN
      INSERT INTO public.bn_mortality_referral(event_id, referral_type, target_module, target_ref_type, target_ref_id, raised_by, correlation_id, target_reference)
      VALUES (
        v_new_entity,
        CASE p_command_name
          WHEN 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT' THEN 'SURVIVOR'
          WHEN 'BN_MORTALITY_INITIATE_FUNERAL_GRANT'       THEN 'FUNERAL'
          WHEN 'BN_MORTALITY_REFER_LEGAL'                  THEN 'LEGAL'
        END,
        COALESCE(p_payload->>'target_module',
          CASE p_command_name
            WHEN 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT' THEN 'bn_claims'
            WHEN 'BN_MORTALITY_INITIATE_FUNERAL_GRANT'       THEN 'bn_claims'
            WHEN 'BN_MORTALITY_REFER_LEGAL'                  THEN 'legal'
          END),
        p_payload->>'target_ref_type',
        NULLIF(p_payload->>'target_ref_id','')::uuid,
        p_actor_user_id,
        p_correlation_id,
        p_payload->>'target_reference'
      );
      UPDATE public.bn_mortality_event SET row_version = row_version + 1, updated_by = p_actor_user_id WHERE id = v_new_entity RETURNING * INTO v_row;

    ELSE
      IF v_to IS NOT NULL AND p_command_name NOT IN ('BN_MORTALITY_DRAFT_SAVE','BN_MORTALITY_REGISTER_REPORT') THEN
        UPDATE public.bn_mortality_event SET
          status = v_to,
          row_version = row_version + 1,
          updated_by = p_actor_user_id,
          reported_at = COALESCE(reported_at, CASE WHEN v_to = 'REPORTED' THEN v_now END),
          submitted_for_verification_at = COALESCE(submitted_for_verification_at, CASE WHEN v_to = 'VERIFICATION_PENDING' THEN v_now END),
          confirmed_at = COALESCE(confirmed_at, CASE WHEN v_to = 'VERIFIED' THEN v_now END),
          completed_at = COALESCE(completed_at, CASE WHEN v_to = 'COMPLETED' THEN v_now END),
          closed_at = COALESCE(closed_at, CASE WHEN v_to = 'CLOSED' THEN v_now END),
          reversed_at = COALESCE(reversed_at, CASE WHEN v_to = 'REVERSED' THEN v_now END)
        WHERE id = v_new_entity RETURNING * INTO v_row;
      END IF;
  END CASE;

  -- Immutable history
  INSERT INTO public.bn_mortality_event_history(event_id, event_type, from_status, to_status, actor_user_id, actor_user_code, occurred_at, correlation_id, reason_code, payload_json)
  VALUES (v_new_entity, p_command_name, v_from, v_to, p_actor_user_id, p_actor_user_code, v_now, p_correlation_id, p_reason_code, p_payload);

  v_data := jsonb_build_object(
    'entity_id', v_new_entity,
    'entity_version', v_row.row_version,
    'status', v_row.status,
    'from_status', v_from,
    'to_status', v_to,
    'occurred_at', v_now
  );
  RETURN v_data;
END;
$function$;

-- 2. Atomic idempotency reservation columns ----------------------------------
ALTER TABLE public.bn_mortality_command_idempotency
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'COMPLETED'
    CHECK (status IN ('PENDING','COMPLETED','FAILED')),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS actor_user_id uuid;

-- Existing rows are historic completions; leave status='COMPLETED'.
-- 3. Server-side permission helper -------------------------------------------
--    Returns a jsonb decision so the edge function receives a structured
--    reason code rather than swallowing details. Admin does NOT bypass
--    actions_enabled=false — mutation is refused for the live pilot module.
CREATE OR REPLACE FUNCTION public.bn_mortality_check_actor_permission(
  p_actor_user_id uuid,
  p_action_name   text,
  p_is_mutation   boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_module        public.app_modules%ROWTYPE;
  v_action_id     uuid;
  v_action_enabled boolean;
  v_has_grant     boolean;
BEGIN
  SELECT * INTO v_module FROM public.app_modules WHERE name = 'bn_mortality';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MODULE_NOT_REGISTERED');
  END IF;
  IF NOT v_module.is_enabled THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MODULE_DISABLED');
  END IF;
  IF NOT COALESCE(v_module.routes_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ROUTES_DISABLED');
  END IF;
  IF p_is_mutation AND NOT COALESCE(v_module.actions_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ACTIONS_DISABLED');
  END IF;

  SELECT id, is_enabled INTO v_action_id, v_action_enabled
    FROM public.module_actions
   WHERE module_id = v_module.id AND action_name = p_action_name;
  IF v_action_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ACTION_UNREGISTERED');
  END IF;
  IF NOT COALESCE(v_action_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ACTION_DISABLED');
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.role_permissions rp
      JOIN public.user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = p_actor_user_id
       AND rp.module_action_id = v_action_id
       AND COALESCE(rp.is_granted, true) = true
  ) INTO v_has_grant;

  IF NOT v_has_grant THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CAPABILITY_DENIED');
  END IF;

  RETURN jsonb_build_object('ok', true, 'code', 'PERMITTED',
    'module_id', v_module.id, 'action_id', v_action_id);
END;
$function$;

-- 4. Explicit maker registry — so checker commands compare against the
--    actual maker for the relevant stage, not "the most recent history row".
CREATE TABLE IF NOT EXISTS public.bn_mortality_command_maker (
  event_id       uuid NOT NULL REFERENCES public.bn_mortality_event(id) ON DELETE CASCADE,
  maker_role     text NOT NULL,
  maker_user_id  uuid NOT NULL,
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  correlation_id uuid,
  PRIMARY KEY (event_id, maker_role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_mortality_command_maker TO service_role;

COMMENT ON FUNCTION public.bn_mortality_check_actor_permission IS
  'BN-MORT-2B.1: server-side authorisation for mortality edge functions. Admin does NOT bypass actions_enabled=false.';
COMMENT ON TABLE  public.bn_mortality_command_maker IS
  'BN-MORT-2B.1: explicit maker identity per event stage for deterministic maker-checker enforcement.';
