-- =========================================================
-- Helper: backfill stranded APPROVED siblings inside a family
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_ce_supersede_stranded_approved(p_root_id uuid, p_keep_id uuid, p_actor varchar)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.ce_weekly_plans
     SET status = 'SUPERSEDED',
         is_current_version = false,
         approved_version_flag = false,
         superseded_at = COALESCE(superseded_at, now()),
         superseded_by_plan_id = COALESCE(superseded_by_plan_id, p_keep_id),
         updated_by = p_actor, updated_at = now()
   WHERE COALESCE(parent_plan_id, id) = p_root_id
     AND id <> p_keep_id
     AND status IN ('APPROVED','IN_EXECUTION')
     AND is_current_version = false;
END $$;

-- =========================================================
-- SUBMIT: auto-withdraw any APPROVED/IN_EXECUTION prior version in family
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_ce_submit_plan_revision(p_revision_id uuid, p_actor character varying)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_rev public.ce_weekly_plans%ROWTYPE; v_root uuid;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status NOT IN ('REVISION_DRAFT','REVISION_QUERIED') THEN
    RAISE EXCEPTION 'Only REVISION_DRAFT/REVISION_QUERIED can be submitted (current: %)', v_rev.status;
  END IF;
  v_root := COALESCE(v_rev.parent_plan_id, v_rev.id);

  -- Auto-withdraw older APPROVED / IN_EXECUTION versions in the same family
  UPDATE public.ce_weekly_plans
     SET status = 'SUPERSEDED',
         is_current_version = false,
         approved_version_flag = false,
         superseded_at = now(),
         superseded_by_plan_id = p_revision_id,
         updated_by = p_actor, updated_at = now()
   WHERE COALESCE(parent_plan_id, id) = v_root
     AND id <> p_revision_id
     AND status IN ('APPROVED','IN_EXECUTION');

  UPDATE public.ce_weekly_plans
     SET status = 'REVISION_SUBMITTED',
         submitted_date = now(),
         is_current_version = true,
         updated_by = p_actor, updated_at = now()
   WHERE id = p_revision_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_revision_id, 'REVISION_SUBMITTED', 'Auto-withdrew prior approved version on submit.', p_actor, now());
END $$;

-- =========================================================
-- CREATE: also backfill any stranded APPROVED siblings
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_ce_create_plan_revision(p_plan_id uuid, p_reason_code text, p_reason_text text, p_actor character varying)
RETURNS uuid LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_new_id uuid; v_orig public.ce_weekly_plans%ROWTYPE;
  v_next_version int; v_root_id uuid; v_open_rev RECORD;
BEGIN
  SELECT * INTO v_orig FROM public.ce_weekly_plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan % not found', p_plan_id; END IF;
  IF v_orig.status NOT IN ('APPROVED','IN_EXECUTION') THEN
    RAISE EXCEPTION 'Only APPROVED or IN_EXECUTION plans can be revised (current: %)', v_orig.status;
  END IF;
  IF v_orig.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Plan % is already superseded', v_orig.plan_number;
  END IF;
  IF p_reason_code IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.ce_plan_revision_reasons WHERE reason_code = p_reason_code AND enabled
  ) THEN
    RAISE EXCEPTION 'Invalid revision reason code: %', p_reason_code;
  END IF;

  v_root_id := COALESCE(v_orig.parent_plan_id, v_orig.id);

  SELECT id, plan_number, status INTO v_open_rev
    FROM public.ce_weekly_plans
   WHERE COALESCE(parent_plan_id, id) = v_root_id
     AND status IN ('DRAFT','REVISION_DRAFT','SUBMITTED','REVISION_SUBMITTED','QUERIED','REVISION_QUERIED','PENDING_APPROVAL')
   ORDER BY version_no DESC LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'A revision is already in progress (% — status %). Please complete or withdraw it before requesting a new revision.',
      v_open_rev.plan_number, v_open_rev.status;
  END IF;

  -- Backfill: supersede any stranded older APPROVED siblings (keep the one being revised)
  PERFORM public.fn_ce_supersede_stranded_approved(v_root_id, p_plan_id, p_actor);

  SELECT COALESCE(MAX(version_no),1) + 1 INTO v_next_version
    FROM public.ce_weekly_plans
   WHERE COALESCE(parent_plan_id, id) = v_root_id;

  UPDATE public.ce_weekly_plans
     SET is_current_version = false,
         updated_by = p_actor, updated_at = now()
   WHERE id = p_plan_id;

  INSERT INTO public.ce_weekly_plans (
    plan_number, inspector_id, inspector_name, week_start_date, week_end_date,
    status, total_planned_visits, completed_visits, narrative, zone_id,
    parent_plan_id, version_no, base_version_no, is_revision,
    revision_reason, revision_reason_code, revision_reason_text,
    supersedes_plan_id, is_current_version,
    created_by, created_at, updated_by, updated_at
  ) VALUES (
    v_orig.plan_number || '-R' || v_next_version,
    v_orig.inspector_id, v_orig.inspector_name, v_orig.week_start_date, v_orig.week_end_date,
    'REVISION_DRAFT', v_orig.total_planned_visits, 0, v_orig.narrative, v_orig.zone_id,
    v_root_id, v_next_version, v_orig.version_no, true,
    p_reason_text, p_reason_code, p_reason_text,
    p_plan_id, true,
    p_actor, now(), p_actor, now()
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.ce_weekly_plan_items (
    plan_id, item_type, day_of_week, scheduled_date, scheduled_start_time, scheduled_end_time,
    duration, source_type, source_id, source_ref, employer_id, employer_name,
    area_name, territory, scouting_type, scouting_confidence, visit_type, purpose,
    priority, recommendation_score, is_mandatory, execution_status,
    zone_id, recommendation_reasons, recommendation_source, audit_cycle_due_date,
    is_locked_by_execution, source_item_id,
    created_by, created_at, updated_by, updated_at
  )
  SELECT v_new_id, item_type, day_of_week, scheduled_date, scheduled_start_time, scheduled_end_time,
    duration, source_type, source_id, source_ref, employer_id, employer_name,
    area_name, territory, scouting_type, scouting_confidence, visit_type, purpose,
    priority, recommendation_score, is_mandatory,
    CASE WHEN execution_status IN ('COMPLETED','IN_PROGRESS') THEN execution_status ELSE 'PLANNED' END,
    zone_id, recommendation_reasons, COALESCE(recommendation_source,'CARRY_FORWARD'), audit_cycle_due_date,
    (execution_status IN ('COMPLETED','IN_PROGRESS')), id,
    p_actor, now(), p_actor, now()
  FROM public.ce_weekly_plan_items WHERE plan_id = p_plan_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_plan_id, 'REVISION_REQUESTED',
          COALESCE(p_reason_text,'') || ' [code:' || p_reason_code || ']', p_actor, now());

  RETURN v_new_id;
END $$;

-- =========================================================
-- REJECT: only restore prior version if no other APPROVED exists
-- =========================================================
CREATE OR REPLACE FUNCTION public.fn_ce_reject_plan_revision(p_revision_id uuid, p_decision_notes text, p_actor character varying)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_rev public.ce_weekly_plans%ROWTYPE; v_root uuid; v_other_approved int;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status NOT IN ('REVISION_SUBMITTED','REVISION_DRAFT','REVISION_QUERIED') THEN
    RAISE EXCEPTION 'Cannot reject revision in status %', v_rev.status;
  END IF;
  v_root := COALESCE(v_rev.parent_plan_id, v_rev.id);

  UPDATE public.ce_weekly_plans
     SET status = 'REVISION_REJECTED',
         is_current_version = false,
         approval_decision_notes = p_decision_notes,
         updated_by = p_actor, updated_at = now()
   WHERE id = p_revision_id;

  -- Only restore prior version as current if no other approved exists in family
  SELECT COUNT(*) INTO v_other_approved
    FROM public.ce_weekly_plans
   WHERE COALESCE(parent_plan_id, id) = v_root
     AND id <> p_revision_id
     AND status = 'APPROVED';

  IF v_other_approved = 0 AND v_rev.supersedes_plan_id IS NOT NULL THEN
    UPDATE public.ce_weekly_plans
       SET is_current_version = true,
           status = CASE WHEN status = 'SUPERSEDED' THEN 'APPROVED' ELSE status END,
           approved_version_flag = true,
           superseded_at = NULL,
           superseded_by_plan_id = NULL,
           updated_by = p_actor, updated_at = now()
     WHERE id = v_rev.supersedes_plan_id;
  END IF;

  -- Backfill any stranded older approved (keep only one)
  PERFORM public.fn_ce_supersede_stranded_approved(v_root, v_rev.supersedes_plan_id, p_actor);

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_revision_id, 'REVISION_REJECTED', p_decision_notes, p_actor, now());
END $$;

-- =========================================================
-- DATA BACKFILL: any family with multiple "live" (non-terminal) versions
-- → keep the highest version_no live, mark older ones SUPERSEDED.
-- =========================================================
WITH live AS (
  SELECT id, COALESCE(parent_plan_id, id) AS root_id, week_start_date, version_no, status
  FROM public.ce_weekly_plans
  WHERE status NOT IN ('SUPERSEDED','REJECTED','CANCELLED','WITHDRAWN','REVISION_REJECTED')
),
keep AS (
  SELECT root_id, week_start_date, MAX(version_no) AS keep_version
  FROM live GROUP BY root_id, week_start_date HAVING COUNT(*) > 1
),
keep_ids AS (
  SELECT k.root_id, k.week_start_date,
         (SELECT id FROM public.ce_weekly_plans x
           WHERE COALESCE(x.parent_plan_id, x.id) = k.root_id
             AND x.week_start_date = k.week_start_date
             AND x.version_no = k.keep_version LIMIT 1) AS keep_id
  FROM keep k
)
UPDATE public.ce_weekly_plans p
   SET status = 'SUPERSEDED',
       is_current_version = false,
       approved_version_flag = false,
       superseded_at = COALESCE(p.superseded_at, now()),
       superseded_by_plan_id = COALESCE(p.superseded_by_plan_id, ki.keep_id),
       updated_at = now()
  FROM keep_ids ki
 WHERE COALESCE(p.parent_plan_id, p.id) = ki.root_id
   AND p.week_start_date = ki.week_start_date
   AND p.id <> ki.keep_id
   AND p.status NOT IN ('SUPERSEDED','REJECTED','CANCELLED','WITHDRAWN','REVISION_REJECTED');