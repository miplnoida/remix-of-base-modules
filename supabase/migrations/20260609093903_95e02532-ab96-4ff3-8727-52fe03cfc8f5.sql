
INSERT INTO public.bn_policy_area (code, display_name, description, sort_order, is_active)
SELECT 'CONFIG_PUBLISH', 'Configuration Publish',
       'Approvals required before a product version (incl. its rules) can move from Draft to Active.',
       100, true
WHERE NOT EXISTS (SELECT 1 FROM public.bn_policy_area WHERE code = 'CONFIG_PUBLISH');

ALTER TABLE public.bn_version_approval
  ADD COLUMN IF NOT EXISTS level INT,
  ADD COLUMN IF NOT EXISTS stage_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS approver_role VARCHAR(64),
  ADD COLUMN IF NOT EXISTS approver_workbasket_id UUID,
  ADD COLUMN IF NOT EXISTS decision VARCHAR(32),
  ADD COLUMN IF NOT EXISTS reason_code VARCHAR(64),
  ADD COLUMN IF NOT EXISTS rule_diff_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_bn_version_approval_pv
  ON public.bn_version_approval(product_version_id, level);

INSERT INTO public.bn_approval_policy
  (product_version_id, policy_area, action_code, is_enabled,
   approval_role, stage_code, stage_sequence, level,
   requires_justification, audit_required, self_approval_allowed)
SELECT pv.id, 'CONFIG_PUBLISH', 'REVIEW_VERSION', true,
       'BN_SUPERVISOR', 'CONFIG_REVIEW', 1, 1, true, true, false
FROM public.bn_product_version pv
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_approval_policy ap
  WHERE ap.product_version_id = pv.id
    AND ap.policy_area = 'CONFIG_PUBLISH'
    AND ap.action_code = 'REVIEW_VERSION'
);

INSERT INTO public.bn_approval_policy
  (product_version_id, policy_area, action_code, is_enabled,
   approval_role, stage_code, stage_sequence, level,
   requires_justification, audit_required, self_approval_allowed)
SELECT pv.id, 'CONFIG_PUBLISH', 'APPROVE_VERSION', true,
       'BN_DIRECTOR', 'CONFIG_APPROVE', 2, 2, true, true, false
FROM public.bn_product_version pv
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_approval_policy ap
  WHERE ap.product_version_id = pv.id
    AND ap.policy_area = 'CONFIG_PUBLISH'
    AND ap.action_code = 'APPROVE_VERSION'
);
