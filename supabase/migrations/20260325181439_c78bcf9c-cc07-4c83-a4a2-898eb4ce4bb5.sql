
-- Phase 2: Enhance ia_can_start_engagement with communication stage checks
CREATE OR REPLACE FUNCTION public.ia_can_start_engagement(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_eng record;
  v_plan_status text;
  v_reasons text[] := '{}';
  v_intimation_done boolean;
  v_team_notice_done boolean;
BEGIN
  SELECT e.*, ap.status AS plan_status
  INTO v_eng
  FROM ia_audit_engagements e
  LEFT JOIN ia_annual_plans ap ON ap.id = e.annual_plan_id
  WHERE e.id = p_engagement_id;

  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('can_start', false, 'reasons', ARRAY['Engagement not found']);
  END IF;

  -- Gate 1: Parent plan must be Approved or In Progress
  IF v_eng.plan_status IS NOT NULL AND v_eng.plan_status NOT IN ('Approved', 'In Progress') THEN
    v_reasons := v_reasons || ('Parent plan status is "' || COALESCE(v_eng.plan_status, 'NULL') || '" — must be Approved or In Progress');
  END IF;

  -- Gate 2: Engagement must have planned dates
  IF v_eng.planned_start_date IS NULL OR v_eng.planned_end_date IS NULL THEN
    v_reasons := v_reasons || 'Engagement must have planned start and end dates';
  END IF;

  -- Gate 3: Must have a lead auditor
  IF v_eng.lead_auditor_id IS NULL THEN
    v_reasons := v_reasons || 'A lead auditor must be assigned';
  END IF;

  -- Gate 4 (NEW): Audit Intimation communication must be sent to auditee
  SELECT EXISTS (
    SELECT 1 FROM ia_communication_stages cs
    WHERE cs.engagement_id = p_engagement_id
      AND cs.stage_code = 'PLAN_INTIMATION'
      AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')
  ) INTO v_intimation_done;
  IF NOT v_intimation_done THEN
    v_reasons := v_reasons || 'Audit intimation notice must be sent to auditee before execution';
  END IF;

  -- Gate 5 (NEW): Team & scope notice must be sent
  SELECT EXISTS (
    SELECT 1 FROM ia_communication_stages cs
    WHERE cs.engagement_id = p_engagement_id
      AND cs.stage_code = 'TEAM_AND_SCOPE_NOTICE'
      AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')
  ) INTO v_team_notice_done;
  IF NOT v_team_notice_done THEN
    v_reasons := v_reasons || 'Team and scope disclosure must be sent to auditee before execution';
  END IF;

  RETURN jsonb_build_object(
    'can_start', array_length(v_reasons, 1) IS NULL,
    'reasons', v_reasons,
    'engagement_status', v_eng.status,
    'plan_status', v_eng.plan_status
  );
END;
$$;

-- Phase 2: Enhance ia_can_issue_report with communication stage + mgmt response checks
CREATE OR REPLACE FUNCTION public.ia_can_issue_report(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_report record;
  v_eng_id uuid;
  v_gate record;
  v_evidence_count integer;
  v_wp_count integer;
  v_findings_count integer;
  v_responses_pending integer;
  v_reasons text[] := '{}';
  v_exit_meeting_done boolean;
  v_draft_discussion_done boolean;
BEGIN
  SELECT * INTO v_report FROM ia_audit_reports WHERE id = p_report_id;
  IF v_report IS NULL THEN
    RETURN jsonb_build_object('can_issue', false, 'reasons', ARRAY['Report not found']);
  END IF;

  v_eng_id := v_report.engagement_id;

  -- Load gate config
  SELECT * INTO v_gate FROM ia_execution_gate_config WHERE gate_type = 'report_issuance' AND is_active = true LIMIT 1;

  IF v_gate IS NOT NULL AND v_eng_id IS NOT NULL THEN
    -- Count artefacts
    SELECT count(*) INTO v_evidence_count FROM ia_evidence WHERE engagement_id = v_eng_id;
    SELECT count(*) INTO v_wp_count FROM ia_working_papers WHERE engagement_id = v_eng_id;
    SELECT count(*) INTO v_findings_count FROM ia_findings WHERE engagement_id = v_eng_id;

    IF v_evidence_count < v_gate.min_evidence_count THEN
      v_reasons := v_reasons || ('Minimum ' || v_gate.min_evidence_count || ' evidence item(s) required, found ' || v_evidence_count);
    END IF;

    IF v_wp_count < v_gate.min_working_papers_count THEN
      v_reasons := v_reasons || ('Minimum ' || v_gate.min_working_papers_count || ' working paper(s) required, found ' || v_wp_count);
    END IF;

    IF v_gate.min_findings_documented AND v_findings_count = 0 THEN
      v_reasons := v_reasons || 'At least one finding must be documented (or mark engagement as no-findings)';
    END IF;

    -- Management responses check (enhanced: always check, not just when config flag set)
    SELECT count(*) INTO v_responses_pending
    FROM ia_findings f
    LEFT JOIN ia_management_responses mr ON mr.finding_id = f.id
    WHERE f.engagement_id = v_eng_id AND mr.id IS NULL;
    IF v_responses_pending > 0 THEN
      v_reasons := v_reasons || (v_responses_pending || ' finding(s) missing management response');
    END IF;
  END IF;

  -- Gate (NEW): Draft Finding Discussion communication must be completed
  IF v_eng_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM ia_communication_stages cs
      WHERE cs.engagement_id = v_eng_id
        AND cs.stage_code = 'DRAFT_FINDING_DISCUSSION'
        AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')
    ) INTO v_draft_discussion_done;
    IF NOT v_draft_discussion_done THEN
      v_reasons := v_reasons || 'Draft finding discussion must be completed with auditee before report issuance';
    END IF;

    -- Gate (NEW): Exit Meeting communication must be completed
    SELECT EXISTS (
      SELECT 1 FROM ia_communication_stages cs
      WHERE cs.engagement_id = v_eng_id
        AND cs.stage_code = 'EXIT_MEETING'
        AND cs.delivery_status IN ('Sent','Delivered','Acknowledged')
    ) INTO v_exit_meeting_done;
    IF NOT v_exit_meeting_done THEN
      v_reasons := v_reasons || 'Exit meeting must be completed before report issuance';
    END IF;
  END IF;

  -- Store gate status on report
  UPDATE ia_audit_reports SET issuance_gate_status = jsonb_build_object(
    'checked_at', now(),
    'passed', array_length(v_reasons, 1) IS NULL,
    'evidence_count', COALESCE(v_evidence_count, 0),
    'working_papers_count', COALESCE(v_wp_count, 0),
    'findings_count', COALESCE(v_findings_count, 0),
    'reasons', v_reasons
  ) WHERE id = p_report_id;

  RETURN jsonb_build_object(
    'can_issue', array_length(v_reasons, 1) IS NULL,
    'reasons', v_reasons,
    'evidence_count', COALESCE(v_evidence_count, 0),
    'working_papers_count', COALESCE(v_wp_count, 0),
    'findings_count', COALESCE(v_findings_count, 0)
  );
END;
$$;
