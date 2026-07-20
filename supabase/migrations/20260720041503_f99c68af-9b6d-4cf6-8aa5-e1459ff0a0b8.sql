
-- Idempotency cache scoped to Mortality commands
CREATE TABLE IF NOT EXISTS public.bn_mortality_command_idempotency (
  idempotency_key uuid NOT NULL,
  command_name text NOT NULL,
  payload_hash text NOT NULL,
  entity_id uuid,
  entity_version bigint,
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idempotency_key, command_name)
);
GRANT ALL ON public.bn_mortality_command_idempotency TO service_role;
REVOKE ALL ON public.bn_mortality_command_idempotency FROM authenticated, anon;

-- Draft support: allow status = DRAFT rows to exist without other fields.
-- Already covered by existing CHECK constraint (status includes DRAFT).

-- Canonical command executor. Runs entirely inside a single transaction.
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
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.bn_mortality_event%ROWTYPE;
  v_from text;
  v_to text;
  v_now timestamptz := now();
  v_data jsonb := '{}'::jsonb;
  v_new_entity uuid := p_entity_id;
BEGIN
  -- Determine target state per command
  -- Simple state-only commands
  CASE p_command_name
    WHEN 'BN_MORTALITY_DRAFT_SAVE'                   THEN v_to := 'DRAFT';
    WHEN 'BN_MORTALITY_REGISTER_REPORT'              THEN v_to := 'REPORTED';
    WHEN 'BN_MORTALITY_CANCEL'                       THEN v_to := 'CANCELLED';
    WHEN 'BN_MORTALITY_MATCH_PERSON'                 THEN v_to := NULL;  -- stays same
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
    WHEN 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT' THEN v_to := 'FOLLOW_ON_PROCESSING';
    WHEN 'BN_MORTALITY_INITIATE_FUNERAL_GRANT'       THEN v_to := 'FOLLOW_ON_PROCESSING';
    WHEN 'BN_MORTALITY_COMPLETE_FOLLOWON'            THEN v_to := 'COMPLETED';
    WHEN 'BN_MORTALITY_REFER_LEGAL'                  THEN v_to := 'FOLLOW_ON_PROCESSING';
    WHEN 'BN_MORTALITY_REVERSE_CONFIRMATION'         THEN v_to := 'REVERSED';
    WHEN 'BN_MORTALITY_CLOSE_EVENT'                  THEN v_to := 'CLOSED';
    ELSE
      RAISE EXCEPTION 'COMMAND_UNKNOWN:%', p_command_name USING ERRCODE = 'P0001';
  END CASE;

  -- Registration/Draft may create a new row when entity_id is null
  IF p_entity_id IS NULL THEN
    IF p_command_name NOT IN ('BN_MORTALITY_DRAFT_SAVE','BN_MORTALITY_REGISTER_REPORT') THEN
      RAISE EXCEPTION 'ENTITY_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.bn_mortality_event (
      event_reference, status, source,
      deceased_full_name, deceased_national_id, deceased_dob, deceased_gender,
      death_date, death_time, death_place, death_cause,
      reporter_name, reporter_relationship, reporter_contact,
      registrar_reference, metadata_json, reported_at, correlation_id, created_by
    ) VALUES (
      COALESCE(p_payload->>'event_reference', 'MORT-' || to_char(v_now,'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,4)),
      v_to,
      COALESCE(p_payload->>'source','STAFF_ENTRY'),
      COALESCE(p_payload->>'deceased_full_name','UNKNOWN'),
      p_payload->>'deceased_national_id',
      NULLIF(p_payload->>'deceased_dob','')::date,
      p_payload->>'deceased_gender',
      NULLIF(p_payload->>'death_date','')::date,
      NULLIF(p_payload->>'death_time','')::time,
      p_payload->>'death_place',
      p_payload->>'death_cause',
      p_payload->>'reporter_name',
      p_payload->>'reporter_relationship',
      p_payload->>'reporter_contact',
      p_payload->>'registrar_reference',
      COALESCE(p_payload->'metadata_json','{}'::jsonb),
      CASE WHEN v_to = 'REPORTED' THEN v_now ELSE NULL END,
      p_correlation_id,
      p_actor_user_id
    )
    RETURNING * INTO v_row;
    v_new_entity := v_row.id;
    v_from := NULL;
  ELSE
    SELECT * INTO v_row FROM public.bn_mortality_event WHERE id = p_entity_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ENTITY_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    IF p_expected_row_version IS NOT NULL AND v_row.row_version <> p_expected_row_version THEN
      RAISE EXCEPTION 'ROW_VERSION_CONFLICT:expected=%,actual=%', p_expected_row_version, v_row.row_version USING ERRCODE = 'P0001';
    END IF;

    v_from := v_row.status;

    -- Reject any change on terminal states except history-only reads
    IF v_row.status IN ('CLOSED','DUPLICATE','CANCELLED') THEN
      RAISE EXCEPTION 'STATE_TERMINAL:%', v_row.status USING ERRCODE = 'P0001';
    END IF;

    -- Validate transition matrix (only when we're actually moving states)
    IF v_to IS NOT NULL AND v_to <> v_row.status THEN
      IF NOT (
        (v_from = 'DRAFT' AND v_to IN ('REPORTED','CANCELLED','DRAFT')) OR
        (v_from = 'REPORTED' AND v_to IN ('MATCHED','VERIFICATION_PENDING','DUPLICATE','REJECTED','CONFLICT','CANCELLED')) OR
        (v_from = 'MATCHED' AND v_to IN ('VERIFICATION_PENDING','CONFLICT','REJECTED','DUPLICATE')) OR
        (v_from = 'VERIFICATION_PENDING' AND v_to IN ('PROVISIONALLY_HELD','VERIFIED','CONFLICT','REJECTED','CANCELLED')) OR
        (v_from = 'PROVISIONALLY_HELD' AND v_to IN ('VERIFICATION_PENDING','VERIFIED','CONFLICT','REJECTED','CANCELLED')) OR
        (v_from = 'CONFLICT' AND v_to IN ('VERIFICATION_PENDING','REJECTED','CANCELLED')) OR
        (v_from = 'VERIFIED' AND v_to IN ('IMPACT_REVIEW','REVERSED')) OR
        (v_from = 'IMPACT_REVIEW' AND v_to IN ('APPROVAL_PENDING','CONFLICT','REVERSED')) OR
        (v_from = 'APPROVAL_PENDING' AND v_to IN ('CONFIRMED','IMPACT_REVIEW','REJECTED')) OR
        (v_from = 'CONFIRMED' AND v_to IN ('FOLLOW_ON_PROCESSING','REVERSED')) OR
        (v_from = 'FOLLOW_ON_PROCESSING' AND v_to IN ('COMPLETED','REVERSED')) OR
        (v_from = 'COMPLETED' AND v_to IN ('CLOSED','REVERSED')) OR
        (v_from = 'REVERSED' AND v_to = 'CLOSED') OR
        (v_from = 'REJECTED' AND v_to = 'CLOSED')
      ) THEN
        RAISE EXCEPTION 'STATE_INVALID_TRANSITION:%->%', v_from, v_to USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  -- Apply command-specific side effects
  CASE p_command_name
    WHEN 'BN_MORTALITY_MATCH_PERSON' THEN
      UPDATE public.bn_mortality_event SET
        matched_ip_id = COALESCE((p_payload->>'ip_id')::bigint, matched_ip_id),
        match_confidence = COALESCE(p_payload->>'confidence', match_confidence),
        match_score = COALESCE((p_payload->>'score')::numeric, match_score),
        matched_at = v_now,
        matched_by = p_actor_user_id,
        row_version = row_version + 1,
        updated_by = p_actor_user_id,
        status = CASE WHEN status = 'REPORTED' THEN 'MATCHED' ELSE status END
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_MARK_DUPLICATE' THEN
      UPDATE public.bn_mortality_event SET
        status = 'DUPLICATE',
        duplicate_of_event_id = NULLIF(p_payload->>'duplicate_of_event_id','')::uuid,
        closed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_ASSIGN' THEN
      UPDATE public.bn_mortality_event SET
        assigned_to = NULLIF(p_payload->>'assigned_to','')::uuid,
        assigned_workbasket_id = NULLIF(p_payload->>'workbasket_id','')::uuid,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_ATTACH_EVIDENCE' THEN
      UPDATE public.bn_mortality_event SET
        metadata_json = jsonb_set(
          COALESCE(metadata_json,'{}'::jsonb),
          '{evidence}',
          COALESCE(metadata_json->'evidence','[]'::jsonb) || COALESCE(p_payload->'evidence', to_jsonb(p_payload))
        ),
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        submitted_for_verification_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        provisional_hold_at = v_now,
        provisional_hold_by = p_actor_user_id,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_RECORD_CONFLICT' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        conflict_reason = p_payload->>'reason',
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_CONFIRM_VERIFICATION' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        verified_at = v_now,
        verified_by = p_actor_user_id,
        verification_source = COALESCE(p_payload->>'source', verification_source),
        verification_reference = COALESCE(p_payload->>'reference', verification_reference),
        verification_confidence = COALESCE(p_payload->>'confidence', 'CORROBORATED'),
        verification_notes = COALESCE(p_payload->>'notes', verification_notes),
        confirmed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_REJECT_REPORT' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        rejected_reason = p_payload->>'reason',
        closed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_APPROVE_IMPACT','BN_MORTALITY_TERMINATE_AWARD' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;
      -- Approve related impact rows
      UPDATE public.bn_mortality_award_impact SET
        approval_state = CASE WHEN p_command_name = 'BN_MORTALITY_APPROVE_IMPACT' THEN 'APPROVED' ELSE approval_state END,
        approved_at = CASE WHEN p_command_name = 'BN_MORTALITY_APPROVE_IMPACT' THEN v_now ELSE approved_at END,
        approved_by = CASE WHEN p_command_name = 'BN_MORTALITY_APPROVE_IMPACT' THEN p_actor_user_id ELSE approved_by END,
        termination_status = CASE WHEN p_command_name = 'BN_MORTALITY_TERMINATE_AWARD' AND termination_required THEN 'COMPLETED' ELSE termination_status END,
        termination_effective_date = CASE WHEN p_command_name = 'BN_MORTALITY_TERMINATE_AWARD' AND termination_required THEN COALESCE(termination_effective_date, v_now::date) ELSE termination_effective_date END,
        impact_status = CASE WHEN p_command_name = 'BN_MORTALITY_APPROVE_IMPACT' THEN 'APPROVED' ELSE impact_status END,
        row_version = row_version + 1
      WHERE event_id = v_new_entity;

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
        p_payload->>'target_ref_id',
        p_actor_user_id,
        p_correlation_id,
        p_payload->>'target_reference'
      );
      UPDATE public.bn_mortality_event SET
        status = v_to,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_REVERSE_CONFIRMATION' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        reversed_at = v_now,
        reversal_reason = p_payload->>'reason',
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_COMPLETE_FOLLOWON' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        completed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_CLOSE_EVENT' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        closed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_CANCEL' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        closed_at = v_now,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    WHEN 'BN_MORTALITY_DRAFT_SAVE' THEN
      IF p_entity_id IS NOT NULL THEN
        UPDATE public.bn_mortality_event SET
          deceased_full_name = COALESCE(p_payload->>'deceased_full_name', deceased_full_name),
          deceased_national_id = COALESCE(p_payload->>'deceased_national_id', deceased_national_id),
          deceased_dob = COALESCE(NULLIF(p_payload->>'deceased_dob','')::date, deceased_dob),
          death_date = COALESCE(NULLIF(p_payload->>'death_date','')::date, death_date),
          death_place = COALESCE(p_payload->>'death_place', death_place),
          death_cause = COALESCE(p_payload->>'death_cause', death_cause),
          reporter_name = COALESCE(p_payload->>'reporter_name', reporter_name),
          metadata_json = COALESCE(metadata_json,'{}'::jsonb) || COALESCE(p_payload->'metadata_json','{}'::jsonb),
          row_version = row_version + 1,
          updated_by = p_actor_user_id
        WHERE id = v_new_entity RETURNING * INTO v_row;
      END IF;

    WHEN 'BN_MORTALITY_REGISTER_REPORT' THEN
      IF p_entity_id IS NOT NULL THEN
        UPDATE public.bn_mortality_event SET
          status = v_to,
          reported_at = COALESCE(reported_at, v_now),
          row_version = row_version + 1,
          updated_by = p_actor_user_id
        WHERE id = v_new_entity RETURNING * INTO v_row;
      END IF;

    WHEN 'BN_MORTALITY_RELEASE_HOLD',
         'BN_MORTALITY_RESOLVE_CONFLICT',
         'BN_MORTALITY_PREPARE_IMPACT',
         'BN_MORTALITY_SUBMIT_IMPACT',
         'BN_MORTALITY_RETURN_IMPACT' THEN
      UPDATE public.bn_mortality_event SET
        status = v_to,
        row_version = row_version + 1,
        updated_by = p_actor_user_id
      WHERE id = v_new_entity RETURNING * INTO v_row;

    ELSE
      -- no-op default
      NULL;
  END CASE;

  -- Immutable history
  INSERT INTO public.bn_mortality_event_history(
    event_id, from_status, to_status, command_name, correlation_id,
    actor_user_id, actor_user_code, reason_code, justification, payload_hash
  ) VALUES (
    v_new_entity, v_from, COALESCE(v_to, v_row.status), p_command_name, p_correlation_id,
    p_actor_user_id, p_actor_user_code, p_reason_code, p_justification, p_payload_hash
  );

  v_data := jsonb_build_object(
    'entity_id', v_new_entity,
    'entity_version', v_row.row_version,
    'status', v_row.status,
    'event_reference', v_row.event_reference,
    'updated_at', v_row.updated_at
  );
  RETURN v_data;
END;
$$;

REVOKE ALL ON FUNCTION public.bn_mortality_execute_command(text,uuid,uuid,text,uuid,bigint,text,text,jsonb,text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bn_mortality_execute_command(text,uuid,uuid,text,uuid,bigint,text,text,jsonb,text) TO service_role;
