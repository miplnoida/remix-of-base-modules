
DO $seed$
DECLARE
  v_wf_id UUID;
  v_a_draft UUID; v_a_pending UUID; v_a_active UUID;
  v_w_pending UUID; v_w_pending_approval UUID; v_w_approved UUID;
  v_next INT;
BEGIN
  SELECT id INTO v_wf_id FROM public.workflow_definitions
    WHERE name = 'CE Status — Trivial Transitions' LIMIT 1;
  IF v_wf_id IS NULL THEN
    RAISE EXCEPTION 'Baseline workflow CE Status — Trivial Transitions not found';
  END IF;

  -- Clean prior arrangement/waiver seeds (idempotent)
  DELETE FROM public.workflow_step_actions
    WHERE step_id IN (
      SELECT id FROM public.workflow_steps
       WHERE workflow_id = v_wf_id
         AND (step_name LIKE 'arrangement:%' OR step_name LIKE 'waiver:%')
    );
  DELETE FROM public.workflow_steps
    WHERE workflow_id = v_wf_id
      AND (step_name LIKE 'arrangement:%' OR step_name LIKE 'waiver:%');

  SELECT COALESCE(MAX(step_number), 0) + 1 INTO v_next
    FROM public.workflow_steps WHERE workflow_id = v_wf_id;

  -- ── Arrangements ───────────────────────────────
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'arrangement:DRAFT', 'Custom', 'DRAFT', 'Allowed moves from DRAFT')
    RETURNING id INTO v_a_draft;              v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'arrangement:PENDING_APPROVAL', 'Custom', 'PENDING_APPROVAL', 'Allowed moves from PENDING_APPROVAL')
    RETURNING id INTO v_a_pending;            v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'arrangement:ACTIVE', 'Custom', 'ACTIVE', 'Allowed moves from ACTIVE')
    RETURNING id INTO v_a_active;             v_next := v_next + 1;

  -- ── Waivers ────────────────────────────────────
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'waiver:PENDING', 'Custom', 'PENDING', 'Allowed moves from PENDING')
    RETURNING id INTO v_w_pending;            v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'waiver:PENDING_APPROVAL', 'Custom', 'PENDING_APPROVAL', 'Allowed moves from PENDING_APPROVAL')
    RETURNING id INTO v_w_pending_approval;   v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'waiver:APPROVED', 'Custom', 'APPROVED', 'Allowed moves from APPROVED')
    RETURNING id INTO v_w_approved;           v_next := v_next + 1;

  INSERT INTO public.workflow_step_actions
    (step_id, action_name, action_type, action_code, result_status, display_order, is_final_action, next_step_type)
  VALUES
    -- Arrangement DRAFT
    (v_a_draft,  'Submit',  'Custom', 'SUBMIT',  'PENDING_APPROVAL', 10, TRUE, 'end_workflow'),
    (v_a_draft,  'Cancel',  'Custom', 'CANCEL',  'CANCELLED',        20, TRUE, 'end_workflow'),
    -- Arrangement PENDING_APPROVAL
    (v_a_pending,'Approve', 'Custom', 'APPROVE', 'ACTIVE',           10, TRUE, 'end_workflow'),
    (v_a_pending,'Reject',  'Custom', 'REJECT',  'DRAFT',            20, TRUE, 'end_workflow'),
    -- Arrangement ACTIVE
    (v_a_active, 'Complete','Custom', 'COMPLETE','COMPLETED',        10, TRUE, 'end_workflow'),
    (v_a_active, 'Cancel',  'Custom', 'CANCEL',  'CANCELLED',        20, TRUE, 'end_workflow'),
    -- Waiver PENDING
    (v_w_pending,         'Approve','Custom','APPROVE','APPROVED',  10, TRUE, 'end_workflow'),
    (v_w_pending,         'Reject', 'Custom','REJECT', 'REJECTED',  20, TRUE, 'end_workflow'),
    (v_w_pending,         'Cancel', 'Custom','CANCEL', 'CANCELLED', 30, TRUE, 'end_workflow'),
    -- Waiver PENDING_APPROVAL
    (v_w_pending_approval,'Approve','Custom','APPROVE','APPROVED',  10, TRUE, 'end_workflow'),
    (v_w_pending_approval,'Reject', 'Custom','REJECT', 'REJECTED',  20, TRUE, 'end_workflow'),
    (v_w_pending_approval,'Cancel', 'Custom','CANCEL', 'CANCELLED', 30, TRUE, 'end_workflow'),
    -- Waiver APPROVED
    (v_w_approved,        'Apply',  'Custom','APPLY',  'APPLIED',   10, TRUE, 'end_workflow');
END
$seed$;

INSERT INTO public.ce_workflow_mappings (event_key, enabled, fallback_behavior, priority, notes)
SELECT k.event_key, FALSE, 'DIRECT_APPLY', 100,
       'Auto-seeded by CE status-engine Phase 4 migration (arrangement/waiver). Map to a workflow to require approvals.'
FROM (VALUES
  ('arrangement.status.SUBMIT'),
  ('arrangement.status.APPROVE'),
  ('arrangement.status.REJECT'),
  ('arrangement.status.COMPLETE'),
  ('arrangement.status.CANCEL'),
  ('waiver.status.APPROVE'),
  ('waiver.status.REJECT'),
  ('waiver.status.CANCEL'),
  ('waiver.status.APPLY')
) AS k(event_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ce_workflow_mappings m
   WHERE m.event_key = k.event_key
     AND m.applicable_fund IS NULL
     AND m.applicable_severity IS NULL
     AND m.applicable_violation_type_id IS NULL
     AND m.applicable_min_amount IS NULL
);

CREATE OR REPLACE FUNCTION public.ce_apply_status_transition(
  p_entity_type TEXT,
  p_record_id   UUID,
  p_action_code TEXT,
  p_user_code   TEXT,
  p_notes       TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_event_key TEXT := p_entity_type || '.status.' || p_action_code;
  v_mapping    RECORD;
  v_table      TEXT;
  v_from       TEXT;
  v_to         TEXT;
  v_wf_id      UUID;
  v_baseline_wf UUID;
  v_step_id    UUID;
  v_now        TIMESTAMPTZ := now();
BEGIN
  SELECT id INTO v_baseline_wf
    FROM public.workflow_definitions
   WHERE name = 'CE Status — Trivial Transitions'
   LIMIT 1;

  SELECT * INTO v_mapping
    FROM public.ce_workflow_mappings
   WHERE event_key = v_event_key
   ORDER BY priority ASC
   LIMIT 1;

  IF v_mapping.id IS NOT NULL AND v_mapping.enabled AND v_mapping.workflow_definition_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'mode', 'WORKFLOW_REQUIRED',
      'workflow_definition_id', v_mapping.workflow_definition_id,
      'event_key', v_event_key
    );
  END IF;

  IF v_mapping.id IS NOT NULL AND v_mapping.fallback_behavior = 'BLOCK' THEN
    RAISE EXCEPTION 'Transition % is blocked by workflow mapping.', v_event_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_mapping.id IS NOT NULL AND v_mapping.fallback_behavior = 'REQUIRE_NOTE'
     AND (p_notes IS NULL OR length(trim(p_notes)) = 0) THEN
    RAISE EXCEPTION 'A note is required for transition %.', v_event_key
      USING ERRCODE = 'not_null_violation';
  END IF;

  CASE p_entity_type
    WHEN 'violation'   THEN v_table := 'ce_violations';
    WHEN 'case'        THEN v_table := 'ce_cases';
    WHEN 'notice'      THEN v_table := 'ce_notices';
    WHEN 'inspection'  THEN v_table := 'ce_inspections';
    WHEN 'arrangement' THEN v_table := 'ce_payment_arrangements';
    WHEN 'waiver'      THEN v_table := 'ce_waivers';
    ELSE
      RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END CASE;

  EXECUTE format('SELECT status FROM public.%I WHERE id = $1', v_table)
    INTO v_from USING p_record_id;

  IF v_from IS NULL THEN
    RAISE EXCEPTION 'Record % not found in %', p_record_id, v_table;
  END IF;

  v_wf_id := COALESCE(v_mapping.workflow_definition_id, v_baseline_wf);

  SELECT wsa.result_status, ws.id
    INTO v_to, v_step_id
    FROM public.workflow_steps ws
    JOIN public.workflow_step_actions wsa ON wsa.step_id = ws.id
   WHERE ws.workflow_id = v_wf_id
     AND ws.from_status = v_from
     AND wsa.action_code = p_action_code
     AND split_part(ws.step_name, ':', 1) = p_entity_type
   LIMIT 1;

  IF v_to IS NULL THEN
    RAISE EXCEPTION 'Transition % is not allowed from status % for %', p_action_code, v_from, p_entity_type
      USING ERRCODE = 'check_violation';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET status = $1, updated_by = $2, updated_at = $3 WHERE id = $4',
    v_table
  ) USING v_to, p_user_code, v_now, p_record_id;

  IF p_entity_type = 'violation' THEN
    INSERT INTO public.ce_violation_history
      (violation_id, action, from_value, to_value, notes, performed_by, performed_at)
    VALUES
      (p_record_id, p_action_code, v_from, v_to, p_notes, p_user_code, v_now);
  ELSIF p_entity_type = 'case' THEN
    INSERT INTO public.ce_case_history
      (case_id, action, from_status, to_status, notes, performed_by, performed_at)
    VALUES
      (p_record_id, p_action_code, v_from, v_to, p_notes, p_user_code, v_now);
  END IF;

  INSERT INTO public.system_audit_trail
    (action, module, entity_type, entity_id, severity, payload_json, user_name, timestamp)
  VALUES
    ('ce.status_transition',
     'Compliance',
     p_entity_type,
     p_record_id::text,
     'info',
     jsonb_build_object(
       'event_key', v_event_key,
       'from_status', v_from,
       'to_status', v_to,
       'action_code', p_action_code,
       'notes', p_notes
     ),
     p_user_code,
     v_now);

  RETURN jsonb_build_object(
    'mode', 'APPLIED',
    'from_status', v_from,
    'to_status', v_to,
    'event_key', v_event_key
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.ce_apply_status_transition(TEXT, UUID, TEXT, TEXT, TEXT)
  TO authenticated, service_role;
