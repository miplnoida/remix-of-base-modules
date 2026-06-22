
-- =========================================================
-- PR2: notifications + team / staff dashboards backend
-- =========================================================

-- 1. Replace lg_assign_case with notification-aware version
CREATE OR REPLACE FUNCTION public.lg_assign_case(
  p_case_id          uuid,
  p_actor_user_code  text,
  p_reason           text DEFAULT 'intake',
  p_override_user_id uuid DEFAULT NULL,
  p_override_team    text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_case   public.lg_case%ROWTYPE;
  v_route  jsonb;
  v_pick   jsonb;
  v_team   text;
  v_team_id uuid;
  v_wb     text;
  v_strat  text;
  v_skill  text;
  v_user   uuid;
  v_code   text;
  v_prev   uuid;
  v_esc    text;
  v_pickReason text;
  v_manager uuid;
BEGIN
  SELECT * INTO v_case FROM public.lg_case WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lg_case % not found', p_case_id;
  END IF;

  IF p_override_user_id IS NOT NULL OR p_override_team IS NOT NULL THEN
    v_team := COALESCE(p_override_team, v_case.assigned_team_code);
    v_user := p_override_user_id;
    v_pickReason := 'manual_override';
  ELSE
    v_route := public.lg_resolve_route(
      v_case.case_source_code,
      v_case.case_type_code,
      v_case.current_stage_code,
      v_case.priority_code,
      NULL, NULL
    );

    IF v_route->>'validation_status' = 'ERROR' THEN
      RETURN jsonb_build_object('ok', false, 'route', v_route);
    END IF;

    v_team  := v_route->>'team_code';
    v_wb    := v_route->>'workbasket_code';
    v_strat := COALESCE(v_route->>'assignment_strategy','LEAST_ACTIVE');
    v_skill := v_route->>'required_skill';
    v_esc   := v_route->>'escalation_team_code';

    v_pick := public.lg_pick_assignee(v_team, v_strat, v_case.priority_code, v_skill);
    v_user := NULLIF(v_pick->>'assigned_to_user_id','')::uuid;
    v_code := v_pick->>'assigned_user_code';
    v_pickReason := v_pick->>'reason';

    IF v_user IS NULL AND v_esc IS NOT NULL THEN
      v_team := v_esc;
      v_pick := public.lg_pick_assignee(v_team, v_strat, v_case.priority_code, v_skill);
      v_user := NULLIF(v_pick->>'assigned_to_user_id','')::uuid;
      v_code := v_pick->>'assigned_user_code';
      v_pickReason := COALESCE(v_pick->>'reason','escalated');
    END IF;
  END IF;

  UPDATE public.lg_case_assignment
     SET is_current = false, unassigned_at = now()
   WHERE lg_case_id = p_case_id AND is_current = true
  RETURNING assigned_to_user_id INTO v_prev;

  INSERT INTO public.lg_case_assignment
    (lg_case_id, assigned_to_user_id, assigned_team_code, assigned_by, reason, is_current)
  VALUES
    (p_case_id, v_user, v_team, p_actor_user_code,
     COALESCE(v_pickReason, p_reason), true);

  INSERT INTO public.lg_case_assignment_history
    (lg_case_id, assigned_from_user_id, assigned_to_user_id, assigned_team_code,
     workbasket_code, strategy, reason, assigned_by, notes)
  VALUES
    (p_case_id, v_prev, v_user, v_team, v_wb, v_strat,
     p_reason, p_actor_user_code,
     CASE WHEN v_user IS NULL THEN 'Queued: ' || COALESCE(v_pickReason,'no_eligible_staff') END);

  UPDATE public.lg_case
     SET assigned_team_code = v_team,
         assigned_legal_officer_id = v_user,
         updated_by = p_actor_user_code,
         updated_at = now()
   WHERE id = p_case_id;

  -- Notifications
  IF v_user IS NOT NULL THEN
    BEGIN
      INSERT INTO public.in_app_notifications
        (user_id, title, body, link, notification_type, priority, module, related_record_id, metadata)
      VALUES (
        v_user,
        'New case assigned: ' || v_case.lg_case_no,
        'You have been assigned to ' || v_case.lg_case_no ||
          ' (' || COALESCE(v_case.case_type_code,'') || ', priority ' || v_case.priority_code || ').',
        '/legal/lg/cases/' || p_case_id::text,
        'legal_assignment',
        CASE WHEN v_case.priority_code IN ('HIGH','URGENT','CRITICAL') THEN 'high' ELSE 'normal' END,
        'LEGAL',
        p_case_id::text,
        jsonb_build_object('team_code', v_team, 'workbasket_code', v_wb,
                           'strategy', v_strat, 'reason', COALESCE(v_pickReason, p_reason))
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  ELSE
    -- Queued: notify team manager
    SELECT manager_user_id INTO v_manager FROM public.lg_team WHERE team_code = v_team;
    IF v_manager IS NOT NULL THEN
      BEGIN
        INSERT INTO public.in_app_notifications
          (user_id, title, body, link, notification_type, priority, module, related_record_id, metadata)
        VALUES (
          v_manager,
          'Case queued: ' || v_case.lg_case_no,
          'No staff in team ' || v_team || ' has capacity. ' || v_case.lg_case_no || ' is held in the team queue.',
          '/legal/lg/cases/' || p_case_id::text,
          'legal_capacity_alert',
          'high',
          'LEGAL',
          p_case_id::text,
          jsonb_build_object('team_code', v_team, 'reason', v_pickReason)
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'team_code',           v_team,
    'workbasket_code',     v_wb,
    'strategy',            v_strat,
    'assigned_to_user_id', v_user,
    'assigned_user_code',  v_code,
    'reason',              v_pickReason,
    'queued',              (v_user IS NULL)
  );
END
$fn$;

GRANT EXECUTE ON FUNCTION public.lg_assign_case(uuid,text,text,uuid,text)
  TO authenticated, service_role;

-- 2. Team metrics view (dashboards)
CREATE OR REPLACE VIEW public.lg_team_metrics AS
SELECT
  t.id                                                              AS team_id,
  t.team_code,
  t.team_name,
  t.manager_user_id,
  COALESCE(c.open_cases, 0)                                         AS open_cases,
  COALESCE(c.assigned_cases, 0)                                     AS assigned_cases,
  COALESCE(c.unassigned_cases, 0)                                   AS unassigned_cases,
  COALESCE(c.high_priority, 0)                                      AS high_priority_cases,
  COALESCE(c.avg_age_days, 0)                                       AS avg_age_days,
  COALESCE(s.total_capacity, 0)                                     AS total_capacity,
  COALESCE(s.current_load, 0)                                       AS current_load,
  CASE WHEN COALESCE(s.total_capacity,0) > 0
       THEN ROUND( (COALESCE(s.current_load,0)::numeric / s.total_capacity) * 100, 1)
       ELSE 0 END                                                   AS capacity_pct
FROM public.lg_team t
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE lc.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED'))               AS open_cases,
    COUNT(*) FILTER (WHERE lc.assigned_legal_officer_id IS NOT NULL
                     AND lc.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED'))                  AS assigned_cases,
    COUNT(*) FILTER (WHERE lc.assigned_legal_officer_id IS NULL
                     AND lc.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED'))                  AS unassigned_cases,
    COUNT(*) FILTER (WHERE lc.priority_code IN ('HIGH','URGENT','CRITICAL')
                     AND lc.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED'))                  AS high_priority,
    ROUND(AVG(EXTRACT(EPOCH FROM (now() - lc.opened_date::timestamptz)) / 86400)
          FILTER (WHERE lc.status_code NOT IN ('CLOSED','WITHDRAWN','DISMISSED')))                  AS avg_age_days
  FROM public.lg_case lc
  WHERE lc.assigned_team_code = t.team_code
) c ON TRUE
LEFT JOIN LATERAL (
  SELECT
    SUM(s.max_active_cases)::int AS total_capacity,
    SUM(w.active_cases)::int     AS current_load
  FROM public.lg_staff s
  LEFT JOIN public.lg_staff_workload w ON w.staff_id = s.id
  WHERE s.team_id = t.id AND s.is_active = true AND s.availability = 'available'
) s ON TRUE;

GRANT SELECT ON public.lg_team_metrics TO authenticated, service_role;

-- 3. Reports view: cases per assignee
CREATE OR REPLACE VIEW public.lg_case_team_summary AS
SELECT
  lc.assigned_team_code,
  lc.assigned_legal_officer_id,
  lc.status_code,
  lc.priority_code,
  COUNT(*)::int AS case_count
FROM public.lg_case lc
GROUP BY lc.assigned_team_code, lc.assigned_legal_officer_id, lc.status_code, lc.priority_code;

GRANT SELECT ON public.lg_case_team_summary TO authenticated, service_role;
