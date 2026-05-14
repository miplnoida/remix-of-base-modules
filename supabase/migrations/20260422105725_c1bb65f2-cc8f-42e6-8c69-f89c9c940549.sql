-- 1. Supersede the two orphaned DRAFT revisions in family WP-2026-W18-EJ8U
UPDATE public.ce_weekly_plans
SET status = 'SUPERSEDED',
    is_current_version = false,
    updated_at = now()
WHERE id IN (
  '9e1c4574-cbc2-4005-bf47-5266785c0b07',  -- R2
  'a1e5c9c7-8c58-40f2-8124-0ff6e35f2174'   -- R3
)
AND status = 'DRAFT';

-- 2. Generic safeguard: close any older open versions in families
--    where a later version is already APPROVED.
WITH approved_max AS (
  SELECT COALESCE(parent_plan_id, id) AS root_id,
         week_start_date,
         MAX(version_no) FILTER (WHERE status = 'APPROVED') AS max_approved_version
  FROM public.ce_weekly_plans
  GROUP BY COALESCE(parent_plan_id, id), week_start_date
)
UPDATE public.ce_weekly_plans p
SET status = 'SUPERSEDED',
    is_current_version = false,
    updated_at = now()
FROM approved_max a
WHERE COALESCE(p.parent_plan_id, p.id) = a.root_id
  AND p.week_start_date = a.week_start_date
  AND a.max_approved_version IS NOT NULL
  AND p.version_no < a.max_approved_version
  AND p.status IN ('DRAFT','REVISION_DRAFT','SUBMITTED','QUERIED','REVISION_QUERIED','NEEDS_CHANGES','PENDING_APPROVAL');