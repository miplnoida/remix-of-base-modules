-- 1. Patch the function to supersede ALL prior non-terminal versions
CREATE OR REPLACE FUNCTION public.fn_ce_approve_plan_revision(p_revision_id uuid, p_decision_notes text, p_actor character varying)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

  -- Supersede ALL prior non-terminal versions in this family (not just the "current" one).
  -- This guarantees only one APPROVED version per family/week.
  UPDATE public.ce_weekly_plans
     SET superseded_at = now(),
         superseded_by_plan_id = p_revision_id,
         is_current_version = false,
         status = 'SUPERSEDED',
         approved_version_flag = false,
         updated_by = p_actor, updated_at = now()
   WHERE COALESCE(parent_plan_id, id) = v_parent
     AND id <> p_revision_id
     AND status NOT IN ('SUPERSEDED','REJECTED','CANCELLED','WITHDRAWN');

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
$function$;

-- 2. Repair existing data: any family with >1 APPROVED version → keep only the highest version_no APPROVED
WITH latest_approved AS (
  SELECT COALESCE(parent_plan_id, id) AS root_id,
         week_start_date,
         MAX(version_no) AS keep_version
  FROM public.ce_weekly_plans
  WHERE status = 'APPROVED'
  GROUP BY COALESCE(parent_plan_id, id), week_start_date
  HAVING COUNT(*) > 1
)
UPDATE public.ce_weekly_plans p
   SET status = 'SUPERSEDED',
       is_current_version = false,
       approved_version_flag = false,
       superseded_at = now(),
       superseded_by_plan_id = (
         SELECT id FROM public.ce_weekly_plans x
         WHERE COALESCE(x.parent_plan_id, x.id) = la.root_id
           AND x.week_start_date = la.week_start_date
           AND x.version_no = la.keep_version
         LIMIT 1
       ),
       updated_at = now()
  FROM latest_approved la
 WHERE COALESCE(p.parent_plan_id, p.id) = la.root_id
   AND p.week_start_date = la.week_start_date
   AND p.status = 'APPROVED'
   AND p.version_no < la.keep_version;