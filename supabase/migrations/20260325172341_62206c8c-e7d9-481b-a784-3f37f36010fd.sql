
-- ============================================================
-- Phase 2: Function 1 — ia_validate_team_availability
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_validate_team_availability(
  p_plan_id uuid DEFAULT NULL,
  p_engagement_id uuid DEFAULT NULL,
  p_auditor_ids uuid[] DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflicts jsonb := '[]'::jsonb;
  v_auditor uuid;
  v_start date;
  v_end date;
  v_team uuid[];
  rec record;
BEGIN
  -- Resolve dates and team from engagement or plan if not explicitly provided
  IF p_engagement_id IS NOT NULL THEN
    SELECT planned_start_date, planned_end_date,
           COALESCE(
             ARRAY(SELECT unnest(COALESCE(team_member_ids, '[]'::jsonb)::text[])::uuid) || ARRAY[lead_auditor_id],
             ARRAY[lead_auditor_id]
           )
    INTO v_start, v_end, v_team
    FROM ia_audit_engagements WHERE id = p_engagement_id;
  ELSIF p_plan_id IS NOT NULL THEN
    SELECT MIN(e.planned_start_date), MAX(e.planned_end_date)
    INTO v_start, v_end
    FROM ia_audit_engagements e WHERE e.annual_plan_id = p_plan_id;

    SELECT ARRAY(
      SELECT DISTINCT x::uuid FROM (
        SELECT jsonb_array_elements_text(COALESCE(e.team_member_ids, '[]'::jsonb)) AS x
        FROM ia_audit_engagements e WHERE e.annual_plan_id = p_plan_id
        UNION
        SELECT e.lead_auditor_id::text FROM ia_audit_engagements e
        WHERE e.annual_plan_id = p_plan_id AND e.lead_auditor_id IS NOT NULL
      ) sub WHERE x IS NOT NULL
    ) INTO v_team;
  END IF;

  -- Override with explicit params
  v_start := COALESCE(p_date_from, v_start);
  v_end := COALESCE(p_date_to, v_end);
  v_team := COALESCE(p_auditor_ids, v_team);

  IF v_start IS NULL OR v_end IS NULL OR v_team IS NULL OR array_length(v_team, 1) IS NULL THEN
    RETURN jsonb_build_object('valid', true, 'conflicts', '[]'::jsonb, 'total_conflicts', 0, 'has_blocking', false, 'message', 'No dates or team to check');
  END IF;

  -- Check holidays
  FOR rec IN
    SELECT h.name, h.date AS conflict_date
    FROM ia_holidays h
    WHERE h.is_active = true AND h.date BETWEEN v_start AND v_end
  LOOP
    v_conflicts := v_conflicts || jsonb_build_object(
      'type', 'holiday', 'date', rec.conflict_date, 'reference', rec.name,
      'severity', 'warning', 'affects_all', true
    );
  END LOOP;

  -- Check leave requests and overlapping engagements per auditor
  FOREACH v_auditor IN ARRAY v_team LOOP
    -- Leave conflicts
    FOR rec IN
      SELECT lr.id, lr.start_date, lr.end_date, lr.leave_type, a.full_name AS auditor_name
      FROM ia_leave_requests lr
      JOIN ia_auditors a ON a.id = lr.auditor_id
      WHERE lr.auditor_id = v_auditor
        AND lr.status IN ('Approved', 'Pending')
        AND lr.start_date <= v_end AND lr.end_date >= v_start
    LOOP
      v_conflicts := v_conflicts || jsonb_build_object(
        'type', 'leave', 'auditor_id', v_auditor, 'auditor_name', rec.auditor_name,
        'date_start', rec.start_date, 'date_end', rec.end_date,
        'leave_type', rec.leave_type, 'reference', rec.id::text,
        'severity', CASE WHEN rec.leave_type IN ('Annual','Sick') THEN 'blocking' ELSE 'warning' END
      );
    END LOOP;

    -- Engagement overlap
    FOR rec IN
      SELECT e.id, e.engagement_name, e.planned_start_date, e.planned_end_date
      FROM ia_audit_engagements e
      WHERE (e.lead_auditor_id = v_auditor
             OR v_auditor::text IN (SELECT jsonb_array_elements_text(COALESCE(e.team_member_ids, '[]'::jsonb))))
        AND e.status NOT IN ('Completed', 'Cancelled')
        AND e.planned_start_date <= v_end AND e.planned_end_date >= v_start
        AND e.id IS DISTINCT FROM p_engagement_id
    LOOP
      v_conflicts := v_conflicts || jsonb_build_object(
        'type', 'engagement_overlap', 'auditor_id', v_auditor,
        'date_start', rec.planned_start_date, 'date_end', rec.planned_end_date,
        'reference', rec.engagement_name, 'severity', 'warning'
      );
    END LOOP;
  END LOOP;

  -- Store conflicts if context provided
  IF p_plan_id IS NOT NULL OR p_engagement_id IS NOT NULL THEN
    DELETE FROM ia_availability_conflicts
    WHERE (plan_id IS NOT DISTINCT FROM p_plan_id AND p_plan_id IS NOT NULL)
       OR (engagement_id IS NOT DISTINCT FROM p_engagement_id AND p_engagement_id IS NOT NULL);

    INSERT INTO ia_availability_conflicts (plan_id, engagement_id, auditor_id, conflict_type,
      conflict_date_start, conflict_date_end, conflict_reference, severity)
    SELECT p_plan_id, p_engagement_id,
      (c->>'auditor_id')::uuid, c->>'type',
      COALESCE((c->>'date_start')::date, (c->>'date')::date),
      COALESCE((c->>'date_end')::date, (c->>'date')::date),
      c->>'reference', c->>'severity'
    FROM jsonb_array_elements(v_conflicts) c
    WHERE c->>'auditor_id' IS NOT NULL;

    IF p_plan_id IS NOT NULL THEN
      UPDATE ia_annual_plans SET
        last_conflict_check_at = now(),
        conflict_check_result = jsonb_build_object(
          'count', jsonb_array_length(v_conflicts),
          'has_blocking', EXISTS(SELECT 1 FROM jsonb_array_elements(v_conflicts) x WHERE x->>'severity' = 'blocking')
        )
      WHERE id = p_plan_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_conflicts) x WHERE x->>'severity' = 'blocking'),
    'conflicts', v_conflicts,
    'total_conflicts', jsonb_array_length(v_conflicts),
    'has_blocking', EXISTS(SELECT 1 FROM jsonb_array_elements(v_conflicts) x WHERE x->>'severity' = 'blocking')
  );
END;
$$;

-- ============================================================
-- Phase 2: Function 2 — ia_can_start_engagement
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_can_start_engagement(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_plan_status text;
  v_reasons text[] := '{}';
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

  RETURN jsonb_build_object(
    'can_start', array_length(v_reasons, 1) IS NULL,
    'reasons', v_reasons,
    'engagement_status', v_eng.status,
    'plan_status', v_eng.plan_status
  );
END;
$$;

-- ============================================================
-- Phase 2: Function 3 — ia_can_issue_report
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_can_issue_report(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    IF v_gate.require_management_responses THEN
      SELECT count(*) INTO v_responses_pending
      FROM ia_findings f
      LEFT JOIN ia_management_responses mr ON mr.finding_id = f.id
      WHERE f.engagement_id = v_eng_id AND mr.id IS NULL;
      IF v_responses_pending > 0 THEN
        v_reasons := v_reasons || (v_responses_pending || ' finding(s) missing management response');
      END IF;
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
