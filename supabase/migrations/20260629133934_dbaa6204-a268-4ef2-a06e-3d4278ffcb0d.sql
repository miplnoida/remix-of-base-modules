
DO $seed$
DECLARE
  v_wf_id UUID;
  v_i_scheduled UUID; v_i_in_progress UUID; v_i_rescheduled UUID;
  v_next INT;
BEGIN
  SELECT id INTO v_wf_id FROM public.workflow_definitions
    WHERE name = 'CE Status — Trivial Transitions' LIMIT 1;
  IF v_wf_id IS NULL THEN
    RAISE EXCEPTION 'Baseline workflow CE Status — Trivial Transitions not found';
  END IF;

  DELETE FROM public.workflow_step_actions
    WHERE step_id IN (
      SELECT id FROM public.workflow_steps
       WHERE workflow_id = v_wf_id AND step_name LIKE 'inspection:%'
    );
  DELETE FROM public.workflow_steps
    WHERE workflow_id = v_wf_id AND step_name LIKE 'inspection:%';

  SELECT COALESCE(MAX(step_number), 0) + 1 INTO v_next
    FROM public.workflow_steps WHERE workflow_id = v_wf_id;

  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'inspection:SCHEDULED', 'Custom', 'SCHEDULED', 'Allowed moves from SCHEDULED')
    RETURNING id INTO v_i_scheduled;          v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'inspection:IN_PROGRESS', 'Custom', 'IN_PROGRESS', 'Allowed moves from IN_PROGRESS')
    RETURNING id INTO v_i_in_progress;        v_next := v_next + 1;
  INSERT INTO public.workflow_steps (workflow_id, step_number, step_name, action_type, from_status, description)
    VALUES (v_wf_id, v_next, 'inspection:RESCHEDULED', 'Custom', 'RESCHEDULED', 'Allowed moves from RESCHEDULED')
    RETURNING id INTO v_i_rescheduled;        v_next := v_next + 1;

  INSERT INTO public.workflow_step_actions
    (step_id, action_name, action_type, action_code, result_status, display_order, is_final_action, next_step_type)
  VALUES
    -- SCHEDULED
    (v_i_scheduled, 'Start',      'Custom', 'START',      'IN_PROGRESS', 10, TRUE, 'end_workflow'),
    (v_i_scheduled, 'Reschedule', 'Custom', 'RESCHEDULE', 'RESCHEDULED', 20, TRUE, 'end_workflow'),
    (v_i_scheduled, 'Cancel',     'Custom', 'CANCEL',     'CANCELLED',   30, TRUE, 'end_workflow'),
    -- IN_PROGRESS
    (v_i_in_progress, 'Complete', 'Custom', 'COMPLETE',   'COMPLETED',   10, TRUE, 'end_workflow'),
    (v_i_in_progress, 'Cancel',   'Custom', 'CANCEL',     'CANCELLED',   20, TRUE, 'end_workflow'),
    -- RESCHEDULED
    (v_i_rescheduled, 'Start',    'Custom', 'START',      'IN_PROGRESS', 10, TRUE, 'end_workflow'),
    (v_i_rescheduled, 'Cancel',   'Custom', 'CANCEL',     'CANCELLED',   20, TRUE, 'end_workflow');
END
$seed$;

INSERT INTO public.ce_workflow_mappings (event_key, enabled, fallback_behavior, priority, notes)
SELECT k.event_key, FALSE, 'DIRECT_APPLY', 100,
       'Auto-seeded by CE status-engine Phase 3 migration (inspection). Map to a workflow to require approvals.'
FROM (VALUES
  ('inspection.status.START'),
  ('inspection.status.COMPLETE'),
  ('inspection.status.RESCHEDULE'),
  ('inspection.status.CANCEL')
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
    WHEN 'violation'  THEN v_table := 'ce_violations';
    WHEN 'case'       THEN v_table := 'ce_cases';
    WHEN 'notice'     THEN v_table := 'ce_notices';
    WHEN 'inspection' THEN v_table := 'ce_inspections';
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
