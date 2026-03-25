
-- Phase 1E: RPC — Record a communication stage
CREATE OR REPLACE FUNCTION public.ia_record_communication_stage(
  p_engagement_id UUID,
  p_stage_code TEXT,
  p_template_id UUID DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL,
  p_acknowledgment_required BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_order INT;
  v_template_name TEXT;
  v_policy RECORD;
  v_stage_id UUID;
BEGIN
  v_stage_order := CASE p_stage_code
    WHEN 'PLAN_INTIMATION' THEN 1 WHEN 'TEAM_AND_SCOPE_NOTICE' THEN 2
    WHEN 'DOC_REQUEST' THEN 3 WHEN 'ENTRANCE_MEETING' THEN 4
    WHEN 'QUERY_CYCLE' THEN 5 WHEN 'DRAFT_FINDING_DISCUSSION' THEN 6
    WHEN 'EXIT_MEETING' THEN 7 WHEN 'FINAL_REPORT_ISSUE' THEN 8
    WHEN 'ACTION_PLAN_REMINDER' THEN 9 ELSE 99
  END;

  IF p_template_id IS NOT NULL THEN
    SELECT name INTO v_template_name FROM ia_document_templates WHERE id = p_template_id;
    SELECT * INTO v_policy FROM ia_template_policy_matrix WHERE stage_code = p_stage_code AND is_active = true LIMIT 1;
    IF v_policy IS NOT NULL AND v_policy.is_mandatory THEN
      IF NOT EXISTS (SELECT 1 FROM ia_document_templates WHERE id = p_template_id AND category = v_policy.required_template_category AND is_active = true) THEN
        RETURN jsonb_build_object('success', false, 'error', format('Template must be of category "%s" for stage %s', v_policy.required_template_category, p_stage_code));
      END IF;
    END IF;
  END IF;

  IF p_stage_code != 'QUERY_CYCLE' THEN
    IF EXISTS (SELECT 1 FROM ia_communication_stages WHERE engagement_id = p_engagement_id AND stage_code = p_stage_code AND delivery_status IN ('Sent','Delivered','Acknowledged')) THEN
      RETURN jsonb_build_object('success', false, 'error', format('Stage %s already completed for this engagement', p_stage_code));
    END IF;
  END IF;

  INSERT INTO ia_communication_stages (engagement_id, stage_code, stage_order, template_id, template_name, recipient_name, recipient_email, sent_at, acknowledgment_required, delivery_status, notes, created_by)
  VALUES (p_engagement_id, p_stage_code, v_stage_order, p_template_id, v_template_name, p_recipient_name, p_recipient_email, now(), p_acknowledgment_required, 'Sent', p_notes, p_created_by)
  RETURNING id INTO v_stage_id;

  RETURN jsonb_build_object('success', true, 'stage_id', v_stage_id, 'stage_code', p_stage_code, 'stage_order', v_stage_order);
END;
$$;

-- Phase 1F: RPC — Get communication timeline
CREATE OR REPLACE FUNCTION public.ia_get_communication_timeline(p_engagement_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_stages TEXT[] := ARRAY['PLAN_INTIMATION','TEAM_AND_SCOPE_NOTICE','DOC_REQUEST','ENTRANCE_MEETING','QUERY_CYCLE','DRAFT_FINDING_DISCUSSION','EXIT_MEETING','FINAL_REPORT_ISSUE','ACTION_PLAN_REMINDER'];
  v_stage TEXT;
  v_result JSONB := '[]'::jsonb;
  v_stage_obj JSONB;
BEGIN
  FOREACH v_stage IN ARRAY v_all_stages LOOP
    v_stage_obj := jsonb_build_object(
      'stage_code', v_stage,
      'stage_order', CASE v_stage
        WHEN 'PLAN_INTIMATION' THEN 1 WHEN 'TEAM_AND_SCOPE_NOTICE' THEN 2
        WHEN 'DOC_REQUEST' THEN 3 WHEN 'ENTRANCE_MEETING' THEN 4
        WHEN 'QUERY_CYCLE' THEN 5 WHEN 'DRAFT_FINDING_DISCUSSION' THEN 6
        WHEN 'EXIT_MEETING' THEN 7 WHEN 'FINAL_REPORT_ISSUE' THEN 8
        WHEN 'ACTION_PLAN_REMINDER' THEN 9
      END,
      'is_mandatory', COALESCE((SELECT tpm.is_mandatory FROM ia_template_policy_matrix tpm WHERE tpm.stage_code = v_stage AND tpm.is_active LIMIT 1), false),
      'completed', EXISTS (SELECT 1 FROM ia_communication_stages cs WHERE cs.engagement_id = p_engagement_id AND cs.stage_code = v_stage AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')),
      'acknowledged', EXISTS (SELECT 1 FROM ia_communication_stages cs WHERE cs.engagement_id = p_engagement_id AND cs.stage_code = v_stage AND cs.acknowledged_at IS NOT NULL),
      'entries', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', cs.id, 'sent_at', cs.sent_at, 'recipient_name', cs.recipient_name,
          'recipient_email', cs.recipient_email, 'template_name', cs.template_name,
          'delivery_status', cs.delivery_status, 'acknowledged_at', cs.acknowledged_at,
          'acknowledgment_required', cs.acknowledgment_required, 'notes', cs.notes
        ) ORDER BY cs.sent_at)
        FROM ia_communication_stages cs WHERE cs.engagement_id = p_engagement_id AND cs.stage_code = v_stage
      ), '[]'::jsonb)
    );
    v_result := v_result || v_stage_obj;
  END LOOP;
  RETURN v_result;
END;
$$;

-- Phase 1G: RPC — Validate template against policy
CREATE OR REPLACE FUNCTION public.ia_validate_template_policy(p_stage_code TEXT, p_template_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_policy RECORD; v_template RECORD;
BEGIN
  SELECT * INTO v_policy FROM ia_template_policy_matrix WHERE stage_code = p_stage_code AND is_active = true LIMIT 1;
  IF v_policy IS NULL THEN RETURN jsonb_build_object('valid', true, 'message', 'No policy defined'); END IF;
  SELECT * INTO v_template FROM ia_document_templates WHERE id = p_template_id;
  IF v_template IS NULL THEN RETURN jsonb_build_object('valid', false, 'error', 'Template not found'); END IF;
  IF NOT v_template.is_active THEN RETURN jsonb_build_object('valid', false, 'error', 'Template is inactive'); END IF;
  IF v_template.category != v_policy.required_template_category THEN
    RETURN jsonb_build_object('valid', false, 'error', format('Expected category "%s", got "%s"', v_policy.required_template_category, v_template.category));
  END IF;
  IF v_policy.required_template_type IS NOT NULL AND v_template.type != v_policy.required_template_type THEN
    RETURN jsonb_build_object('valid', false, 'error', format('Expected type "%s", got "%s"', v_policy.required_template_type, v_template.type));
  END IF;
  RETURN jsonb_build_object('valid', true, 'template_name', v_template.name, 'category', v_template.category);
END;
$$;

-- Phase 1H: RPC — Build carry-forward
CREATE OR REPLACE FUNCTION public.ia_build_followup_carry_forward(p_source_fiscal_year TEXT, p_target_fiscal_year TEXT, p_carried_by TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT := 0; v_finding RECORD;
BEGIN
  FOR v_finding IN
    SELECT f.id AS finding_id, f.description, f.priority, e.id AS engagement_id, e.annual_plan_id
    FROM ia_findings f
    JOIN ia_activities a ON a.id = f.activity_id
    JOIN ia_audit_engagements e ON e.id = a.engagement_id
    JOIN ia_annual_plans p ON p.id = e.annual_plan_id
    WHERE p.fiscal_year = p_source_fiscal_year AND f.status NOT IN ('Closed', 'Resolved', 'Verified')
      AND NOT EXISTS (SELECT 1 FROM ia_plan_carry_forward cf WHERE cf.source_id = f.id::text AND cf.target_fiscal_year = p_target_fiscal_year)
  LOOP
    INSERT INTO ia_plan_carry_forward (annual_plan_id, source_type, source_id, source_reference, description, priority, status, carried_by, target_fiscal_year, original_finding_id, original_engagement_id)
    VALUES (v_finding.annual_plan_id, 'finding', v_finding.finding_id::text, 'FY-' || p_source_fiscal_year || ' Finding', v_finding.description, v_finding.priority, 'Carried Forward', p_carried_by, p_target_fiscal_year, v_finding.finding_id, v_finding.engagement_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'carried_forward_count', v_count, 'source_year', p_source_fiscal_year, 'target_year', p_target_fiscal_year);
END;
$$;

-- Phase 1I: RPC — Check overdue actions
CREATE OR REPLACE FUNCTION public.ia_check_overdue_actions()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_overdue_count INT := 0; v_action RECORD;
BEGIN
  FOR v_action IN SELECT id, description, due_date FROM ia_action_tracking WHERE status NOT IN ('Completed','Closed','Verified') AND due_date < CURRENT_DATE
  LOOP
    INSERT INTO system_business_events (action, module, entity_type, entity_id, description)
    VALUES ('ia_action_overdue', 'internal_audit', 'audit_action', v_action.id, format('Action overdue: %s (due %s)', COALESCE(v_action.description, v_action.id::text), v_action.due_date));
    v_overdue_count := v_overdue_count + 1;
  END LOOP;
  FOR v_action IN SELECT id, description, target_resolution_date FROM ia_plan_carry_forward WHERE status NOT IN ('Resolved','Closed') AND target_resolution_date IS NOT NULL AND target_resolution_date < CURRENT_DATE
  LOOP
    UPDATE ia_plan_carry_forward SET escalation_count = escalation_count + 1, last_escalated_at = now() WHERE id = v_action.id;
    v_overdue_count := v_overdue_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'overdue_count', v_overdue_count);
END;
$$;

-- Phase 1J: RPC — Closure gate
CREATE OR REPLACE FUNCTION public.ia_can_close_engagement(p_engagement_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reasons TEXT[] := '{}'; v_report_count INT; v_open_no_action INT; v_open_no_followup INT; v_exit_done BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_report_count FROM ia_audit_reports WHERE engagement_id = p_engagement_id AND status = 'Issued';
  IF v_report_count = 0 THEN v_reasons := array_append(v_reasons, 'No issued report found'); END IF;

  SELECT COUNT(*) INTO v_open_no_action FROM ia_findings f JOIN ia_activities a ON a.id = f.activity_id
  WHERE a.engagement_id = p_engagement_id AND f.status NOT IN ('Closed','Resolved') AND NOT EXISTS (SELECT 1 FROM ia_action_tracking act WHERE act.finding_id = f.id);
  IF v_open_no_action > 0 THEN v_reasons := array_append(v_reasons, format('%s open finding(s) without action plans', v_open_no_action)); END IF;

  SELECT COUNT(*) INTO v_open_no_followup FROM ia_findings f JOIN ia_activities a ON a.id = f.activity_id
  WHERE a.engagement_id = p_engagement_id AND f.status NOT IN ('Closed','Resolved') AND NOT EXISTS (SELECT 1 FROM ia_follow_ups fu WHERE fu.finding_id = f.id);
  IF v_open_no_followup > 0 THEN v_reasons := array_append(v_reasons, format('%s open finding(s) without follow-up structure', v_open_no_followup)); END IF;

  SELECT EXISTS (SELECT 1 FROM ia_communication_stages cs WHERE cs.engagement_id = p_engagement_id AND cs.stage_code = 'EXIT_MEETING' AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')) INTO v_exit_done;
  IF NOT v_exit_done THEN v_reasons := array_append(v_reasons, 'Exit meeting communication not completed'); END IF;

  RETURN jsonb_build_object('can_close', array_length(v_reasons, 1) IS NULL, 'reasons', v_reasons);
END;
$$;
