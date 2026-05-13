
-- ============================================================
-- PHASE 3 — Plan Revision Lifecycle
-- ============================================================

-- 1) Reason lookup
CREATE TABLE IF NOT EXISTS public.ce_plan_revision_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ce_plan_revision_reasons (reason_code, label, description, sort_order)
VALUES
  ('critical_new_violation', 'Critical new violation',          'A high-severity new violation requires immediate inclusion', 1),
  ('urgent_case',            'Urgent case',                     'An urgent compliance case demands re-prioritization',        2),
  ('employer_unavailable',   'Employer unavailable',            'Planned employer cannot be visited this week',               3),
  ('inspector_unavailable',  'Inspector unavailable',           'Inspector capacity changed (leave / illness / reassignment)',4),
  ('legal_direction',        'Legal direction',                 'Legal/enforcement direction requires plan adjustment',       5),
  ('manager_instruction',    'Manager instruction',             'Manager has directed a change to the approved plan',         6),
  ('zone_reprioritization',  'Zone re-prioritization',          'Zone-level priorities changed',                              7),
  ('capacity_rebalance',     'Capacity rebalance',              'Workload re-balancing across the week',                      8),
  ('other',                  'Other',                           'Other reason — please describe',                             9)
ON CONFLICT (reason_code) DO NOTHING;

-- 2) Add revision metadata columns (additive; backward compatible)
ALTER TABLE public.ce_weekly_plans
  ADD COLUMN IF NOT EXISTS base_version_no       int,
  ADD COLUMN IF NOT EXISTS is_revision           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_reason_code  text,
  ADD COLUMN IF NOT EXISTS revision_reason_text  text,
  ADD COLUMN IF NOT EXISTS supersedes_plan_id    uuid REFERENCES public.ce_weekly_plans(id),
  ADD COLUMN IF NOT EXISTS change_summary_json   jsonb,
  ADD COLUMN IF NOT EXISTS approval_decision_notes text,
  ADD COLUMN IF NOT EXISTS approved_version_flag boolean NOT NULL DEFAULT false;

-- Backfill approved_version_flag for existing approved current versions
UPDATE public.ce_weekly_plans
   SET approved_version_flag = true
 WHERE status = 'APPROVED'
   AND approved_version_flag = false;

-- 3) Mark items locked by execution: add column to flag preserved items in revision
ALTER TABLE public.ce_weekly_plan_items
  ADD COLUMN IF NOT EXISTS is_locked_by_execution boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_item_id uuid REFERENCES public.ce_weekly_plan_items(id);

-- 4) Update create-revision RPC: structured reason, execution safeguards
DROP FUNCTION IF EXISTS public.fn_ce_create_plan_revision(uuid, text, varchar);
CREATE OR REPLACE FUNCTION public.fn_ce_create_plan_revision(
  p_plan_id     uuid,
  p_reason_code text,
  p_reason_text text,
  p_actor       varchar
) RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_new_id uuid;
  v_orig   public.ce_weekly_plans%ROWTYPE;
  v_next_version int;
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

  SELECT COALESCE(MAX(version_no),1) + 1 INTO v_next_version
    FROM public.ce_weekly_plans
   WHERE COALESCE(parent_plan_id, id) = COALESCE(v_orig.parent_plan_id, v_orig.id);

  -- Mark original as not the editable current; remains APPROVED + locked.
  UPDATE public.ce_weekly_plans
     SET is_current_version = false,
         updated_by = p_actor,
         updated_at = now()
   WHERE id = p_plan_id;

  INSERT INTO public.ce_weekly_plans (
    plan_number, inspector_id, inspector_name, week_start_date, week_end_date,
    status, total_planned_visits, completed_visits, narrative, zone_id,
    parent_plan_id, version_no, base_version_no, is_revision,
    revision_reason, revision_reason_code, revision_reason_text,
    supersedes_plan_id, is_current_version,
    created_by, created_at, updated_by, updated_at
  )
  VALUES (
    v_orig.plan_number || '-R' || v_next_version,
    v_orig.inspector_id, v_orig.inspector_name, v_orig.week_start_date, v_orig.week_end_date,
    'REVISION_DRAFT', v_orig.total_planned_visits, 0, v_orig.narrative, v_orig.zone_id,
    COALESCE(v_orig.parent_plan_id, v_orig.id),
    v_next_version, v_orig.version_no, true,
    p_reason_text, p_reason_code, p_reason_text,
    p_plan_id, true,
    p_actor, now(), p_actor, now()
  )
  RETURNING id INTO v_new_id;

  -- Clone items. COMPLETED items are preserved as locked; IN_PROGRESS items are locked too.
  INSERT INTO public.ce_weekly_plan_items (
    plan_id, item_type, day_of_week, scheduled_date, scheduled_start_time, scheduled_end_time,
    duration, source_type, source_id, source_ref, employer_id, employer_name,
    area_name, territory, scouting_type, scouting_confidence, visit_type, purpose,
    priority, recommendation_score, is_mandatory, execution_status,
    zone_id, recommendation_reasons, recommendation_source, audit_cycle_due_date,
    is_locked_by_execution, source_item_id,
    created_by, created_at, updated_by, updated_at
  )
  SELECT
    v_new_id, item_type, day_of_week, scheduled_date, scheduled_start_time, scheduled_end_time,
    duration, source_type, source_id, source_ref, employer_id, employer_name,
    area_name, territory, scouting_type, scouting_confidence, visit_type, purpose,
    priority, recommendation_score, is_mandatory,
    CASE WHEN execution_status IN ('COMPLETED','IN_PROGRESS') THEN execution_status ELSE 'PLANNED' END,
    zone_id, recommendation_reasons,
    COALESCE(recommendation_source,'CARRY_FORWARD'), audit_cycle_due_date,
    (execution_status IN ('COMPLETED','IN_PROGRESS')),
    id,
    p_actor, now(), p_actor, now()
  FROM public.ce_weekly_plan_items
  WHERE plan_id = p_plan_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_plan_id, 'REVISION_REQUESTED',
          COALESCE(p_reason_text,'') || ' [code:' || p_reason_code || ']',
          p_actor, now());

  RETURN v_new_id;
END;
$$;

-- 5) Submit revision for re-approval
CREATE OR REPLACE FUNCTION public.fn_ce_submit_plan_revision(
  p_revision_id uuid, p_actor varchar
) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_rev public.ce_weekly_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status NOT IN ('REVISION_DRAFT','REVISION_QUERIED') THEN
    RAISE EXCEPTION 'Only REVISION_DRAFT/REVISION_QUERIED can be submitted (current: %)', v_rev.status;
  END IF;

  UPDATE public.ce_weekly_plans
     SET status = 'REVISION_SUBMITTED',
         submitted_date = now(),
         updated_by = p_actor, updated_at = now()
   WHERE id = p_revision_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_revision_id, 'REVISION_SUBMITTED', NULL, p_actor, now());
END;
$$;

-- 6) Approve revision -> auto-promote (supersedes the prior approved version)
CREATE OR REPLACE FUNCTION public.fn_ce_approve_plan_revision(
  p_revision_id uuid, p_decision_notes text, p_actor varchar
) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_rev public.ce_weekly_plans%ROWTYPE;
  v_parent uuid;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status <> 'REVISION_SUBMITTED' THEN
    RAISE EXCEPTION 'Only REVISION_SUBMITTED can be approved (current: %)', v_rev.status;
  END IF;
  v_parent := COALESCE(v_rev.parent_plan_id, v_rev.id);

  -- Mark prior current version SUPERSEDED
  UPDATE public.ce_weekly_plans
     SET superseded_at = now(),
         superseded_by_plan_id = p_revision_id,
         is_current_version = false,
         status = 'SUPERSEDED',
         approved_version_flag = false,
         updated_by = p_actor, updated_at = now()
   WHERE COALESCE(parent_plan_id, id) = v_parent
     AND id <> p_revision_id
     AND is_current_version = true;

  -- Mark this revision approved + current
  UPDATE public.ce_weekly_plans
     SET status = 'APPROVED',
         is_current_version = true,
         approved_version_flag = true,
         approved_date = now(),
         approved_by = p_actor,
         approval_decision_notes = p_decision_notes,
         updated_by = p_actor, updated_at = now()
   WHERE id = p_revision_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_revision_id, 'REVISION_APPROVED', p_decision_notes, p_actor, now());
END;
$$;

-- 7) Reject revision (keep previous approved version)
CREATE OR REPLACE FUNCTION public.fn_ce_reject_plan_revision(
  p_revision_id uuid, p_decision_notes text, p_actor varchar
) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_rev public.ce_weekly_plans%ROWTYPE;
        v_parent uuid;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status NOT IN ('REVISION_SUBMITTED','REVISION_DRAFT','REVISION_QUERIED') THEN
    RAISE EXCEPTION 'Cannot reject revision in status %', v_rev.status;
  END IF;
  v_parent := COALESCE(v_rev.parent_plan_id, v_rev.id);

  UPDATE public.ce_weekly_plans
     SET status = 'REVISION_REJECTED',
         is_current_version = false,
         approval_decision_notes = p_decision_notes,
         updated_by = p_actor, updated_at = now()
   WHERE id = p_revision_id;

  -- Restore prior version as current
  UPDATE public.ce_weekly_plans
     SET is_current_version = true,
         updated_by = p_actor, updated_at = now()
   WHERE id = v_rev.supersedes_plan_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_revision_id, 'REVISION_REJECTED', p_decision_notes, p_actor, now());
END;
$$;

-- 8) Query revision (send back for changes)
CREATE OR REPLACE FUNCTION public.fn_ce_query_plan_revision(
  p_revision_id uuid, p_query_notes text, p_actor varchar
) RETURNS void LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE v_rev public.ce_weekly_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status <> 'REVISION_SUBMITTED' THEN
    RAISE EXCEPTION 'Only REVISION_SUBMITTED can be queried (current: %)', v_rev.status;
  END IF;

  UPDATE public.ce_weekly_plans
     SET status = 'REVISION_QUERIED',
         reviewer_comments = p_query_notes,
         updated_by = p_actor, updated_at = now()
   WHERE id = p_revision_id;

  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_revision_id, 'REVISION_QUERIED', p_query_notes, p_actor, now());
END;
$$;

-- 9) Diff function — base vs revised
CREATE OR REPLACE FUNCTION public.fn_ce_compare_plan_versions(
  p_base_id uuid, p_revised_id uuid
) RETURNS jsonb
  LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $$
DECLARE
  v_added jsonb;
  v_removed jsonb;
  v_changed jsonb;
  v_coverage jsonb;
  v_summary jsonb;
BEGIN
  -- Items uniquely in revised (added)
  WITH base AS (SELECT * FROM public.ce_weekly_plan_items WHERE plan_id = p_base_id),
       rev  AS (SELECT * FROM public.ce_weekly_plan_items WHERE plan_id = p_revised_id)
  SELECT COALESCE(jsonb_agg(to_jsonb(r) - 'plan_id'), '[]'::jsonb)
    INTO v_added
    FROM rev r
   WHERE r.source_item_id IS NULL
      OR r.source_item_id NOT IN (SELECT id FROM base);

  -- Items in base but not preserved in revised (removed)
  WITH base AS (SELECT * FROM public.ce_weekly_plan_items WHERE plan_id = p_base_id),
       rev  AS (SELECT * FROM public.ce_weekly_plan_items WHERE plan_id = p_revised_id)
  SELECT COALESCE(jsonb_agg(to_jsonb(b) - 'plan_id'), '[]'::jsonb)
    INTO v_removed
    FROM base b
   WHERE b.id NOT IN (SELECT source_item_id FROM rev WHERE source_item_id IS NOT NULL);

  -- Changed items (preserved but with modifications)
  WITH base AS (SELECT * FROM public.ce_weekly_plan_items WHERE plan_id = p_base_id),
       rev  AS (SELECT * FROM public.ce_weekly_plan_items WHERE plan_id = p_revised_id)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id',            r.id,
      'source_item_id',r.source_item_id,
      'employer_name', r.employer_name,
      'changes', jsonb_strip_nulls(jsonb_build_object(
        'day_of_week',   CASE WHEN r.day_of_week IS DISTINCT FROM b.day_of_week
                              THEN jsonb_build_object('old', b.day_of_week, 'new', r.day_of_week) END,
        'scheduled_date',CASE WHEN r.scheduled_date IS DISTINCT FROM b.scheduled_date
                              THEN jsonb_build_object('old', b.scheduled_date, 'new', r.scheduled_date) END,
        'start_time',    CASE WHEN r.scheduled_start_time IS DISTINCT FROM b.scheduled_start_time
                              THEN jsonb_build_object('old', b.scheduled_start_time, 'new', r.scheduled_start_time) END,
        'end_time',      CASE WHEN r.scheduled_end_time IS DISTINCT FROM b.scheduled_end_time
                              THEN jsonb_build_object('old', b.scheduled_end_time, 'new', r.scheduled_end_time) END,
        'priority',      CASE WHEN r.priority IS DISTINCT FROM b.priority
                              THEN jsonb_build_object('old', b.priority, 'new', r.priority) END,
        'purpose',       CASE WHEN COALESCE(r.purpose,'') IS DISTINCT FROM COALESCE(b.purpose,'')
                              THEN jsonb_build_object('old', b.purpose, 'new', r.purpose) END,
        'is_mandatory',  CASE WHEN r.is_mandatory IS DISTINCT FROM b.is_mandatory
                              THEN jsonb_build_object('old', b.is_mandatory, 'new', r.is_mandatory) END,
        'item_type',     CASE WHEN r.item_type IS DISTINCT FROM b.item_type
                              THEN jsonb_build_object('old', b.item_type, 'new', r.item_type) END
      ))
  )), '[]'::jsonb)
    INTO v_changed
    FROM rev r
    JOIN base b ON b.id = r.source_item_id
   WHERE r.day_of_week         IS DISTINCT FROM b.day_of_week
      OR r.scheduled_date      IS DISTINCT FROM b.scheduled_date
      OR r.scheduled_start_time IS DISTINCT FROM b.scheduled_start_time
      OR r.scheduled_end_time   IS DISTINCT FROM b.scheduled_end_time
      OR r.priority            IS DISTINCT FROM b.priority
      OR COALESCE(r.purpose,'') IS DISTINCT FROM COALESCE(b.purpose,'')
      OR r.is_mandatory        IS DISTINCT FROM b.is_mandatory
      OR r.item_type           IS DISTINCT FROM b.item_type;

  -- Coverage impact
  WITH bcounts AS (
    SELECT
      COUNT(*)                                              AS total,
      COUNT(*) FILTER (WHERE is_mandatory)                  AS mandatory,
      COUNT(*) FILTER (WHERE priority IN ('CRITICAL','HIGH')) AS high_risk,
      COUNT(DISTINCT territory)                              AS zones
    FROM public.ce_weekly_plan_items WHERE plan_id = p_base_id
  ),
  rcounts AS (
    SELECT
      COUNT(*)                                              AS total,
      COUNT(*) FILTER (WHERE is_mandatory)                  AS mandatory,
      COUNT(*) FILTER (WHERE priority IN ('CRITICAL','HIGH')) AS high_risk,
      COUNT(DISTINCT territory)                              AS zones
    FROM public.ce_weekly_plan_items WHERE plan_id = p_revised_id
  )
  SELECT jsonb_build_object(
    'workload',    jsonb_build_object('old', b.total,     'new', r.total),
    'mandatory',   jsonb_build_object('old', b.mandatory, 'new', r.mandatory),
    'high_risk',   jsonb_build_object('old', b.high_risk, 'new', r.high_risk),
    'zone_spread', jsonb_build_object('old', b.zones,     'new', r.zones)
  ) INTO v_coverage FROM bcounts b, rcounts r;

  v_summary := jsonb_build_object(
    'added_count',    jsonb_array_length(v_added),
    'removed_count',  jsonb_array_length(v_removed),
    'changed_count',  jsonb_array_length(v_changed)
  );

  RETURN jsonb_build_object(
    'summary',  v_summary,
    'added',    v_added,
    'removed',  v_removed,
    'changed',  v_changed,
    'coverage', v_coverage
  );
END;
$$;

-- 10) Update immutable guard to allow controlled approve/reject metadata writes
CREATE OR REPLACE FUNCTION public.fn_ce_weekly_plan_immutable_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'APPROVED'
     AND OLD.superseded_at IS NULL THEN
    -- Only allow status transitions to SUPERSEDED/IN_EXECUTION/COMPLETED, plus controlled metadata
    IF (NEW.week_start_date IS DISTINCT FROM OLD.week_start_date)
       OR (NEW.week_end_date IS DISTINCT FROM OLD.week_end_date)
       OR (NEW.inspector_id  IS DISTINCT FROM OLD.inspector_id)
       OR (NEW.zone_id       IS DISTINCT FROM OLD.zone_id)
       OR (NEW.narrative     IS DISTINCT FROM OLD.narrative)
       OR (NEW.status NOT IN ('APPROVED','SUPERSEDED','COMPLETED','IN_EXECUTION'))
    THEN
      RAISE EXCEPTION 'Approved weekly plan % is immutable. Create a revision (new version) instead.', OLD.plan_number
        USING ERRCODE = '55006';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
