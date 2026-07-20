-- ==========================================================================
-- BN-MORT-2B.2A — Award Impact & Servicing Vertical Slice
-- ==========================================================================

-- ---------- Additive schema ----------

ALTER TABLE public.bn_mortality_event
  ADD COLUMN IF NOT EXISTS matched_person_ssn text;

CREATE INDEX IF NOT EXISTS ix_bn_mortality_event_matched_ssn
  ON public.bn_mortality_event(matched_person_ssn);

ALTER TABLE public.bn_mortality_award_impact
  ADD COLUMN IF NOT EXISTS hold_servicing_event_id uuid,
  ADD COLUMN IF NOT EXISTS hold_reference text,
  ADD COLUMN IF NOT EXISTS release_servicing_event_id uuid,
  ADD COLUMN IF NOT EXISTS release_reference text,
  ADD COLUMN IF NOT EXISTS termination_servicing_event_id uuid,
  ADD COLUMN IF NOT EXISTS termination_reference text,
  ADD COLUMN IF NOT EXISTS integration_status text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS integration_failure_code text,
  ADD COLUMN IF NOT EXISTS integration_failure_message text,
  ADD COLUMN IF NOT EXISTS integration_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_pad_minor bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS future_schedule_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS beneficiary_link boolean NOT NULL DEFAULT false;

-- ---------- Award servicing idempotency map ----------

CREATE TABLE IF NOT EXISTS public.bn_award_servicing_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  source_module text NOT NULL,
  source_event_id uuid NOT NULL,
  source_impact_id uuid,
  action text NOT NULL CHECK (action IN ('HOLD','RELEASE','TERMINATE')),
  servicing_event_id uuid NOT NULL,
  servicing_reference text,
  correlation_id uuid,
  idempotency_key uuid,
  result_status text NOT NULL DEFAULT 'APPLIED',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT ux_bn_award_servicing_idem
    UNIQUE (bn_award_id, source_module, source_event_id, source_impact_id, action)
);

GRANT SELECT ON public.bn_award_servicing_idempotency TO authenticated;
GRANT ALL    ON public.bn_award_servicing_idempotency TO service_role;

-- Application-layer authorisation only (project rule: no RLS).
-- Direct writes are restricted to service_role because authenticated is
-- granted SELECT only above.

-- ==========================================================================
-- RPC 1: bn_awards_apply_servicing_event  (Award-owned boundary)
-- ==========================================================================

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
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_award public.bn_award%ROWTYPE;
  v_prior_status text;
  v_new_status text;
  v_servicing_event_id uuid;
  v_reference text;
  v_existing public.bn_award_servicing_idempotency%ROWTYPE;
  v_susp_id uuid;
  v_actor_code text := COALESCE(p_actor_user_id::text, 'SERVICE');
BEGIN
  IF p_action NOT IN ('HOLD','RELEASE','TERMINATE') THEN
    RAISE EXCEPTION 'SERVICING_ACTION_INVALID:%', p_action;
  END IF;
  IF p_award_id IS NULL OR p_source_module IS NULL OR p_source_event_id IS NULL THEN
    RAISE EXCEPTION 'SERVICING_INPUT_INVALID';
  END IF;

  -- Idempotency: return prior result on replay.
  SELECT * INTO v_existing
    FROM public.bn_award_servicing_idempotency
   WHERE bn_award_id = p_award_id
     AND source_module = p_source_module
     AND source_event_id = p_source_event_id
     AND source_impact_id IS NOT DISTINCT FROM p_source_impact_id
     AND action = p_action
   LIMIT 1;

  IF FOUND THEN
    SELECT status INTO v_new_status FROM public.bn_award WHERE id = p_award_id;
    RETURN jsonb_build_object(
      'status', 'REPLAYED',
      'servicing_event_id', v_existing.servicing_event_id,
      'servicing_reference', v_existing.servicing_reference,
      'award_status', v_new_status,
      'action', p_action
    );
  END IF;

  -- Lock the award.
  SELECT * INTO v_award FROM public.bn_award WHERE id = p_award_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'AWARD_NOT_FOUND:%', p_award_id;
  END IF;

  v_prior_status := v_award.status;

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
    );

    UPDATE public.bn_award
       SET status = v_new_status, modified_by = v_actor_code, modified_at = now()
     WHERE id = p_award_id;

    UPDATE public.bn_payment_schedule
       SET status = 'CANCELLED', modified_by = v_actor_code, modified_at = now(),
           notes = COALESCE(notes,'') || ' [mortality-hold ' || p_source_event_id::text || ']'
     WHERE bn_award_id = p_award_id
       AND status = 'PENDING'
       AND due_date >= p_effective_date;

    UPDATE public.bn_payment_instruction
       SET status = 'cancelled', cancel_reason = 'MORTALITY_HOLD',
           modified_by = v_actor_code, modified_at = now(), updated_at = now()
     WHERE award_id = p_award_id
       AND status IN ('queued','pending','draft')
       AND due_date >= p_effective_date;

  ELSIF p_action = 'RELEASE' THEN
    -- Find the specific hold created by this source_impact_id.
    SELECT servicing_event_id INTO v_susp_id
      FROM public.bn_award_servicing_idempotency
     WHERE bn_award_id = p_award_id
       AND source_module = p_source_module
       AND source_event_id = p_source_event_id
       AND source_impact_id IS NOT DISTINCT FROM p_source_impact_id
       AND action = 'HOLD'
     LIMIT 1;

    IF v_susp_id IS NULL THEN
      RAISE EXCEPTION 'HOLD_NOT_FOUND_FOR_RELEASE';
    END IF;

    UPDATE public.bn_award_suspension_event
       SET status = 'RESUMED', resumed_at = now(), resumed_by = v_actor_code,
           modified_by = v_actor_code, modified_at = now(), suspended_to = p_effective_date
     WHERE id = v_susp_id AND status IN ('ACTIVE','APPROVED','PROPOSED');

    v_new_status := 'ACTIVE';
    v_servicing_event_id := v_susp_id;
    v_reference := 'REL-' || substr(v_susp_id::text, 1, 8);

    INSERT INTO public.bn_award_status_event(
      bn_award_id, from_status, to_status, reason_code, remarks, entered_by
    ) VALUES (
      p_award_id, v_prior_status, v_new_status, COALESCE(p_reason_code,'MORT_RELEASE'),
      p_justification, v_actor_code
    );

    UPDATE public.bn_award
       SET status = v_new_status, modified_by = v_actor_code, modified_at = now()
     WHERE id = p_award_id;

  ELSIF p_action = 'TERMINATE' THEN
    IF v_prior_status = 'TERMINATED' THEN
      RAISE EXCEPTION 'AWARD_ALREADY_TERMINATED';
    END IF;

    v_new_status := 'TERMINATED';
    v_servicing_event_id := gen_random_uuid();
    v_reference := 'TERM-' || substr(v_servicing_event_id::text, 1, 8);

    INSERT INTO public.bn_award_status_event(
      bn_award_id, from_status, to_status, reason_code, remarks, entered_by
    ) VALUES (
      p_award_id, v_prior_status, v_new_status, COALESCE(p_reason_code,'MORT_TERMINATE'),
      p_justification, v_actor_code
    );

    -- Resume any lingering suspension so we don't leave orphan open holds.
    UPDATE public.bn_award_suspension_event
       SET status = 'RESUMED', resumed_at = now(), resumed_by = v_actor_code,
           modified_by = v_actor_code, modified_at = now(), suspended_to = p_effective_date
     WHERE bn_award_id = p_award_id
       AND status IN ('ACTIVE','APPROVED','PROPOSED');

    UPDATE public.bn_award
       SET status = v_new_status,
           end_date = COALESCE(end_date, p_effective_date),
           modified_by = v_actor_code, modified_at = now()
     WHERE id = p_award_id;

    UPDATE public.bn_payment_schedule
       SET status = 'CANCELLED', modified_by = v_actor_code, modified_at = now(),
           notes = COALESCE(notes,'') || ' [mortality-terminate ' || p_source_event_id::text || ']'
     WHERE bn_award_id = p_award_id
       AND status = 'PENDING'
       AND due_date >= p_effective_date;

    UPDATE public.bn_payment_instruction
       SET status = 'cancelled', cancel_reason = 'MORTALITY_TERMINATE',
           modified_by = v_actor_code, modified_at = now(), updated_at = now()
     WHERE award_id = p_award_id
       AND status IN ('queued','pending','draft')
       AND due_date >= p_effective_date;
  END IF;

  INSERT INTO public.bn_award_servicing_idempotency(
    bn_award_id, source_module, source_event_id, source_impact_id, action,
    servicing_event_id, servicing_reference, correlation_id, idempotency_key,
    result_status, created_by
  ) VALUES (
    p_award_id, p_source_module, p_source_event_id, p_source_impact_id, p_action,
    v_servicing_event_id, v_reference, p_correlation_id, p_idempotency_key,
    'APPLIED', p_actor_user_id
  );

  RETURN jsonb_build_object(
    'status', 'APPLIED',
    'servicing_event_id', v_servicing_event_id,
    'servicing_reference', v_reference,
    'award_status', v_new_status,
    'prior_status', v_prior_status,
    'action', p_action
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bn_awards_apply_servicing_event(
  uuid,text,date,text,uuid,uuid,uuid,uuid,uuid,text,text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bn_awards_apply_servicing_event(
  uuid,text,date,text,uuid,uuid,uuid,uuid,uuid,text,text
) TO service_role;

-- ==========================================================================
-- RPC 2: bn_mortality_prepare_impact
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.bn_mortality_prepare_impact(
  p_event_id uuid,
  p_actor_user_id uuid,
  p_correlation_id uuid,
  p_idempotency_key uuid,
  p_authorised_recalculation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.bn_mortality_event%ROWTYPE;
  v_ssn text;
  v_award RECORD;
  v_last_paid date;
  v_future_count integer;
  v_pad_minor bigint;
  v_action text;
  v_hold_req boolean;
  v_term_req boolean;
  v_upserts integer := 0;
  v_skipped integer := 0;
  v_impact_ids uuid[] := ARRAY[]::uuid[];
  v_actor_code text := COALESCE(p_actor_user_id::text, 'SERVICE');
BEGIN
  SELECT * INTO v_event FROM public.bn_mortality_event WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MORTALITY_EVENT_NOT_FOUND:%', p_event_id;
  END IF;

  IF v_event.death_date IS NULL THEN
    RAISE EXCEPTION 'DEATH_DATE_REQUIRED';
  END IF;

  v_ssn := COALESCE(v_event.matched_person_ssn, v_event.deceased_national_id);
  IF v_ssn IS NULL OR btrim(v_ssn) = '' THEN
    -- Best-effort last resort: look up via ip_master by matched national id.
    IF v_event.deceased_national_id IS NOT NULL THEN
      SELECT ssn INTO v_ssn FROM public.ip_master
       WHERE ssn = v_event.deceased_national_id LIMIT 1;
    END IF;
    IF v_ssn IS NULL THEN
      RAISE EXCEPTION 'MATCHED_PERSON_REQUIRED';
    END IF;
  END IF;

  -- Iterate awards where this person is the primary payee.
  FOR v_award IN
    SELECT id, bn_claim_id, status, base_amount, frequency, award_number, currency
      FROM public.bn_award
     WHERE ssn = v_ssn
       AND status IN ('ACTIVE','SUSPENDED')
  LOOP
    SELECT MAX(paid_at::date) INTO v_last_paid
      FROM public.bn_payment_schedule
     WHERE bn_award_id = v_award.id
       AND status = 'PAID';

    SELECT COUNT(*) INTO v_future_count
      FROM public.bn_payment_schedule
     WHERE bn_award_id = v_award.id
       AND status = 'PENDING'
       AND due_date > v_event.death_date;

    SELECT COALESCE(SUM(CASE WHEN paid_at::date > v_event.death_date
                             THEN ROUND(gross_amount * 100)::bigint ELSE 0 END), 0)
      INTO v_pad_minor
      FROM public.bn_payment_schedule
     WHERE bn_award_id = v_award.id
       AND status = 'PAID';

    v_hold_req := v_future_count > 0 OR v_award.status = 'ACTIVE';
    v_term_req := true; -- Verified death → terminate.
    v_action   := 'TERMINATE';

    -- Preserve APPROVED rows unless recalculation authorised.
    INSERT INTO public.bn_mortality_award_impact(
      event_id, bn_award_id, bn_claim_id, award_reference, action,
      effective_date, payment_after_death_minor, currency_code,
      approval_state, original_award_status, original_award_amount,
      payment_frequency, hold_required, hold_status, termination_required,
      termination_status, termination_effective_date, last_valid_payment_date,
      impact_decision, impact_status, estimated_pad_minor, future_schedule_count,
      beneficiary_link, integration_status,
      created_by, updated_by
    ) VALUES (
      p_event_id, v_award.id, v_award.bn_claim_id, v_award.award_number, v_action,
      v_event.death_date, v_pad_minor, v_award.currency,
      'PENDING', v_award.status, ROUND(COALESCE(v_award.base_amount,0)*100)::bigint,
      v_award.frequency,
      v_hold_req, CASE WHEN v_hold_req THEN 'PENDING' ELSE 'NOT_REQUIRED' END,
      v_term_req, 'PENDING', v_event.death_date, v_last_paid,
      'TERMINATE', 'PENDING', v_pad_minor, v_future_count,
      false, 'NONE',
      p_actor_user_id, p_actor_user_id
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
          payment_after_death_minor = CASE
            WHEN public.bn_mortality_award_impact.approval_state = 'APPROVED'
                 AND NOT p_authorised_recalculation
            THEN public.bn_mortality_award_impact.payment_after_death_minor
            ELSE EXCLUDED.payment_after_death_minor END,
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
          updated_by = p_actor_user_id;

    v_upserts := v_upserts + 1;
  END LOOP;

  -- Awards where the deceased is a beneficiary (informational only).
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
      'PENDING', 'PENDING', true, 'NONE',
      p_actor_user_id, p_actor_user_id,
      'Deceased was beneficiary; survivor share reallocation may be required.'
    )
    ON CONFLICT (event_id, bn_award_id) WHERE bn_award_id IS NOT NULL DO NOTHING;
    v_skipped := v_skipped + 1;
  END LOOP;

  UPDATE public.bn_mortality_event
     SET row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
   WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'event_id', p_event_id,
    'impacts_upserted', v_upserts,
    'beneficiary_links', v_skipped,
    'deceased_ssn', v_ssn,
    'death_date', v_event.death_date,
    'authorised_recalculation', p_authorised_recalculation
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bn_mortality_prepare_impact(uuid,uuid,uuid,uuid,boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bn_mortality_prepare_impact(uuid,uuid,uuid,uuid,boolean)
  TO service_role;

-- ==========================================================================
-- Extend bn_mortality_execute_command to orchestrate the 4 award commands.
-- We wrap the existing function via a router: the router intercepts the 4
-- servicing commands and delegates to helpers, otherwise falls back to the
-- prior behaviour by re-invoking the base statement handled inside itself.
-- Rather than editing the giant CASE, we add pre-dispatch here.
-- ==========================================================================

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
AS $$
DECLARE
  v_event public.bn_mortality_event%ROWTYPE;
  v_impact RECORD;
  v_result jsonb;
  v_ok integer := 0;
  v_fail integer := 0;
  v_effective date;
  v_action_target text;
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
      BEGIN
        v_result := public.bn_awards_apply_servicing_event(
          v_impact.bn_award_id, 'HOLD', COALESCE(v_impact.hold_date, v_event.death_date),
          'bn_mortality', p_event_id, v_impact.id,
          p_correlation_id, p_idempotency_key, p_actor_user_id,
          'MORT_HOLD', p_payload->>'justification'
        );
        UPDATE public.bn_mortality_award_impact
           SET hold_status = 'APPLIED',
               hold_servicing_event_id = (v_result->>'servicing_event_id')::uuid,
               hold_reference = v_result->>'servicing_reference',
               integration_status = 'HOLD_APPLIED',
               integration_attempted_at = now(),
               row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
         WHERE id = v_impact.id;
        v_ok := v_ok + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.bn_mortality_award_impact
           SET integration_status = 'HOLD_FAILED',
               integration_failure_code = 'HOLD_ERROR',
               integration_failure_message = LEFT(SQLERRM, 500),
               integration_attempted_at = now(),
               row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
         WHERE id = v_impact.id;
        v_fail := v_fail + 1;
      END;
    END LOOP;
    RETURN jsonb_build_object('command','HOLD','applied',v_ok,'failed',v_fail);
  END IF;

  IF p_command_name = 'BN_MORTALITY_RELEASE_HOLD' THEN
    FOR v_impact IN
      SELECT * FROM public.bn_mortality_award_impact
       WHERE event_id = p_event_id
         AND hold_status = 'APPLIED'
         AND bn_award_id IS NOT NULL
    LOOP
      BEGIN
        v_result := public.bn_awards_apply_servicing_event(
          v_impact.bn_award_id, 'RELEASE', CURRENT_DATE,
          'bn_mortality', p_event_id, v_impact.id,
          p_correlation_id, p_idempotency_key, p_actor_user_id,
          'MORT_RELEASE', p_payload->>'justification'
        );
        UPDATE public.bn_mortality_award_impact
           SET hold_status = 'RELEASED',
               release_servicing_event_id = (v_result->>'servicing_event_id')::uuid,
               release_reference = v_result->>'servicing_reference',
               integration_status = 'HOLD_RELEASED',
               integration_attempted_at = now(),
               row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
         WHERE id = v_impact.id;
        v_ok := v_ok + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.bn_mortality_award_impact
           SET integration_status = 'RELEASE_FAILED',
               integration_failure_code = 'RELEASE_ERROR',
               integration_failure_message = LEFT(SQLERRM, 500),
               integration_attempted_at = now(),
               row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
         WHERE id = v_impact.id;
        v_fail := v_fail + 1;
      END;
    END LOOP;
    RETURN jsonb_build_object('command','RELEASE','released',v_ok,'failed',v_fail);
  END IF;

  IF p_command_name = 'BN_MORTALITY_TERMINATE_AWARD' THEN
    -- Require approval on impact rows before termination.
    v_effective := COALESCE((p_payload->>'effective_date')::date, v_event.death_date);
    FOR v_impact IN
      SELECT * FROM public.bn_mortality_award_impact
       WHERE event_id = p_event_id
         AND termination_required = true
         AND approval_state = 'APPROVED'
         AND termination_status IN ('PENDING','NOT_REQUIRED')
         AND bn_award_id IS NOT NULL
    LOOP
      BEGIN
        v_result := public.bn_awards_apply_servicing_event(
          v_impact.bn_award_id, 'TERMINATE', v_effective,
          'bn_mortality', p_event_id, v_impact.id,
          p_correlation_id, p_idempotency_key, p_actor_user_id,
          'MORT_TERMINATE', p_payload->>'justification'
        );
        UPDATE public.bn_mortality_award_impact
           SET termination_status = 'APPLIED',
               termination_effective_date = v_effective,
               termination_servicing_event_id = (v_result->>'servicing_event_id')::uuid,
               termination_reference = v_result->>'servicing_reference',
               impact_status = 'APPLIED',
               integration_status = 'TERMINATED',
               integration_attempted_at = now(),
               row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
         WHERE id = v_impact.id;
        v_ok := v_ok + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.bn_mortality_award_impact
           SET integration_status = 'TERMINATE_FAILED',
               integration_failure_code = 'TERMINATE_ERROR',
               integration_failure_message = LEFT(SQLERRM, 500),
               integration_attempted_at = now(),
               row_version = row_version + 1, updated_at = now(), updated_by = p_actor_user_id
         WHERE id = v_impact.id;
        v_fail := v_fail + 1;
      END;
    END LOOP;
    RETURN jsonb_build_object('command','TERMINATE','terminated',v_ok,'failed',v_fail);
  END IF;

  RETURN jsonb_build_object('command', p_command_name, 'dispatched', false);
END;
$$;

REVOKE ALL ON FUNCTION public._bn_mortality_dispatch_servicing(text,uuid,uuid,uuid,uuid,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._bn_mortality_dispatch_servicing(text,uuid,uuid,uuid,uuid,jsonb)
  TO service_role;

COMMENT ON FUNCTION public.bn_awards_apply_servicing_event IS
  'BN-MORT-2B.2A: Canonical Award servicing boundary (HOLD/RELEASE/TERMINATE). Called via service_role only from mortality command edge function.';
COMMENT ON FUNCTION public.bn_mortality_prepare_impact IS
  'BN-MORT-2B.2A: Server-side impact preparation. Scans awards by SSN, upserts bn_mortality_award_impact, preserves APPROVED rows unless authorised recalculation.';
COMMENT ON FUNCTION public._bn_mortality_dispatch_servicing IS
  'BN-MORT-2B.2A: Internal dispatcher for the four Award-servicing mortality commands. Invoked from the edge function alongside the base execute_command RPC.';
