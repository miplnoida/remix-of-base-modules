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
    -- Leave conflicts (fixed: use a.name instead of a.full_name)
    FOR rec IN
      SELECT lr.id, lr.start_date, lr.end_date, lr.leave_type, a.name AS auditor_name
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
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_conflicts) = 0,
    'conflicts', v_conflicts,
    'total_conflicts', jsonb_array_length(v_conflicts),
    'has_blocking', EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_conflicts) c WHERE c->>'severity' = 'blocking'
    ),
    'checked_at', now()::text,
    'plan_id', p_plan_id,
    'engagement_id', p_engagement_id
  );
END;
$$;