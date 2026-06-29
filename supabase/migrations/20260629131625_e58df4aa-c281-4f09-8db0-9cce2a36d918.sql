
-- =========================================================================
-- CE Workflow Engine — Phase 2: Cases + Notices
-- =========================================================================

DO $seed$
DECLARE
  v_wf_id UUID;
  -- Case steps
  v_c_open UUID; v_c_active UUID; v_c_investigation UUID;
  v_c_in_arrangement UUID; v_c_arrangement_active UUID;
  v_c_cstg_arrangement UUID; v_c_escalated UUID;
  v_c_recommended_legal UUID; v_c_escalated_legal UUID;
  v_c_resolved UUID; v_c_completed UUID; v_c_closed UUID;
  -- Notice steps
  v_n_draft UUID; v_n_pending UUID; v_n_approved UUID;
  v_n_sent UUID; v_n_delivered UUID; v_n_acknowledged UUID;
  v_n_failed UUID;
  v_next INT;
BEGIN
  SELECT id INTO v_wf_id FROM public.workflow_definitions
    WHERE name = 'CE Status — Trivial Transitions' LIMIT 1;
  IF v_wf_id IS NULL THEN
    RAISE EXCEPTION 'Baseline workflow CE Status — Trivial Transitions not found';
  END IF;

  -- Wipe any previously-seeded case/notice steps (keep violation steps intact)
  DELETE FROM public.workflow_step_actions
    WHERE step_id IN (
      SELECT id FROM public.workflow_steps
       WHERE workflow_id = v_wf_id
         AND (step_name LIKE 'case:%' OR step_name LIKE 'notice:%')
    );
  DELETE FROM public.workflow_steps
    WHERE workflow_id = v_wf_id
      AND (step_name LIKE 'case:%' OR step_name LIKE 'notice:%');

  SELECT COALESCE(MAX(step_number), 0) + 1 INTO v_next
    FROM public.workflow_steps WHERE workflow_id = v_wf_id;

  -- =================== CASE STEPS ===================
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:OPEN', 'Custom', 'OPEN', 'Allowed moves from OPEN')
    RETURNING id INTO v_c_open;            v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:ACTIVE', 'Custom', 'ACTIVE', 'Allowed moves from ACTIVE')
    RETURNING id INTO v_c_active;          v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:INVESTIGATION', 'Custom', 'INVESTIGATION', 'Allowed moves from INVESTIGATION')
    RETURNING id INTO v_c_investigation;   v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:IN_ARRANGEMENT', 'Custom', 'IN_ARRANGEMENT', 'Allowed moves from IN_ARRANGEMENT')
    RETURNING id INTO v_c_in_arrangement;  v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:ARRANGEMENT_ACTIVE', 'Custom', 'ARRANGEMENT_ACTIVE', 'Allowed moves from ARRANGEMENT_ACTIVE')
    RETURNING id INTO v_c_arrangement_active; v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:CSTG_PAYMENT_ARRANGEMENT_ACTIVE', 'Custom', 'CSTG_PAYMENT_ARRANGEMENT_ACTIVE', 'Allowed moves from CSTG_PAYMENT_ARRANGEMENT_ACTIVE')
    RETURNING id INTO v_c_cstg_arrangement; v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:ESCALATED', 'Custom', 'ESCALATED', 'Allowed moves from ESCALATED')
    RETURNING id INTO v_c_escalated;       v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:RECOMMENDED_FOR_LEGAL', 'Custom', 'RECOMMENDED_FOR_LEGAL', 'Allowed moves from RECOMMENDED_FOR_LEGAL')
    RETURNING id INTO v_c_recommended_legal; v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:ESCALATED_LEGAL', 'Custom', 'ESCALATED_LEGAL', 'Allowed moves from ESCALATED_LEGAL')
    RETURNING id INTO v_c_escalated_legal;  v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:RESOLVED', 'Custom', 'RESOLVED', 'Allowed moves from RESOLVED')
    RETURNING id INTO v_c_resolved;        v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:COMPLETED', 'Custom', 'COMPLETED', 'Allowed moves from COMPLETED')
    RETURNING id INTO v_c_completed;       v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'case:CLOSED', 'Custom', 'CLOSED', 'Allowed moves from CLOSED (REOPEN only)')
    RETURNING id INTO v_c_closed;          v_next := v_next + 1;

  -- Case actions. CLOSE is allowed from every non-terminal status.
  -- REOPEN only from CLOSED. ESCALATE / RESOLVE / ASSIGN where natural.
  INSERT INTO public.workflow_step_actions
    (step_id, action_name, action_type, action_code, result_status, display_order, is_final_action, next_step_type)
  VALUES
    -- OPEN
    (v_c_open, 'Assign', 'Custom', 'ASSIGN', 'ACTIVE', 10, TRUE, 'end_workflow'),
    (v_c_open, 'Start Investigation', 'Custom', 'INVESTIGATE', 'INVESTIGATION', 20, TRUE, 'end_workflow'),
    (v_c_open, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 30, TRUE, 'end_workflow'),
    (v_c_open, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 40, TRUE, 'end_workflow'),
    (v_c_open, 'Close', 'Custom', 'CLOSE', 'CLOSED', 50, TRUE, 'end_workflow'),
    -- ACTIVE
    (v_c_active, 'Start Investigation', 'Custom', 'INVESTIGATE', 'INVESTIGATION', 10, TRUE, 'end_workflow'),
    (v_c_active, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 20, TRUE, 'end_workflow'),
    (v_c_active, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 30, TRUE, 'end_workflow'),
    (v_c_active, 'Close', 'Custom', 'CLOSE', 'CLOSED', 40, TRUE, 'end_workflow'),
    -- INVESTIGATION
    (v_c_investigation, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 10, TRUE, 'end_workflow'),
    (v_c_investigation, 'Recommend Legal', 'Custom', 'RECOMMEND_LEGAL', 'RECOMMENDED_FOR_LEGAL', 20, TRUE, 'end_workflow'),
    (v_c_investigation, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 30, TRUE, 'end_workflow'),
    (v_c_investigation, 'Close', 'Custom', 'CLOSE', 'CLOSED', 40, TRUE, 'end_workflow'),
    -- IN_ARRANGEMENT
    (v_c_in_arrangement, 'Activate Arrangement', 'Custom', 'ACTIVATE_ARRANGEMENT', 'ARRANGEMENT_ACTIVE', 10, TRUE, 'end_workflow'),
    (v_c_in_arrangement, 'Close', 'Custom', 'CLOSE', 'CLOSED', 20, TRUE, 'end_workflow'),
    -- ARRANGEMENT_ACTIVE
    (v_c_arrangement_active, 'Complete', 'Custom', 'COMPLETE', 'COMPLETED', 10, TRUE, 'end_workflow'),
    (v_c_arrangement_active, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 20, TRUE, 'end_workflow'),
    (v_c_arrangement_active, 'Close', 'Custom', 'CLOSE', 'CLOSED', 30, TRUE, 'end_workflow'),
    -- CSTG_PAYMENT_ARRANGEMENT_ACTIVE
    (v_c_cstg_arrangement, 'Complete', 'Custom', 'COMPLETE', 'COMPLETED', 10, TRUE, 'end_workflow'),
    (v_c_cstg_arrangement, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 20, TRUE, 'end_workflow'),
    (v_c_cstg_arrangement, 'Close', 'Custom', 'CLOSE', 'CLOSED', 30, TRUE, 'end_workflow'),
    -- ESCALATED
    (v_c_escalated, 'Recommend Legal', 'Custom', 'RECOMMEND_LEGAL', 'RECOMMENDED_FOR_LEGAL', 10, TRUE, 'end_workflow'),
    (v_c_escalated, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 20, TRUE, 'end_workflow'),
    (v_c_escalated, 'Close', 'Custom', 'CLOSE', 'CLOSED', 30, TRUE, 'end_workflow'),
    -- RECOMMENDED_FOR_LEGAL
    (v_c_recommended_legal, 'Escalate to Legal', 'Custom', 'ESCALATE_LEGAL', 'ESCALATED_LEGAL', 10, TRUE, 'end_workflow'),
    (v_c_recommended_legal, 'Close', 'Custom', 'CLOSE', 'CLOSED', 20, TRUE, 'end_workflow'),
    -- ESCALATED_LEGAL
    (v_c_escalated_legal, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 10, TRUE, 'end_workflow'),
    (v_c_escalated_legal, 'Close', 'Custom', 'CLOSE', 'CLOSED', 20, TRUE, 'end_workflow'),
    -- RESOLVED
    (v_c_resolved, 'Close', 'Custom', 'CLOSE', 'CLOSED', 10, TRUE, 'end_workflow'),
    -- COMPLETED
    (v_c_completed, 'Close', 'Custom', 'CLOSE', 'CLOSED', 10, TRUE, 'end_workflow'),
    -- CLOSED
    (v_c_closed, 'Reopen', 'Custom', 'REOPEN', 'OPEN', 10, TRUE, 'end_workflow');

  -- =================== NOTICE STEPS ===================
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:DRAFT', 'Custom', 'DRAFT', 'Allowed moves from DRAFT')
    RETURNING id INTO v_n_draft;           v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:PENDING_APPROVAL', 'Custom', 'PENDING_APPROVAL', 'Allowed moves from PENDING_APPROVAL')
    RETURNING id INTO v_n_pending;         v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:APPROVED', 'Custom', 'APPROVED', 'Allowed moves from APPROVED')
    RETURNING id INTO v_n_approved;        v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:SENT', 'Custom', 'SENT', 'Allowed moves from SENT')
    RETURNING id INTO v_n_sent;            v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:DELIVERED', 'Custom', 'DELIVERED', 'Allowed moves from DELIVERED')
    RETURNING id INTO v_n_delivered;       v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:ACKNOWLEDGED', 'Custom', 'ACKNOWLEDGED', 'Allowed moves from ACKNOWLEDGED (terminal)')
    RETURNING id INTO v_n_acknowledged;    v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'notice:FAILED', 'Custom', 'FAILED', 'Allowed moves from FAILED')
    RETURNING id INTO v_n_failed;          v_next := v_next + 1;

  INSERT INTO public.workflow_step_actions
    (step_id, action_name, action_type, action_code, result_status, display_order, is_final_action, next_step_type)
  VALUES
    -- DRAFT
    (v_n_draft, 'Send', 'Custom', 'SEND', 'SENT', 10, TRUE, 'end_workflow'),
    (v_n_draft, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 20, TRUE, 'end_workflow'),
    -- PENDING_APPROVAL
    (v_n_pending, 'Approve', 'Custom', 'APPROVE', 'APPROVED', 10, TRUE, 'end_workflow'),
    (v_n_pending, 'Reject', 'Custom', 'REJECT', 'DRAFT', 20, TRUE, 'end_workflow'),
    (v_n_pending, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 30, TRUE, 'end_workflow'),
    -- APPROVED
    (v_n_approved, 'Send', 'Custom', 'SEND', 'SENT', 10, TRUE, 'end_workflow'),
    (v_n_approved, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 20, TRUE, 'end_workflow'),
    -- SENT
    (v_n_sent, 'Mark Delivered', 'Custom', 'MARK_DELIVERED', 'DELIVERED', 10, TRUE, 'end_workflow'),
    (v_n_sent, 'Mark Failed', 'Custom', 'FAIL', 'FAILED', 20, TRUE, 'end_workflow'),
    (v_n_sent, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 30, TRUE, 'end_workflow'),
    -- DELIVERED
    (v_n_delivered, 'Acknowledge', 'Custom', 'ACKNOWLEDGE', 'ACKNOWLEDGED', 10, TRUE, 'end_workflow'),
    -- FAILED
    (v_n_failed, 'Retry Send', 'Custom', 'SEND', 'SENT', 10, TRUE, 'end_workflow'),
    (v_n_failed, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 20, TRUE, 'end_workflow');
END
$seed$;

-- =========================================================================
-- ce_workflow_mappings seed for new event keys
-- =========================================================================
INSERT INTO public.ce_workflow_mappings (event_key, enabled, fallback_behavior, priority, notes)
SELECT k.event_key, FALSE, 'DIRECT_APPLY', 100,
       'Auto-seeded by CE status-engine Phase 2 migration (case/notice). Map to a workflow to require approvals.'
FROM (VALUES
  -- Cases
  ('case.status.ASSIGN'),
  ('case.status.INVESTIGATE'),
  ('case.status.ESCALATE'),
  ('case.status.RECOMMEND_LEGAL'),
  ('case.status.ESCALATE_LEGAL'),
  ('case.status.ACTIVATE_ARRANGEMENT'),
  ('case.status.COMPLETE'),
  ('case.status.RESOLVE'),
  ('case.status.CLOSE'),
  ('case.status.REOPEN'),
  -- Notices
  ('notice.status.SEND'),
  ('notice.status.MARK_DELIVERED'),
  ('notice.status.ACKNOWLEDGE'),
  ('notice.status.APPROVE'),
  ('notice.status.REJECT'),
  ('notice.status.FAIL'),
  ('notice.status.CANCEL')
) AS k(event_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ce_workflow_mappings m
   WHERE m.event_key = k.event_key
     AND m.applicable_fund IS NULL
     AND m.applicable_severity IS NULL
     AND m.applicable_violation_type_id IS NULL
     AND m.applicable_min_amount IS NULL
);

-- =========================================================================
-- Extend ce_apply_status_transition to handle case + notice
-- =========================================================================
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
    WHEN 'violation' THEN v_table := 'ce_violations';
    WHEN 'case'      THEN v_table := 'ce_cases';
    WHEN 'notice'    THEN v_table := 'ce_notices';
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

  -- Entity-specific history writes
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
  -- notice: no dedicated history table; rely on system_audit_trail + ce_notice_delivery_log

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

-- Refresh allowed-transitions view (no schema change; recreate for clarity)
CREATE OR REPLACE VIEW public.ce_allowed_status_transitions AS
SELECT
  split_part(ws.step_name, ':', 1) AS entity_type,
  ws.from_status,
  wsa.action_code,
  wsa.action_name AS action_label,
  wsa.result_status AS to_status,
  wsa.display_order,
  ws.workflow_id
FROM public.workflow_steps ws
JOIN public.workflow_step_actions wsa ON wsa.step_id = ws.id
JOIN public.workflow_definitions wd ON wd.id = ws.workflow_id
WHERE wd.name = 'CE Status — Trivial Transitions'
  AND ws.from_status IS NOT NULL
  AND wsa.action_code IS NOT NULL;

GRANT SELECT ON public.ce_allowed_status_transitions TO authenticated, service_role, anon;
