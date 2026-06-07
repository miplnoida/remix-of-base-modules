
ALTER TABLE public.bn_approval_policy
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS max_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS next_level_workbasket_id UUID;

ALTER TABLE public.bn_claim_transition_rule
  ADD COLUMN IF NOT EXISTS creates_task_type VARCHAR(60),
  ADD COLUMN IF NOT EXISTS next_workbasket_id UUID;

CREATE INDEX IF NOT EXISTS idx_bn_approval_policy_pv_area_level
  ON public.bn_approval_policy(product_version_id, policy_area, level);
