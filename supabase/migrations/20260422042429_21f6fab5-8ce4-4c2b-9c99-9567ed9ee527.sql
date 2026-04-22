-- ============================================================
-- COMPLIANCE FIELD PLANNING — PHASE 1
-- Reuse existing ce_risk_* + ce_weekly_plans foundation.
-- Add ONLY: zone awareness, audit-cycle awareness, explainability,
-- and plan-versioning scaffolding. Backward compatible.
-- ============================================================

-- ---------- 1. Risk profile: audit-cycle awareness ----------
-- next_review_date already exists; add last_inspected_at + audit_frequency_override
-- so the planner can resolve "due / overdue" without re-deriving each time.
ALTER TABLE public.ce_risk_profiles
  ADD COLUMN IF NOT EXISTS last_inspected_at      timestamptz,
  ADD COLUMN IF NOT EXISTS audit_frequency_override varchar(32),  -- e.g. MONTHLY, QUARTERLY, SEMIANNUAL, ANNUAL
  ADD COLUMN IF NOT EXISTS zone_id                uuid REFERENCES public.ce_zones(id);

CREATE INDEX IF NOT EXISTS idx_ce_risk_profiles_zone        ON public.ce_risk_profiles(zone_id);
CREATE INDEX IF NOT EXISTS idx_ce_risk_profiles_next_review ON public.ce_risk_profiles(next_review_date);

-- ---------- 2. Weekly plan: zone + revision/version scaffolding ----------
ALTER TABLE public.ce_weekly_plans
  ADD COLUMN IF NOT EXISTS zone_id          uuid REFERENCES public.ce_zones(id),
  ADD COLUMN IF NOT EXISTS parent_plan_id   uuid REFERENCES public.ce_weekly_plans(id),
  ADD COLUMN IF NOT EXISTS version_no       integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revision_reason  text,
  ADD COLUMN IF NOT EXISTS superseded_at    timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_plan_id uuid REFERENCES public.ce_weekly_plans(id),
  ADD COLUMN IF NOT EXISTS is_current_version boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_ce_weekly_plans_zone   ON public.ce_weekly_plans(zone_id);
CREATE INDEX IF NOT EXISTS idx_ce_weekly_plans_parent ON public.ce_weekly_plans(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_ce_weekly_plans_inspector_week ON public.ce_weekly_plans(inspector_id, week_start_date);

-- ---------- 3. Weekly plan items: explainability + zone ----------
ALTER TABLE public.ce_weekly_plan_items
  ADD COLUMN IF NOT EXISTS zone_id              uuid REFERENCES public.ce_zones(id),
  ADD COLUMN IF NOT EXISTS recommendation_reasons jsonb,           -- [{code, label, weight, detail}]
  ADD COLUMN IF NOT EXISTS recommendation_source varchar(32),       -- SMART_DRAFT | MANUAL | CARRY_FORWARD | OVERDUE_AUDIT
  ADD COLUMN IF NOT EXISTS audit_cycle_due_date date;               -- snapshot of next_review_date at plan time

CREATE INDEX IF NOT EXISTS idx_ce_weekly_plan_items_zone ON public.ce_weekly_plan_items(zone_id);

-- ---------- 4. Immutability guard for APPROVED plans ----------
-- Once a plan is APPROVED, only allow status -> SUPERSEDED via revision flow.
-- Edits to an approved plan must go through a new version row.
CREATE OR REPLACE FUNCTION public.fn_ce_weekly_plan_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'APPROVED'
     AND OLD.superseded_at IS NULL THEN
    -- Only allow superseded_at / superseded_by_plan_id / is_current_version / status->SUPERSEDED
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

DROP TRIGGER IF EXISTS trg_ce_weekly_plan_immutable ON public.ce_weekly_plans;
CREATE TRIGGER trg_ce_weekly_plan_immutable
  BEFORE UPDATE ON public.ce_weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_ce_weekly_plan_immutable_guard();

-- ---------- 5. Helper: create a revision of an approved plan ----------
CREATE OR REPLACE FUNCTION public.fn_ce_create_plan_revision(
  p_plan_id uuid,
  p_reason  text,
  p_actor   varchar
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
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
    COALESCE(v_orig.parent_plan_id, v_orig.id), v_next_version, p_reason, false,
    p_actor, now(), p_actor, now()
  )
  RETURNING id INTO v_new_id;

  -- Clone items into the new revision (execution state reset)
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

  -- Audit row
  INSERT INTO public.ce_weekly_plan_reviews (plan_id, action, comments, performed_by, performed_at)
  VALUES (p_plan_id, 'REVISION_REQUESTED', p_reason, p_actor, now());

  RETURN v_new_id;
END;
$$;

-- ---------- 6. Helper: promote an approved revision (supersede the previous current version) ----------
CREATE OR REPLACE FUNCTION public.fn_ce_promote_plan_revision(
  p_revision_id uuid,
  p_actor       varchar
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_rev    public.ce_weekly_plans%ROWTYPE;
  v_parent uuid;
BEGIN
  SELECT * INTO v_rev FROM public.ce_weekly_plans WHERE id = p_revision_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision % not found', p_revision_id; END IF;
  IF v_rev.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Only APPROVED revisions can be promoted (current: %)', v_rev.status;
  END IF;

  v_parent := COALESCE(v_rev.parent_plan_id, v_rev.id);

  -- Mark the prior current version as superseded
  UPDATE public.ce_weekly_plans
     SET superseded_at = now(),
         superseded_by_plan_id = p_revision_id,
         is_current_version = false,
         status = 'SUPERSEDED',
         updated_by = p_actor,
         updated_at = now()
   WHERE COALESCE(parent_plan_id, id) = v_parent
     AND id <> p_revision_id
     AND is_current_version = true;

  -- Mark this revision as current
  UPDATE public.ce_weekly_plans
     SET is_current_version = true,
         updated_by = p_actor,
         updated_at = now()
   WHERE id = p_revision_id;
END;
$$;

-- ---------- 7. Backward-compat view: plan history per family ----------
CREATE OR REPLACE VIEW public.ce_v_weekly_plan_versions AS
SELECT
  COALESCE(p.parent_plan_id, p.id) AS plan_family_id,
  p.id, p.plan_number, p.version_no, p.is_current_version,
  p.status, p.inspector_id, p.inspector_name, p.zone_id,
  p.week_start_date, p.week_end_date,
  p.parent_plan_id, p.revision_reason,
  p.superseded_at, p.superseded_by_plan_id,
  p.submitted_date, p.approved_date, p.approved_by,
  p.created_at, p.updated_at
FROM public.ce_weekly_plans p;

-- ---------- 8. Backfill: set every existing plan as version 1 / current ----------
UPDATE public.ce_weekly_plans
   SET version_no = 1, is_current_version = true
 WHERE version_no IS NULL OR is_current_version IS NULL;

-- ---------- 9. Backfill audit-cycle next_review_date on risk profiles ----------
-- Use band's audit_frequency to set a sensible next_review_date if missing.
WITH band_freq AS (
  SELECT b.band_name,
         CASE upper(COALESCE(b.audit_frequency,'ANNUAL'))
           WHEN 'MONTHLY'    THEN 30
           WHEN 'QUARTERLY'  THEN 90
           WHEN 'SEMIANNUAL' THEN 180
           WHEN 'BIANNUAL'   THEN 180
           WHEN 'ANNUAL'     THEN 365
           ELSE 365
         END AS days
  FROM public.ce_risk_bands b
)
UPDATE public.ce_risk_profiles rp
   SET next_review_date = (COALESCE(rp.last_calculated_at, now())::date + bf.days)
  FROM band_freq bf
 WHERE rp.next_review_date IS NULL
   AND rp.risk_band = bf.band_name;