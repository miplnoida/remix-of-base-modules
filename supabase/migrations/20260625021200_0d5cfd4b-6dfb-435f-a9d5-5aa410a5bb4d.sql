
-- Atomic RPC: create info request + source task + update referral + audit, with row-level locking.
CREATE OR REPLACE FUNCTION public.create_legal_info_request(
  p_legal_referral_id uuid,
  p_requested_by text,
  p_request_reason text,
  p_requested_items jsonb DEFAULT '[]'::jsonb,
  p_due_date date DEFAULT NULL,
  p_workbasket_code text DEFAULT NULL,
  p_team_code text DEFAULT NULL,
  p_user text DEFAULT NULL
)
RETURNS TABLE(info_request_id uuid, request_no text, source_task_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral legal_referral%ROWTYPE;
  v_request_no text;
  v_ir_id uuid;
  v_task_id uuid;
  v_workbasket text;
  v_team text;
  v_user text;
BEGIN
  -- Lock referral
  SELECT * INTO v_referral FROM legal_referral WHERE id = p_legal_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legal referral % not found', p_legal_referral_id; END IF;

  IF coalesce(trim(p_request_reason), '') = '' THEN
    RAISE EXCEPTION 'request_reason is required';
  END IF;

  -- Resolve routing: explicit > submitter > module default
  v_workbasket := COALESCE(NULLIF(p_workbasket_code, ''), v_referral.submitted_workbasket_code);
  v_team       := COALESCE(NULLIF(p_team_code, ''), v_referral.submitted_team_code);
  v_user       := COALESCE(NULLIF(p_user, ''), v_referral.submitted_by);

  IF v_workbasket IS NULL THEN
    IF v_referral.source_module = 'BENEFITS' THEN
      SELECT basket_code INTO v_workbasket FROM bn_workbasket WHERE is_active = true LIMIT 1;
      v_workbasket := COALESCE(v_workbasket, 'BN_LEGAL_FOLLOWUP');
    ELSE
      SELECT queue_code INTO v_workbasket FROM ce_assignment_routing_rules WHERE is_active = true LIMIT 1;
      v_workbasket := COALESCE(v_workbasket, 'CE_LEGAL_FOLLOWUP');
    END IF;
  END IF;

  -- Next request_no
  SELECT public.next_info_request_no() INTO v_request_no;
  IF v_request_no IS NULL THEN
    v_request_no := 'LIR-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text,1,6);
  END IF;

  -- 1. Info request
  INSERT INTO legal_referral_info_request(
    legal_referral_id, request_no, requested_by, requested_to_module,
    requested_to_workbasket_code, requested_to_team_code, requested_to_user,
    request_reason, requested_items, due_date, status
  ) VALUES (
    p_legal_referral_id, v_request_no, p_requested_by, v_referral.source_module,
    v_workbasket, v_team, v_user,
    p_request_reason, COALESCE(p_requested_items, '[]'::jsonb), p_due_date, 'PENDING_SOURCE_RESPONSE'
  ) RETURNING id INTO v_ir_id;

  -- 2. Source task
  INSERT INTO legal_referral_source_task(
    legal_referral_id, info_request_id, task_type, source_module,
    assigned_workbasket_code, assigned_team_code, assigned_user,
    priority, due_date, status,
    employer_id, insured_person_id
  ) VALUES (
    p_legal_referral_id, v_ir_id, 'LEGAL_INFO_REQUEST', v_referral.source_module,
    v_workbasket, v_team, v_user,
    COALESCE(v_referral.priority_code, 'MEDIUM'), p_due_date, 'OPEN',
    CASE WHEN v_referral.primary_entity_type = 'EMPLOYER' THEN v_referral.primary_entity_id ELSE NULL END,
    CASE WHEN v_referral.primary_entity_type = 'INSURED_PERSON' THEN v_referral.primary_entity_id ELSE NULL END
  ) RETURNING id INTO v_task_id;

  -- 3. Update referral status
  UPDATE legal_referral
     SET status = 'INFO_REQUESTED', last_status_at = now()
   WHERE id = p_legal_referral_id;

  -- 4. Audit (Legal side)
  INSERT INTO legal_referral_audit(legal_referral_id, info_request_id, event_code, event_module, actor, notes)
  VALUES (p_legal_referral_id, v_ir_id, 'INFO_REQUESTED', 'LEGAL', p_requested_by, p_request_reason);

  -- 5. Audit (Source side)
  INSERT INTO legal_referral_audit(legal_referral_id, info_request_id, event_code, event_module, actor, notes)
  VALUES (p_legal_referral_id, v_ir_id, 'SOURCE_TASK_CREATED', v_referral.source_module, p_requested_by,
          'Info request task assigned to ' || COALESCE(v_workbasket,'?'));

  -- 6. Mirror to legacy intake row (so existing screens reflect status)
  IF v_referral.lg_intake_id IS NOT NULL THEN
    UPDATE lg_case_intake
       SET intake_status = 'INFO_REQUESTED',
           info_request_notes = p_request_reason
     WHERE id = v_referral.lg_intake_id;
  END IF;

  RETURN QUERY SELECT v_ir_id, v_request_no, v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_legal_info_request(uuid, text, text, jsonb, date, text, text, text)
  TO authenticated, service_role;

-- Guard: cannot set referral.status = INFO_REQUESTED without an open info_request
CREATE OR REPLACE FUNCTION public.legal_referral_guard_info_requested()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'INFO_REQUESTED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NOT EXISTS (
      SELECT 1 FROM legal_referral_info_request
      WHERE legal_referral_id = NEW.id AND status = 'PENDING_SOURCE_RESPONSE'
    ) THEN
      RAISE EXCEPTION 'Cannot set legal_referral.status=INFO_REQUESTED without an open info request (referral %)', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_referral_guard_info_requested ON public.legal_referral;
CREATE CONSTRAINT TRIGGER trg_legal_referral_guard_info_requested
  AFTER INSERT OR UPDATE OF status ON public.legal_referral
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.legal_referral_guard_info_requested();

-- Backfill orphaned intakes: those marked INFO_REQUESTED in lg_case_intake but no open info_request on linked referral
DO $$
DECLARE
  r RECORD;
  v_ir uuid;
  v_no text;
BEGIN
  FOR r IN
    SELECT lr.id AS ref_id, lr.source_module, lr.submitted_workbasket_code, lr.submitted_team_code,
           lr.submitted_by, lr.priority_code, lr.primary_entity_type, lr.primary_entity_id,
           i.id AS intake_id, COALESCE(NULLIF(trim(i.info_request_notes),''), 'Information requested by Legal.') AS notes
    FROM lg_case_intake i
    JOIN legal_referral lr ON lr.lg_intake_id = i.id
    WHERE i.intake_status = 'INFO_REQUESTED'
      AND NOT EXISTS (
        SELECT 1 FROM legal_referral_info_request ir
        WHERE ir.legal_referral_id = lr.id AND ir.status = 'PENDING_SOURCE_RESPONSE'
      )
  LOOP
    SELECT public.next_info_request_no() INTO v_no;
    v_no := COALESCE(v_no, 'LIR-BF-' || substr(gen_random_uuid()::text,1,8));

    INSERT INTO legal_referral_info_request(
      legal_referral_id, request_no, requested_by, requested_to_module,
      requested_to_workbasket_code, requested_to_team_code, requested_to_user,
      request_reason, requested_items, status
    ) VALUES (
      r.ref_id, v_no, COALESCE(r.submitted_by,'SYSTEM'), r.source_module,
      COALESCE(r.submitted_workbasket_code,
        CASE WHEN r.source_module='BENEFITS' THEN 'BN_LEGAL_FOLLOWUP' ELSE 'CE_LEGAL_FOLLOWUP' END),
      r.submitted_team_code, r.submitted_by,
      r.notes, '[]'::jsonb, 'PENDING_SOURCE_RESPONSE'
    ) RETURNING id INTO v_ir;

    INSERT INTO legal_referral_source_task(
      legal_referral_id, info_request_id, task_type, source_module,
      assigned_workbasket_code, assigned_team_code, assigned_user,
      priority, status,
      employer_id, insured_person_id
    ) VALUES (
      r.ref_id, v_ir, 'LEGAL_INFO_REQUEST', r.source_module,
      COALESCE(r.submitted_workbasket_code,
        CASE WHEN r.source_module='BENEFITS' THEN 'BN_LEGAL_FOLLOWUP' ELSE 'CE_LEGAL_FOLLOWUP' END),
      r.submitted_team_code, r.submitted_by,
      COALESCE(r.priority_code,'MEDIUM'), 'OPEN',
      CASE WHEN r.primary_entity_type='EMPLOYER' THEN r.primary_entity_id END,
      CASE WHEN r.primary_entity_type='INSURED_PERSON' THEN r.primary_entity_id END
    );

    UPDATE legal_referral SET status='INFO_REQUESTED', last_status_at=now() WHERE id=r.ref_id;

    INSERT INTO legal_referral_audit(legal_referral_id, info_request_id, event_code, event_module, actor, notes)
    VALUES (r.ref_id, v_ir, 'INFO_REQUESTED_BACKFILL', 'LEGAL', COALESCE(r.submitted_by,'SYSTEM'),
            'Backfilled from legacy lg_case_intake.info_request_notes');
  END LOOP;
END $$;
