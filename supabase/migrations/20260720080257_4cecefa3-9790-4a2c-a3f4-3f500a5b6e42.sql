
-- ============================================================================
-- BN-MORT-2B.2A — Transactional Award servicing orchestration
-- ============================================================================

-- 1. Affected-item tracking table -------------------------------------------

CREATE TABLE IF NOT EXISTS public.bn_award_servicing_affected_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servicing_idempotency_id uuid NOT NULL
    REFERENCES public.bn_award_servicing_idempotency(id) ON DELETE RESTRICT,
  bn_award_id uuid NOT NULL,
  item_type text NOT NULL,
  item_id uuid NOT NULL,
  prior_status text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  release_idempotency_id uuid REFERENCES public.bn_award_servicing_idempotency(id),
  CONSTRAINT bn_award_servicing_affected_item_type_ck
    CHECK (item_type IN ('SCHEDULE','INSTRUCTION'))
);

CREATE INDEX IF NOT EXISTS ix_bn_award_servicing_affected_item_by_idem
  ON public.bn_award_servicing_affected_item(servicing_idempotency_id);
CREATE INDEX IF NOT EXISTS ix_bn_award_servicing_affected_item_by_item
  ON public.bn_award_servicing_affected_item(item_type, item_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_award_servicing_affected_open
  ON public.bn_award_servicing_affected_item(item_type, item_id)
  WHERE released_at IS NULL;

-- No direct access — servicing RPCs (SECURITY DEFINER) only.
REVOKE ALL ON public.bn_award_servicing_affected_item FROM PUBLIC;
REVOKE ALL ON public.bn_award_servicing_affected_item FROM authenticated;
REVOKE ALL ON public.bn_award_servicing_affected_item FROM anon;
GRANT ALL ON public.bn_award_servicing_affected_item TO service_role;

-- 2. Revoke direct authenticated access to idempotency map (§G) -------------

REVOKE ALL ON public.bn_award_servicing_idempotency FROM authenticated;
REVOKE ALL ON public.bn_award_servicing_idempotency FROM anon;
GRANT ALL ON public.bn_award_servicing_idempotency TO service_role;

-- Add payload-hash column so replay-mismatch detection is real.
ALTER TABLE public.bn_award_servicing_idempotency
  ADD COLUMN IF NOT EXISTS payload_hash text,
  ADD COLUMN IF NOT EXISTS effective_date date;

-- 3. Impact table — add applied_at ------------------------------------------

ALTER TABLE public.bn_mortality_award_impact
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

-- 4. Rewrite bn_awards_apply_servicing_event --------------------------------

CREATE OR REPLACE FUNCTION public.bn_awards_apply_servicing_event(
  p_award_id uuid,
  p_action text,
  p_effective_date date,
  p_source_module text,
  p_source_event_id uuid,
  p_source_impact_id uuid,
  p_correlation_id uuid,
  p_idempotency_key uuid,
  p_actor_user_id uuid,
  p_reason_code text DEFAULT NULL,
  p_justification text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_award public.bn_award%ROWTYPE;
  v_prior_status text;
  v_new_status text;
  v_servicing_event_id uuid;
  v_reference text;
  v_existing public.bn_award_servicing_idempotency%ROWTYPE;
  v_idem_id uuid;
  v_susp_id uuid;
  v_status_evt_id uuid;
  v_actor_code text := COALESCE(p_actor_user_id::text, 'SERVICE');
  v_payload_hash text;
  v_now timestamptz := now();
  v_affected_schedule_count int := 0;
  v_affected_instruction_count int := 0;
  v_other_hold_count int := 0;
  v_final_status text;
  v_release_result text;
BEGIN
  IF p_action NOT IN ('HOLD','RELEASE','TERMINATE') THEN
    RAISE EXCEPTION 'SERVICING_ACTION_INVALID:%', p_action;
  END IF;
  IF p_award_id IS NULL OR p_source_module IS NULL OR p_source_event_id IS NULL THEN
    RAISE EXCEPTION 'SERVICING_INPUT_INVALID';
  END IF;

  v_payload_hash := md5(
    p_award_id::text || '|' || p_action || '|' ||
    COALESCE(p_effective_date::text,'') || '|' ||
    p_source_module || '|' || p_source_event_id::text || '|' ||
    COALESCE(p_source_impact_id::text,'') || '|' ||
    COALESCE(p_reason_code,'') || '|' || COALESCE(p_justification,'')
  );

  -- Atomic idempotency reservation.
  INSERT INTO public.bn_award_servicing_idempotency(
    bn_award_id, source_module, source_event_id, source_impact_id, action,
    servicing_event_id, servicing_reference, correlation_id, idempotency_key,
    result_status, created_by, payload_hash, effective_date
  ) VALUES (
    p_award_id, p_source_module, p_source_event_id, p_source_impact_id, p_action,
    NULL, NULL, p_correlation_id, p_idempotency_key,
    'IN_FLIGHT', p_actor_user_id, v_payload_hash, p_effective_date
  )
  ON CONFLICT ON CONSTRAINT ux_bn_award_servicing_idem DO NOTHING
  RETURNING id INTO v_idem_id;

  IF v_idem_id IS NULL THEN
    SELECT * INTO v_existing FROM public.bn_award_servicing_idempotency
     WHERE bn_award_id = p_award_id
       AND source_module = p_source_module
       AND source_event_id = p_source_event_id
       AND source_impact_id IS NOT DISTINCT FROM p_source_impact_id
       AND action = p_action
     LIMIT 1;

    IF v_existing.payload_hash IS NOT NULL
       AND v_existing.payload_hash <> v_payload_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_PAYLOAD_MISMATCH:%', v_existing.id;
    END IF;

    IF v_existing.result_status = 'IN_FLIGHT' THEN
      RAISE EXCEPTION 'IDEMPOTENCY_IN_FLIGHT:%', v_existing.id;
    END IF;

    SELECT status INTO v_final_status FROM public.bn_award WHERE id = p_award_id;
    RETURN jsonb_build_object(
      'status', 'REPLAYED',
      'servicing_event_id', v_existing.servicing_event_id,
      'servicing_reference', v_existing.servicing_reference,
      'award_status', v_final_status,
      'action', p_action,
      'idempotency_id', v_existing.id
    );
  END IF;

  -- Lock the award.
  SELECT * INTO v_award FROM public.bn_award WHERE id = p_award_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AWARD_NOT_FOUND:%', p_award_id;
  END IF;

  v_prior_status := v_award.status;

  ---------------------------------------------------------------------------
  IF p_action = 'HOLD' THEN
    IF v_prior_status NOT IN ('ACTIVE') THEN
      RAISE EXCEPTION 'AWARD_NOT_HOLDABLE:%', v_prior_status;
    END IF;

    INSERT INTO public.bn_award_suspension_event(
      bn_award_id, suspension_type, suspended_from, reason_code, reason_text,
      status, proposed_by_user_id, correlation_id, entered_by, modified_by
    ) VALUES (
      p_award_id, 'MORTALITY', p_effective_date, COALESCE(p_reason_code,'DEATH'),
      p_justification, 'APPROVED', p_actor_user_id, p_correlation_id::text,
      v_actor_code, v_actor_code
    )
    RETURNING id INTO v_susp_id;

    v_servicing_event_id := v_susp_id;
    v_reference := 'SUSP-' || substr(v_susp_id::text, 1, 8);
    v_new_status := 'SUSPENDED';

    INSERT INTO public.bn_award_status_event(
      bn_award_id, from_status, to_status, reason_code, remarks, entered_by
    ) VALUES (
      p_award_id, v_prior_status, v_new_status, COALESCE(p_reason_code,'MORT_HOLD'),
      p_justification, v_actor_code
    ) RETURNING id INTO v_status_evt_id;

    UPDATE public.bn_award
       SET status = v_new_status, modified_by = v_actor_code, modified_at = v_now
     WHERE id = p_award_id;

    -- Record affected pending future schedules; move them to HELD, not CANCELLED.
    INSERT INTO public.bn_award_servicing_affected_item(
      servicing_idempotency_id, bn_award_id, item_type, item_id, prior_status
    )
    SELECT v_idem_id, p_award_id, 'SCHEDULE', s.id, s.status
      FROM public.bn_payment_schedule s
     WHERE s.bn_award_id = p_award_id
       AND s.status = 'PENDING'
       AND s.due_date >= p_effective_date;

    GET DIAGNOSTICS v_affected_schedule_count = ROW_COUNT;

    UPDATE public.bn_payment_schedule s
       SET status = 'HELD',
           modified_by = v_actor_code, modified_at = v_now,
           notes = COALESCE(s.notes,'') || ' [mortality-hold ' || v_idem_id::text || ']'
     WHERE s.id IN (SELECT item_id FROM public.bn_award_servicing_affected_item
                     WHERE servicing_idempotency_id = v_idem_id AND item_type = 'SCHEDULE');

    -- Record and hold unpaid instructions; use existing hold_* columns.
    INSERT INTO public.bn_award_servicing_affected_item(
      servicing_idempotency_id, bn_award_id, item_type, item_id, prior_status
    )
    SELECT v_idem_id, p_award_id, 'INSTRUCTION', i.id, i.status
      FROM public.bn_payment_instruction i
     WHERE i.award_id = p_award_id
       AND i.status IN ('queued','pending','draft')
       AND i.due_date >= p_effective_date;

    GET DIAGNOSTICS v_affected_instruction_count = ROW_COUNT;

    UPDATE public.bn_payment_instruction i
       SET status = 'hold',
           hold_reason = 'MORTALITY_HOLD',
           hold_by = v_actor_code, hold_at = v_now,
           modified_by = v_actor_code, modified_at = v_now, updated_at = v_now
     WHERE i.id IN (SELECT item_id FROM public.bn_award_servicing_affected_item
                     WHERE servicing_idempotency_id = v_idem_id AND item_type = 'INSTRUCTION');

  ---------------------------------------------------------------------------
  ELSIF p_action = 'RELEASE' THEN
    -- Find the specific HOLD created by this exact source.
    SELECT * INTO v_existing
      FROM public.bn_award_servicing_idempotency
     WHERE bn_award_id = p_award_id
       AND source_module = p_source_module
       AND source_event_id = p_source_event_id
       AND source_impact_id IS NOT DISTINCT FROM p_source_impact_id
       AND action = 'HOLD'
       AND result_status = 'APPLIED'
     LIMIT 1;

    IF NOT FOUND THEN
      -- No matching hold — record NOTHING_TO_RELEASE and return truthfully.
      UPDATE public.bn_award_servicing_idempotency
         SET result_status = 'NOTHING_TO_RELEASE',
             servicing_reference = 'NOOP-' || substr(v_idem_id::text,1,8)
       WHERE id = v_idem_id;

      RETURN jsonb_build_object(
        'status','NOTHING_TO_RELEASE',
        'servicing_event_id', NULL,
        'servicing_reference', 'NOOP-' || substr(v_idem_id::text,1,8),
        'award_status', v_prior_status,
        'action','RELEASE',
        'idempotency_id', v_idem_id
      );
    END IF;

    v_susp_id := v_existing.servicing_event_id;

    -- Restore only items affected by *this* hold that are still open.
    UPDATE public.bn_payment_schedule s
       SET status = a.prior_status, modified_by = v_actor_code, modified_at = v_now
      FROM public.bn_award_servicing_affected_item a
     WHERE a.servicing_idempotency_id = v_existing.id
       AND a.item_type = 'SCHEDULE'
       AND a.released_at IS NULL
       AND s.id = a.item_id
       AND s.status = 'HELD';

    GET DIAGNOSTICS v_affected_schedule_count = ROW_COUNT;

    UPDATE public.bn_payment_instruction i
       SET status = a.prior_status,
           hold_reason = NULL, hold_by = NULL, hold_at = NULL,
           modified_by = v_actor_code, modified_at = v_now, updated_at = v_now
      FROM public.bn_award_servicing_affected_item a
     WHERE a.servicing_idempotency_id = v_existing.id
       AND a.item_type = 'INSTRUCTION'
       AND a.released_at IS NULL
       AND i.id = a.item_id
       AND i.status = 'hold';

    GET DIAGNOSTICS v_affected_instruction_count = ROW_COUNT;

    UPDATE public.bn_award_servicing_affected_item
       SET released_at = v_now, release_idempotency_id = v_idem_id
     WHERE servicing_idempotency_id = v_existing.id
       AND released_at IS NULL;

    -- Close the suspension event.
    UPDATE public.bn_award_suspension_event
       SET status = 'RESUMED', resumed_at = v_now, resumed_by = v_actor_code,
           modified_by = v_actor_code, modified_at = v_now, suspended_to = p_effective_date
     WHERE id = v_susp_id AND status IN ('ACTIVE','APPROVED','PROPOSED');

    -- Check for OTHER active mortality/compliance/manual holds on this award.
    SELECT COUNT(*) INTO v_other_hold_count
      FROM public.bn_award_suspension_event
     WHERE bn_award_id = p_award_id
       AND status IN ('ACTIVE','APPROVED','PROPOSED')
       AND id <> v_susp_id;

    IF v_other_hold_count > 0 THEN
      v_new_status := 'SUSPENDED';
      v_release_result := 'MORTALITY_HOLD_RELEASED_OTHER_HOLD_REMAINS';
    ELSIF v_prior_status = 'TERMINATED' THEN
      v_new_status := 'TERMINATED';
      v_release_result := 'MORTALITY_HOLD_RELEASED_AWARD_TERMINATED';
    ELSE
      v_new_status := 'ACTIVE';
      v_release_result := 'RELEASED_AND_ACTIVE';
      INSERT INTO public.bn_award_status_event(
        bn_award_id, from_status, to_status, reason_code, remarks, entered_by
      ) VALUES (
        p_award_id, v_prior_status, v_new_status, COALESCE(p_reason_code,'MORT_RELEASE'),
        p_justification, v_actor_code
      );
      UPDATE public.bn_award
         SET status = v_new_status, modified_by = v_actor_code, modified_at = v_now
       WHERE id = p_award_id;
    END IF;

    v_servicing_event_id := v_susp_id;
    v_reference := 'REL-' || substr(v_susp_id::text, 1, 8);

    UPDATE public.bn_award_servicing_idempotency
       SET result_status = v_release_result,
           servicing_event_id = v_servicing_event_id,
           servicing_reference = v_reference
     WHERE id = v_idem_id;

    RETURN jsonb_build_object(
      'status', v_release_result,
      'servicing_event_id', v_servicing_event_id,
      'servicing_reference', v_reference,
      'award_status', v_new_status,
      'prior_status', v_prior_status,
      'action', 'RELEASE',
      'idempotency_id', v_idem_id,
      'schedules_restored', v_affected_schedule_count,
      'instructions_restored', v_affected_instruction_count,
      'other_holds_remaining', v_other_hold_count
    );

  ---------------------------------------------------------------------------
  ELSIF p_action = 'TERMINATE' THEN
    IF v_prior_status = 'TERMINATED' THEN
      RAISE EXCEPTION 'AWARD_ALREADY_TERMINATED';
    END IF;

    v_new_status := 'TERMINATED';

    INSERT INTO public.bn_award_status_event(
      bn_award_id, from_status, to_status, reason_code, remarks, entered_by
    ) VALUES (
      p_award_id, v_prior_status, v_new_status, COALESCE(p_reason_code,'MORT_TERMINATE'),
      p_justification, v_actor_code
    ) RETURNING id INTO v_status_evt_id;

    v_servicing_event_id := v_status_evt_id;
    v_reference := 'TERM-' || substr(v_status_evt_id::text, 1, 8);

    -- Resume any lingering suspensions to keep servicing state coherent.
    UPDATE public.bn_award_suspension_event
       SET status = 'RESUMED', resumed_at = v_now, resumed_by = v_actor_code,
           modified_by = v_actor_code, modified_at = v_now, suspended_to = p_effective_date
     WHERE bn_award_id = p_award_id
       AND status IN ('ACTIVE','APPROVED','PROPOSED');

    -- End date: earliest of (existing end_date, effective_date). Never extend a legitimate earlier end date.
    UPDATE public.bn_award
       SET status = v_new_status,
           end_date = LEAST(
             COALESCE(v_award.end_date, p_effective_date),
             p_effective_date
           ),
           modified_by = v_actor_code, modified_at = v_now
     WHERE id = p_award_id;

    -- Record affected schedules; move to CANCELLED (termination is permanent).
    INSERT INTO public.bn_award_servicing_affected_item(
      servicing_idempotency_id, bn_award_id, item_type, item_id, prior_status
    )
    SELECT v_idem_id, p_award_id, 'SCHEDULE', s.id, s.status
      FROM public.bn_payment_schedule s
     WHERE s.bn_award_id = p_award_id
       AND s.status IN ('PENDING','HELD')
       AND s.due_date >= p_effective_date;

    GET DIAGNOSTICS v_affected_schedule_count = ROW_COUNT;

    UPDATE public.bn_payment_schedule s
       SET status = 'CANCELLED', modified_by = v_actor_code, modified_at = v_now,
           notes = COALESCE(s.notes,'') || ' [mortality-terminate ' || v_idem_id::text || ']'
     WHERE s.id IN (SELECT item_id FROM public.bn_award_servicing_affected_item
                     WHERE servicing_idempotency_id = v_idem_id AND item_type = 'SCHEDULE');

    INSERT INTO public.bn_award_servicing_affected_item(
      servicing_idempotency_id, bn_award_id, item_type, item_id, prior_status
    )
    SELECT v_idem_id, p_award_id, 'INSTRUCTION', i.id, i.status
      FROM public.bn_payment_instruction i
     WHERE i.award_id = p_award_id
       AND i.status IN ('queued','pending','draft','hold')
       AND i.due_date >= p_effective_date;

    GET DIAGNOSTICS v_affected_instruction_count = ROW_COUNT;

    UPDATE public.bn_payment_instruction i
       SET status = 'cancelled', cancel_reason = 'MORTALITY_TERMINATE',
           modified_by = v_actor_code, modified_at = v_now, updated_at = v_now
     WHERE i.id IN (SELECT item_id FROM public.bn_award_servicing_affected_item
                     WHERE servicing_idempotency_id = v_idem_id AND item_type = 'INSTRUCTION');
  END IF;

  -- Finalise idempotency row for HOLD/TERMINATE (RELEASE returned earlier).
  UPDATE public.bn_award_servicing_idempotency
     SET result_status = 'APPLIED',
         servicing_event_id = v_servicing_event_id,
         servicing_reference = v_reference
   WHERE id = v_idem_id;

  RETURN jsonb_build_object(
    'status', 'APPLIED',
    'servicing_event_id', v_servicing_event_id,
    'servicing_reference', v_reference,
    'award_status', v_new_status,
    'prior_status', v_prior_status,
    'action', p_action,
    'idempotency_id', v_idem_id,
    'schedules_affected', v_affected_schedule_count,
    'instructions_affected', v_affected_instruction_count
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bn_awards_apply_servicing_event(uuid,text,date,text,uuid,uuid,uuid,uuid,uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_awards_apply_servicing_event(uuid,text,date,text,uuid,uuid,uuid,uuid,uuid,text,text) FROM authenticated;
REVOKE ALL ON FUNCTION public.bn_awards_apply_servicing_event(uuid,text,date,text,uuid,uuid,uuid,uuid,uuid,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.bn_awards_apply_servicing_event(uuid,text,date,text,uuid,uuid,uuid,uuid,uuid,text,text) TO service_role;

-- 5. Rewrite bn_mortality_prepare_impact -------------------------------------

CREATE OR REPLACE FUNCTION public.bn_mortality_prepare_impact(
  p_event_id uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_idempotency_key uuid,
  p_authorised_recalculation boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_event public.bn_mortality_event%ROWTYPE;
  v_ssn text;
  v_award RECORD;
  v_last_paid date;
  v_last_paid_inst date;
  v_future_count integer;
  v_pad_sched bigint;
  v_pad_instr bigint;
  v_pad_total bigint;
  v_action text;
  v_hold_req boolean;
  v_term_req boolean;
  v_upserts integer := 0;
  v_beneficiary integer := 0;
  v_hold_count integer := 0;
  v_term_count integer := 0;
  v_pad_recovery_count integer := 0;
  v_none_count integer := 0;
  v_warnings text[] := ARRAY[]::text[];
  v_impact_ids uuid[] := ARRAY[]::uuid[];
  v_impact_id uuid;
BEGIN
  SELECT * INTO v_event FROM public.bn_mortality_event WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MORTALITY_EVENT_NOT_FOUND:%', p_event_id;
  END IF;

  IF v_event.status NOT IN ('VERIFIED','IMPACT_REVIEW') THEN
    RAISE EXCEPTION 'PREPARE_IMPACT_STATE_INVALID:%', v_event.status;
  END IF;
  IF v_event.verified_at IS NULL THEN
    RAISE EXCEPTION 'PREPARE_IMPACT_NOT_VERIFIED';
  END IF;
  IF v_event.death_date IS NULL THEN
    RAISE EXCEPTION 'DEATH_DATE_REQUIRED';
  END IF;
  IF v_event.matched_ip_id IS NULL AND v_event.matched_person_ssn IS NULL THEN
    RAISE EXCEPTION 'MATCHED_PERSON_REQUIRED';
  END IF;

  -- Canonical SSN comes from the matched person identity, not from the raw
  -- deceased_national_id field.
  v_ssn := v_event.matched_person_ssn;
  IF v_ssn IS NULL AND v_event.matched_ip_id IS NOT NULL THEN
    SELECT ssn INTO v_ssn FROM public.ip_master WHERE id::text = v_event.matched_ip_id::text LIMIT 1;
  END IF;
  IF v_ssn IS NULL OR btrim(v_ssn) = '' THEN
    RAISE EXCEPTION 'MATCHED_PERSON_SSN_MISSING';
  END IF;

  FOR v_award IN
    SELECT id, bn_claim_id, status, base_amount, frequency, award_number, currency, end_date
      FROM public.bn_award
     WHERE ssn = v_ssn
  LOOP
    -- PAD from schedule.
    SELECT MAX(paid_at::date),
           COALESCE(SUM(CASE WHEN paid_at::date > v_event.death_date
                             THEN ROUND(gross_amount * 100)::bigint ELSE 0 END), 0)
      INTO v_last_paid, v_pad_sched
      FROM public.bn_payment_schedule
     WHERE bn_award_id = v_award.id AND status = 'PAID';

    -- PAD from instructions (canonical completed-payment source).
    SELECT MAX(paid_date),
           COALESCE(SUM(CASE WHEN paid_date > v_event.death_date
                             THEN ROUND(amount * 100)::bigint ELSE 0 END), 0)
      INTO v_last_paid_inst, v_pad_instr
      FROM public.bn_payment_instruction
     WHERE award_id = v_award.id AND status IN ('paid','completed','issued');

    v_pad_total := GREATEST(COALESCE(v_pad_sched,0), COALESCE(v_pad_instr,0));
    v_last_paid := GREATEST(COALESCE(v_last_paid, DATE '1900-01-01'),
                            COALESCE(v_last_paid_inst, DATE '1900-01-01'));

    SELECT COUNT(*) INTO v_future_count
      FROM public.bn_payment_schedule
     WHERE bn_award_id = v_award.id
       AND status IN ('PENDING','HELD')
       AND due_date > v_event.death_date;

    -- Classification.
    IF v_award.status = 'TERMINATED' THEN
      v_action := 'NONE';        v_hold_req := false; v_term_req := false;
      v_none_count := v_none_count + 1;
    ELSIF v_award.status = 'SUSPENDED' AND v_future_count = 0 AND v_pad_total = 0 THEN
      v_action := 'NONE';        v_hold_req := false; v_term_req := false;
      v_none_count := v_none_count + 1;
    ELSIF v_award.status = 'SUSPENDED' AND v_pad_total > 0 THEN
      v_action := 'PAD_RECOVERY'; v_hold_req := false; v_term_req := true;
      v_pad_recovery_count := v_pad_recovery_count + 1;
    ELSIF v_award.status = 'ACTIVE' AND v_pad_total > 0 THEN
      v_action := 'PAD_RECOVERY'; v_hold_req := true;  v_term_req := true;
      v_pad_recovery_count := v_pad_recovery_count + 1;
    ELSIF v_award.status = 'ACTIVE' AND v_future_count > 0 THEN
      v_action := 'TERMINATE';   v_hold_req := true;  v_term_req := true;
      v_term_count := v_term_count + 1;
    ELSIF v_award.status = 'ACTIVE' THEN
      v_action := 'TERMINATE';   v_hold_req := false; v_term_req := true;
      v_term_count := v_term_count + 1;
    ELSE
      v_action := 'HOLD';        v_hold_req := true;  v_term_req := false;
      v_hold_count := v_hold_count + 1;
    END IF;

    INSERT INTO public.bn_mortality_award_impact(
      event_id, bn_award_id, bn_claim_id, award_reference, action,
      effective_date, payment_after_death_minor, currency_code,
      approval_state, original_award_status, original_award_amount,
      payment_frequency, hold_required, hold_status, termination_required,
      termination_status, termination_effective_date, last_valid_payment_date,
      impact_decision, impact_status, estimated_pad_minor, future_schedule_count,
      beneficiary_link, integration_status, created_by, updated_by
    ) VALUES (
      p_event_id, v_award.id, v_award.bn_claim_id, v_award.award_number, v_action,
      v_event.death_date, v_pad_total, v_award.currency,
      'PENDING', v_award.status, ROUND(COALESCE(v_award.base_amount,0)*100)::bigint,
      v_award.frequency,
      v_hold_req, CASE WHEN v_hold_req THEN 'PENDING' ELSE 'NOT_REQUIRED' END,
      v_term_req, CASE WHEN v_term_req THEN 'PENDING' ELSE 'NOT_REQUIRED' END,
      v_event.death_date,
      CASE WHEN v_last_paid = DATE '1900-01-01' THEN NULL ELSE v_last_paid END,
      v_action, 'PENDING', v_pad_total, v_future_count,
      false, 'NONE', p_actor_user_id, p_actor_user_id
    )
    ON CONFLICT (event_id, bn_award_id) WHERE bn_award_id IS NOT NULL DO UPDATE
      SET action = CASE
            WHEN public.bn_mortality_award_impact.approval_state = 'APPROVED'
                 AND NOT p_authorised_recalculation
            THEN public.bn_mortality_award_impact.action
            ELSE EXCLUDED.action END,
          effective_date = CASE
            WHEN public.bn_mortality_award_impact.approval_state = 'APPROVED'
                 AND NOT p_authorised_recalculation
            THEN public.bn_mortality_award_impact.effective_date
            ELSE EXCLUDED.effective_date END,
          payment_after_death_minor = EXCLUDED.payment_after_death_minor,
          hold_required = CASE
            WHEN public.bn_mortality_award_impact.approval_state = 'APPROVED'
                 AND NOT p_authorised_recalculation
            THEN public.bn_mortality_award_impact.hold_required
            ELSE EXCLUDED.hold_required END,
          termination_required = CASE
            WHEN public.bn_mortality_award_impact.approval_state = 'APPROVED'
                 AND NOT p_authorised_recalculation
            THEN public.bn_mortality_award_impact.termination_required
            ELSE EXCLUDED.termination_required END,
          last_valid_payment_date = EXCLUDED.last_valid_payment_date,
          future_schedule_count   = EXCLUDED.future_schedule_count,
          estimated_pad_minor     = EXCLUDED.estimated_pad_minor,
          original_award_status   = EXCLUDED.original_award_status,
          payment_frequency       = EXCLUDED.payment_frequency,
          row_version = public.bn_mortality_award_impact.row_version + 1,
          updated_at = now(),
          updated_by = p_actor_user_id
    RETURNING id INTO v_impact_id;

    v_impact_ids := v_impact_ids || v_impact_id;
    v_upserts := v_upserts + 1;
  END LOOP;

  -- Awards where the deceased is a beneficiary (PRORATE).
  FOR v_award IN
    SELECT DISTINCT a.id, a.bn_claim_id, a.status, a.award_number, a.currency
      FROM public.bn_award_beneficiary b
      JOIN public.bn_award a ON a.id = b.bn_award_id
     WHERE b.beneficiary_ssn = v_ssn
       AND a.status IN ('ACTIVE','SUSPENDED')
       AND a.ssn <> v_ssn
  LOOP
    INSERT INTO public.bn_mortality_award_impact(
      event_id, bn_award_id, bn_claim_id, award_reference, action,
      effective_date, payment_after_death_minor, currency_code,
      approval_state, original_award_status,
      hold_required, hold_status, termination_required, termination_status,
      impact_decision, impact_status, beneficiary_link, integration_status,
      created_by, updated_by, notes
    ) VALUES (
      p_event_id, v_award.id, v_award.bn_claim_id, v_award.award_number, 'PRORATE',
      v_event.death_date, 0, v_award.currency,
      'PENDING', v_award.status,
      false, 'NOT_REQUIRED', false, 'NOT_REQUIRED',
      'PRORATE', 'PENDING', true, 'NONE',
      p_actor_user_id, p_actor_user_id,
      'Deceased was beneficiary; survivor share reallocation required.'
    )
    ON CONFLICT (event_id, bn_award_id) WHERE bn_award_id IS NOT NULL DO NOTHING
    RETURNING id INTO v_impact_id;
    IF v_impact_id IS NOT NULL THEN
      v_impact_ids := v_impact_ids || v_impact_id;
    END IF;
    v_beneficiary := v_beneficiary + 1;
  END LOOP;

  IF v_upserts = 0 AND v_beneficiary = 0 THEN
    v_warnings := v_warnings || 'NO_AFFECTED_AWARDS';
  END IF;

  UPDATE public.bn_mortality_event
     SET row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
   WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'event_id', p_event_id,
    'award_count', v_upserts,
    'hold_count', v_hold_count,
    'termination_count', v_term_count,
    'pad_recovery_count', v_pad_recovery_count,
    'none_count', v_none_count,
    'beneficiary_count', v_beneficiary,
    'impact_ids', to_jsonb(v_impact_ids),
    'warnings', to_jsonb(v_warnings),
    'deceased_ssn', v_ssn,
    'death_date', v_event.death_date,
    'authorised_recalculation', p_authorised_recalculation
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.bn_mortality_prepare_impact(uuid,uuid,uuid,uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_mortality_prepare_impact(uuid,uuid,uuid,uuid,boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.bn_mortality_prepare_impact(uuid,uuid,uuid,uuid,boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.bn_mortality_prepare_impact(uuid,uuid,uuid,uuid,boolean) TO service_role;

-- 6. Rewrite _bn_mortality_dispatch_servicing --------------------------------

CREATE OR REPLACE FUNCTION public._bn_mortality_dispatch_servicing(
  p_command_name text,
  p_event_id uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_idempotency_key uuid,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_event public.bn_mortality_event%ROWTYPE;
  v_impact RECORD;
  v_result jsonb;
  v_effective date;
  v_attempted int := 0;
  v_applied   int := 0;
  v_replayed  int := 0;
  v_failed    int := 0;
  v_per_impact jsonb := '[]'::jsonb;
  v_row jsonb;
  v_hold_child uuid;
BEGIN
  SELECT * INTO v_event FROM public.bn_mortality_event WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MORTALITY_EVENT_NOT_FOUND:%', p_event_id;
  END IF;

  IF p_command_name = 'BN_MORTALITY_PREPARE_IMPACT' THEN
    RETURN public.bn_mortality_prepare_impact(
      p_event_id, p_actor_user_id, p_correlation_id, p_idempotency_key,
      COALESCE((p_payload->>'authorised_recalculation')::boolean, false)
    );
  END IF;

  IF p_command_name = 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD' THEN
    FOR v_impact IN
      SELECT * FROM public.bn_mortality_award_impact
       WHERE event_id = p_event_id AND hold_required = true
         AND hold_status IN ('PENDING','NOT_REQUIRED')
         AND bn_award_id IS NOT NULL
    LOOP
      v_attempted := v_attempted + 1;
      v_hold_child := md5(p_idempotency_key::text || ':HOLD:' || v_impact.id::text)::uuid;
      v_result := public.bn_awards_apply_servicing_event(
        v_impact.bn_award_id, 'HOLD', COALESCE(v_impact.hold_date, v_event.death_date),
        'bn_mortality', p_event_id, v_impact.id,
        p_correlation_id, v_hold_child, p_actor_user_id,
        'MORT_HOLD', p_payload->>'justification'
      );
      UPDATE public.bn_mortality_award_impact
         SET hold_status = CASE WHEN v_result->>'status' = 'REPLAYED' THEN 'APPLIED' ELSE 'APPLIED' END,
             hold_servicing_event_id = (v_result->>'servicing_event_id')::uuid,
             hold_reference = v_result->>'servicing_reference',
             integration_status = 'HOLD_APPLIED',
             integration_attempted_at = now(),
             applied_at = COALESCE(applied_at, now()),
             row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
       WHERE id = v_impact.id;
      v_row := jsonb_build_object(
        'impact_id', v_impact.id, 'award_id', v_impact.bn_award_id,
        'status', v_result->>'status', 'servicing_event_id', v_result->>'servicing_event_id',
        'servicing_reference', v_result->>'servicing_reference'
      );
      v_per_impact := v_per_impact || v_row;
      IF v_result->>'status' = 'REPLAYED' THEN v_replayed := v_replayed + 1;
      ELSE v_applied := v_applied + 1; END IF;
    END LOOP;

  ELSIF p_command_name = 'BN_MORTALITY_RELEASE_HOLD' THEN
    FOR v_impact IN
      SELECT * FROM public.bn_mortality_award_impact
       WHERE event_id = p_event_id
         AND hold_status IN ('APPLIED')
         AND bn_award_id IS NOT NULL
    LOOP
      v_attempted := v_attempted + 1;
      v_hold_child := md5(p_idempotency_key::text || ':RELEASE:' || v_impact.id::text)::uuid;
      v_result := public.bn_awards_apply_servicing_event(
        v_impact.bn_award_id, 'RELEASE', CURRENT_DATE,
        'bn_mortality', p_event_id, v_impact.id,
        p_correlation_id, v_hold_child, p_actor_user_id,
        'MORT_RELEASE', p_payload->>'justification'
      );
      UPDATE public.bn_mortality_award_impact
         SET hold_status = CASE
                             WHEN v_result->>'status' IN ('RELEASED_AND_ACTIVE','MORTALITY_HOLD_RELEASED_OTHER_HOLD_REMAINS','MORTALITY_HOLD_RELEASED_AWARD_TERMINATED')
                             THEN 'RELEASED'
                             WHEN v_result->>'status' = 'NOTHING_TO_RELEASE' THEN hold_status
                             ELSE 'RELEASED' END,
             release_servicing_event_id = (v_result->>'servicing_event_id')::uuid,
             release_reference = v_result->>'servicing_reference',
             integration_status = 'HOLD_RELEASED',
             integration_attempted_at = now(),
             row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
       WHERE id = v_impact.id;
      v_row := jsonb_build_object(
        'impact_id', v_impact.id, 'award_id', v_impact.bn_award_id,
        'status', v_result->>'status', 'servicing_event_id', v_result->>'servicing_event_id',
        'servicing_reference', v_result->>'servicing_reference'
      );
      v_per_impact := v_per_impact || v_row;
      v_applied := v_applied + 1;
    END LOOP;

  ELSIF p_command_name = 'BN_MORTALITY_TERMINATE_AWARD' THEN
    v_effective := COALESCE((p_payload->>'effective_date')::date, v_event.death_date);
    FOR v_impact IN
      SELECT * FROM public.bn_mortality_award_impact
       WHERE event_id = p_event_id
         AND termination_required = true
         AND approval_state = 'APPROVED'
         AND termination_status IN ('PENDING','NOT_REQUIRED')
         AND (integration_status IS NULL OR integration_status NOT LIKE '%_FAILED')
         AND bn_award_id IS NOT NULL
    LOOP
      v_attempted := v_attempted + 1;
      v_hold_child := md5(p_idempotency_key::text || ':TERMINATE:' || v_impact.id::text)::uuid;
      v_result := public.bn_awards_apply_servicing_event(
        v_impact.bn_award_id, 'TERMINATE', v_effective,
        'bn_mortality', p_event_id, v_impact.id,
        p_correlation_id, v_hold_child, p_actor_user_id,
        'MORT_TERMINATE', p_payload->>'justification'
      );
      UPDATE public.bn_mortality_award_impact
         SET termination_status = 'APPLIED',
             termination_effective_date = v_effective,
             termination_servicing_event_id = (v_result->>'servicing_event_id')::uuid,
             termination_reference = v_result->>'servicing_reference',
             impact_status = 'APPLIED',
             applied_at = COALESCE(applied_at, now()),
             integration_status = 'TERMINATED',
             integration_attempted_at = now(),
             row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
       WHERE id = v_impact.id;
      v_row := jsonb_build_object(
        'impact_id', v_impact.id, 'award_id', v_impact.bn_award_id,
        'status', v_result->>'status', 'servicing_event_id', v_result->>'servicing_event_id',
        'servicing_reference', v_result->>'servicing_reference'
      );
      v_per_impact := v_per_impact || v_row;
      IF v_result->>'status' = 'REPLAYED' THEN v_replayed := v_replayed + 1;
      ELSE v_applied := v_applied + 1; END IF;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'DISPATCHER_COMMAND_UNKNOWN:%', p_command_name;
  END IF;

  RETURN jsonb_build_object(
    'command', p_command_name,
    'attempted', v_attempted,
    'applied',   v_applied,
    'replayed',  v_replayed,
    'failed',    v_failed,
    'per_impact', v_per_impact
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public._bn_mortality_dispatch_servicing(text,uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._bn_mortality_dispatch_servicing(text,uuid,uuid,uuid,uuid,jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public._bn_mortality_dispatch_servicing(text,uuid,uuid,uuid,uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public._bn_mortality_dispatch_servicing(text,uuid,uuid,uuid,uuid,jsonb) TO service_role;

-- 7. Rewrite bn_mortality_execute_command ------------------------------------
--    History table uses column `command_name` (not event_type) and has no
--    `payload_json` column — use `payload_hash` for the payload attestation.
--    For the 4 orchestrated commands, invoke the dispatcher inside the same
--    transaction; any RAISE from the dispatcher rolls back the entire command
--    and the event state is not advanced.

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
SET search_path = public
AS $fn$
DECLARE
  v_row public.bn_mortality_event%ROWTYPE;
  v_from text;
  v_to text;
  v_now timestamptz := now();
  v_data jsonb := '{}'::jsonb;
  v_new_entity uuid := p_entity_id;
  v_orch jsonb;
  v_idempotency_key uuid;
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
    ELSE RAISE EXCEPTION 'COMMAND_UNKNOWN:%', p_command_name;
  END CASE;

  IF p_command_name = 'BN_MORTALITY_DRAFT_SAVE' AND p_entity_id IS NULL THEN
    INSERT INTO public.bn_mortality_event(status, source, deceased_full_name, correlation_id, created_by, updated_by)
    VALUES ('DRAFT', COALESCE(p_payload->>'source','STAFF_ENTRY'), p_payload->>'deceased_full_name',
            p_correlation_id, p_actor_user_id, p_actor_user_id)
    RETURNING * INTO v_row;
    v_new_entity := v_row.id;
  ELSIF p_command_name = 'BN_MORTALITY_REGISTER_REPORT' AND p_entity_id IS NULL THEN
    INSERT INTO public.bn_mortality_event(status, source, deceased_full_name, correlation_id, created_by, updated_by, reported_at)
    VALUES ('REPORTED', COALESCE(p_payload->>'source','STAFF_ENTRY'), p_payload->>'deceased_full_name',
            p_correlation_id, p_actor_user_id, p_actor_user_id, v_now)
    RETURNING * INTO v_row;
    v_new_entity := v_row.id;
  ELSE
    IF p_entity_id IS NULL THEN RAISE EXCEPTION 'ENTITY_REQUIRED:%', p_command_name; END IF;
    SELECT * INTO v_row FROM public.bn_mortality_event WHERE id = p_entity_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ENTITY_NOT_FOUND:%', p_entity_id; END IF;
    IF p_expected_row_version IS NOT NULL AND v_row.row_version <> p_expected_row_version THEN
      RAISE EXCEPTION 'ROW_VERSION_CONFLICT:expected=%,actual=%', p_expected_row_version, v_row.row_version;
    END IF;
    v_from := v_row.status;
  END IF;

  -- Transition guards (unchanged for non-orchestrated commands).
  IF p_command_name IN ('BN_MORTALITY_PLACE_PROVISIONAL_HOLD','BN_MORTALITY_RELEASE_HOLD',
                        'BN_MORTALITY_PREPARE_IMPACT','BN_MORTALITY_TERMINATE_AWARD') THEN
    -- Extra preconditions for orchestrated commands.
    IF p_command_name = 'BN_MORTALITY_PREPARE_IMPACT'
       AND v_from NOT IN ('VERIFIED','IMPACT_REVIEW') THEN
      RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to;
    ELSIF p_command_name = 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD'
       AND v_from NOT IN ('REPORTED','VERIFICATION_PENDING','CONFLICT','IMPACT_REVIEW','APPROVAL_PENDING') THEN
      RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to;
    ELSIF p_command_name = 'BN_MORTALITY_RELEASE_HOLD'
       AND v_from <> 'PROVISIONALLY_HELD' THEN
      RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to;
    ELSIF p_command_name = 'BN_MORTALITY_TERMINATE_AWARD'
       AND v_from NOT IN ('CONFIRMED','FOLLOW_ON_PROCESSING') THEN
      RAISE EXCEPTION 'STATE_INVALID_TRANSITION:% -> %', v_from, v_to;
    END IF;

    -- Deterministic child idempotency key derived from correlation + entity + command.
    v_idempotency_key := md5(
      p_correlation_id::text || ':' || v_new_entity::text || ':' || p_command_name
    )::uuid;

    -- Invoke dispatcher; any RAISE will roll back the whole command.
    v_orch := public._bn_mortality_dispatch_servicing(
      p_command_name, v_new_entity, p_actor_user_id, p_correlation_id,
      v_idempotency_key, COALESCE(p_payload, '{}'::jsonb)
    );

    -- Advance event state only after successful integration.
    UPDATE public.bn_mortality_event SET
      status = v_to,
      row_version = row_version + 1,
      updated_by = p_actor_user_id,
      confirmed_at = COALESCE(confirmed_at, CASE WHEN v_to = 'VERIFIED' THEN v_now END),
      provisional_hold_at = COALESCE(provisional_hold_at, CASE WHEN v_to='PROVISIONALLY_HELD' THEN v_now END),
      provisional_hold_by = COALESCE(provisional_hold_by, CASE WHEN v_to='PROVISIONALLY_HELD' THEN p_actor_user_id END)
    WHERE id = v_new_entity RETURNING * INTO v_row;

    v_data := jsonb_build_object(
      'entity_id', v_new_entity,
      'entity_version', v_row.row_version,
      'status', v_row.status,
      'from_status', v_from,
      'to_status', v_to,
      'occurred_at', v_now,
      'orchestration', v_orch
    );
  ELSE
    -- Everything else: preserve prior behaviour for the non-orchestrated
    -- commands, but use the correct history columns.
    CASE p_command_name
      WHEN 'BN_MORTALITY_MATCH_PERSON' THEN
        UPDATE public.bn_mortality_event SET
          matched_ip_id = NULLIF(p_payload->>'ip_id','')::bigint,
          matched_person_ssn = COALESCE(matched_person_ssn, p_payload->>'ssn'),
          match_confidence = COALESCE(p_payload->>'confidence','HIGH'),
          matched_at = v_now, matched_by = p_actor_user_id,
          match_score = NULLIF(p_payload->>'score','')::numeric,
          row_version = row_version + 1, updated_by = p_actor_user_id
        WHERE id = v_new_entity RETURNING * INTO v_row;
      WHEN 'BN_MORTALITY_ASSIGN' THEN
        UPDATE public.bn_mortality_event SET
          assigned_to = NULLIF(p_payload->>'assignee_user_id','')::uuid,
          row_version = row_version + 1, updated_by = p_actor_user_id
        WHERE id = v_new_entity RETURNING * INTO v_row;
      WHEN 'BN_MORTALITY_REJECT_REPORT' THEN
        UPDATE public.bn_mortality_event SET
          status = v_to, rejected_reason = p_payload->>'reason', closed_at = v_now,
          row_version = row_version + 1, updated_by = p_actor_user_id
        WHERE id = v_new_entity RETURNING * INTO v_row;
      WHEN 'BN_MORTALITY_CONFIRM_VERIFICATION' THEN
        UPDATE public.bn_mortality_event SET
          status = v_to, verified_at = v_now, verified_by = p_actor_user_id,
          verification_confidence = COALESCE(p_payload->>'confidence','CORROBORATED'),
          confirmed_at = v_now,
          row_version = row_version + 1, updated_by = p_actor_user_id
        WHERE id = v_new_entity RETURNING * INTO v_row;
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

    v_data := jsonb_build_object(
      'entity_id', v_new_entity,
      'entity_version', v_row.row_version,
      'status', v_row.status,
      'from_status', v_from,
      'to_status', v_to,
      'occurred_at', v_now
    );
  END IF;

  -- Immutable history using the ACTUAL columns of bn_mortality_event_history.
  INSERT INTO public.bn_mortality_event_history(
    event_id, from_status, to_status, command_name, correlation_id,
    actor_user_id, actor_user_code, reason_code, justification, payload_hash, occurred_at
  ) VALUES (
    v_new_entity, v_from, COALESCE(v_to, v_row.status), p_command_name, p_correlation_id,
    p_actor_user_id, p_actor_user_code, p_reason_code, p_justification, p_payload_hash, v_now
  );

  RETURN v_data;
END;
$fn$;

REVOKE ALL ON FUNCTION public.bn_mortality_execute_command(text,uuid,uuid,text,uuid,bigint,text,text,jsonb,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bn_mortality_execute_command(text,uuid,uuid,text,uuid,bigint,text,text,jsonb,text) FROM authenticated;
REVOKE ALL ON FUNCTION public.bn_mortality_execute_command(text,uuid,uuid,text,uuid,bigint,text,text,jsonb,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.bn_mortality_execute_command(text,uuid,uuid,text,uuid,bigint,text,text,jsonb,text) TO service_role;
