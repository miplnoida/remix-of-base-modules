CREATE OR REPLACE FUNCTION public.fn_ce_create_plan_revision(p_plan_id uuid, p_reason text, p_actor character varying)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new_id uuid;
  v_orig   public.ce_weekly_plans%ROWTYPE;
  v_next_version int;
BEGIN
  SELECT * INTO v_orig FROM public.ce_weekly_plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan % not found', p_plan_id; END IF;
  IF v_orig.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Only APPROVED plans can be revised (current: %)', v_orig.status;
  END IF;
  IF v_orig.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Plan % is already superseded', v_orig.plan_number;
  END IF;

  SELECT COALESCE(MAX(version_no),1) + 1 INTO v_next_version
    FROM public.ce_weekly_plans
   WHERE COALESCE(parent_plan_id, id) = COALESCE(v_orig.parent_plan_id, v_orig.id);

  -- Mark the original APPROVED plan as no longer the current version so the
  -- editor surfaces the new DRAFT revision (still APPROVED + locked).
  UPDATE public.ce_weekly_plans
     SET is_current_version = false,
         updated_by = p_actor,
         updated_at = now()
   WHERE id = p_plan_id;

  INSERT INTO public.ce_weekly_plans (
    plan_number, inspector_id, inspector_name, week_start_date, week_end_date,
    status, total_planned_visits, completed_visits, narrative, zone_id,
    parent_plan_id, version_no, revision_reason, is_current_version,
    created_by, created_at, updated_by, updated_at
  )
  VALUES (
    v_orig.plan_number || '-R' || v_next_version,
    v_orig.inspector_id, v_orig.inspector_name, v_orig.week_start_date, v_orig.week_end_date,
    'DRAFT', v_orig.total_planned_visits, 0, v_orig.narrative, v_orig.zone_id,
    COALESCE(v_orig.parent_plan_id, v_orig.id), v_next_version, p_reason, true,
    p_actor, now(), p_actor, now()
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.ce_weekly_plan_items (
    plan_id, item_type, day_of_week, scheduled_date, scheduled_start_time, scheduled_end_time,
    duration, source_type, source_id, source_ref, employer_id, employer_name,
    area_name, territory, scouting_type, scouting_confidence, visit_type, purpose,
    priority, recommendation_score, is_mandatory, execution_status,
    zone_id, recommendation_reasons, recommendation_source, audit_cycle_due_date,
    created_by, created_at, updated_by, updated_at
  )
  SELECT
    v_new_id, item_type, day_of_week, scheduled_date, scheduled_start_time, scheduled_end_time,
    duration, source_type, source_id, source_ref, employer_id, employer_name,
    area_name, territory, scouting_type, scouting_confidence, visit_type, purpose,
    priority, recommendation_score, is_mandatory, 'PLANNED',
    zone_id, recommendation_reasons,
    COALESCE(recommendation_source,'CARRY_FORWARD'), audit_cycle_due_date,
    p_actor, now(), p_actor, now()
  FROM public.ce_weekly_plan_items
  WHERE plan_id = p_plan_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_plan_id, 'REVISION_REQUESTED', p_reason, p_actor, now());

  RETURN v_new_id;
END;
$function$;