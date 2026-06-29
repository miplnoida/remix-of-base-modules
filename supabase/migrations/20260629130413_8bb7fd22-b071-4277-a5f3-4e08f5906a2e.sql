
ALTER TABLE public.workflow_steps
  ADD COLUMN IF NOT EXISTS from_status TEXT,
  ADD COLUMN IF NOT EXISTS result_status_on_complete TEXT,
  ADD COLUMN IF NOT EXISTS result_status_on_reject TEXT;

ALTER TABLE public.workflow_step_actions
  ADD COLUMN IF NOT EXISTS action_code TEXT;

CREATE INDEX IF NOT EXISTS workflow_steps_from_status_idx
  ON public.workflow_steps(workflow_id, from_status);
CREATE INDEX IF NOT EXISTS workflow_step_actions_code_idx
  ON public.workflow_step_actions(step_id, action_code);

DO $seed$
DECLARE
  v_wf_id UUID;
  v_step_open UUID;
  v_step_inprogress UUID;
  v_step_underreview UUID;
  v_step_escalated UUID;
  v_step_resolved UUID;
  v_step_closed UUID;
  v_step_cancelled UUID;
BEGIN
  SELECT id INTO v_wf_id FROM public.workflow_definitions WHERE name = 'CE Status — Trivial Transitions' LIMIT 1;
  IF v_wf_id IS NULL THEN
    INSERT INTO public.workflow_definitions (name, description, process_type, is_active, maker_checker_enabled)
    VALUES ('CE Status — Trivial Transitions',
            'Seed workflow that catalogues allowed in-progress status moves for Compliance entities. Edited from Admin → Workflows.',
            'Custom', TRUE, FALSE)
    RETURNING id INTO v_wf_id;
  END IF;

  DELETE FROM public.workflow_step_actions
    WHERE step_id IN (SELECT id FROM public.workflow_steps WHERE workflow_id = v_wf_id);
  DELETE FROM public.workflow_steps WHERE workflow_id = v_wf_id;

  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 1, 'violation:OPEN', 'Custom', 'OPEN', 'Allowed moves from OPEN')
    RETURNING id INTO v_step_open;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 2, 'violation:IN_PROGRESS', 'Custom', 'IN_PROGRESS', 'Allowed moves from IN_PROGRESS')
    RETURNING id INTO v_step_inprogress;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 3, 'violation:UNDER_REVIEW', 'Custom', 'UNDER_REVIEW', 'Allowed moves from UNDER_REVIEW (RETURN_TO_OPEN intentionally omitted)')
    RETURNING id INTO v_step_underreview;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 4, 'violation:ESCALATED', 'Custom', 'ESCALATED', 'Allowed moves from ESCALATED')
    RETURNING id INTO v_step_escalated;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 5, 'violation:RESOLVED', 'Custom', 'RESOLVED', 'Allowed moves from RESOLVED')
    RETURNING id INTO v_step_resolved;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 6, 'violation:CLOSED', 'Custom', 'CLOSED', 'Allowed moves from CLOSED')
    RETURNING id INTO v_step_closed;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, 7, 'violation:CANCELLED', 'Custom', 'CANCELLED', 'Allowed moves from CANCELLED')
    RETURNING id INTO v_step_cancelled;

  INSERT INTO public.workflow_step_actions
    (step_id, action_name, action_type, action_code, result_status, display_order, is_final_action, next_step_type, end_state)
  VALUES
    (v_step_open, 'Start Work', 'Custom', 'START_WORK', 'IN_PROGRESS', 10, TRUE, 'end_workflow', NULL),
    (v_step_open, 'Move to Review', 'Custom', 'MOVE_TO_REVIEW', 'UNDER_REVIEW', 20, TRUE, 'end_workflow', NULL),
    (v_step_open, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 30, TRUE, 'end_workflow', NULL),
    (v_step_open, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 40, TRUE, 'end_workflow', NULL),
    (v_step_open, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 50, TRUE, 'end_workflow', NULL),
    (v_step_inprogress, 'Move to Review', 'Custom', 'MOVE_TO_REVIEW', 'UNDER_REVIEW', 10, TRUE, 'end_workflow', NULL),
    (v_step_inprogress, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 20, TRUE, 'end_workflow', NULL),
    (v_step_inprogress, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 30, TRUE, 'end_workflow', NULL),
    (v_step_inprogress, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 40, TRUE, 'end_workflow', NULL),
    (v_step_underreview, 'Resume Work', 'Custom', 'START_WORK', 'IN_PROGRESS', 10, TRUE, 'end_workflow', NULL),
    (v_step_underreview, 'Escalate', 'Custom', 'ESCALATE', 'ESCALATED', 20, TRUE, 'end_workflow', NULL),
    (v_step_underreview, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 30, TRUE, 'end_workflow', NULL),
    (v_step_underreview, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 40, TRUE, 'end_workflow', NULL),
    (v_step_escalated, 'De-escalate to Review', 'Custom', 'MOVE_TO_REVIEW', 'UNDER_REVIEW', 10, TRUE, 'end_workflow', NULL),
    (v_step_escalated, 'Resolve', 'Custom', 'RESOLVE', 'RESOLVED', 20, TRUE, 'end_workflow', NULL),
    (v_step_escalated, 'Cancel', 'Custom', 'CANCEL', 'CANCELLED', 30, TRUE, 'end_workflow', NULL),
    (v_step_resolved, 'Close', 'Custom', 'CLOSE', 'CLOSED', 10, TRUE, 'end_workflow', NULL),
    (v_step_resolved, 'Reopen', 'Custom', 'REOPEN', 'OPEN', 20, TRUE, 'end_workflow', NULL),
    (v_step_closed, 'Reopen', 'Custom', 'REOPEN', 'OPEN', 10, TRUE, 'end_workflow', NULL),
    (v_step_cancelled, 'Reopen', 'Custom', 'REOPEN', 'OPEN', 10, TRUE, 'end_workflow', NULL);
END
$seed$;

INSERT INTO public.ce_workflow_mappings (event_key, enabled, fallback_behavior, priority, notes)
SELECT k.event_key, FALSE, 'DIRECT_APPLY', 100,
       'Auto-seeded by status-engine migration. Map to a workflow in Admin → Compliance → Workflow Mapping to require approvals; otherwise transitions apply directly via ce_apply_status_transition().'
FROM (VALUES
    ('violation.status.START_WORK'),
    ('violation.status.MOVE_TO_REVIEW'),
    ('violation.status.ESCALATE'),
    ('violation.status.RESOLVE'),
    ('violation.status.CANCEL'),
    ('violation.status.REOPEN'),
    ('violation.status.CLOSE')
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
  v_history_table TEXT;
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
    WHEN 'violation' THEN
      v_table := 'ce_violations';
      v_history_table := 'ce_violation_history';
    ELSE
      RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END CASE;

  EXECUTE format('SELECT status FROM public.%I WHERE id = $1', v_table)
    INTO v_from
    USING p_record_id;

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
   LIMIT 1;

  IF v_to IS NULL THEN
    RAISE EXCEPTION 'Transition % is not allowed from status %', p_action_code, v_from
      USING ERRCODE = 'check_violation';
  END IF;

  EXECUTE format(
    'UPDATE public.%I SET status = $1, updated_by = $2, updated_at = $3 WHERE id = $4',
    v_table
  ) USING v_to, p_user_code, v_now, p_record_id;

  IF v_history_table = 'ce_violation_history' THEN
    INSERT INTO public.ce_violation_history
      (violation_id, action, from_value, to_value, notes, performed_by, performed_at)
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

GRANT EXECUTE ON FUNCTION public.ce_apply_status_transition(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

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
