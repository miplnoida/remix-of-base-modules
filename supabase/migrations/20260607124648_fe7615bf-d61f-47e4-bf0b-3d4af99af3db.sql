
-- Phase 1: Wire BN product version to workbaskets, escalation policy & external-task policy.
-- All FKs nullable + ON DELETE SET NULL so existing rows stay valid.

ALTER TABLE public.bn_product_version
  ADD COLUMN IF NOT EXISTS default_workbasket_id      uuid REFERENCES public.bn_workbasket(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intake_workbasket_id       uuid REFERENCES public.bn_workbasket(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eligibility_workbasket_id  uuid REFERENCES public.bn_workbasket(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS calculation_workbasket_id  uuid REFERENCES public.bn_workbasket(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_workbasket_id     uuid REFERENCES public.bn_workbasket(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_workbasket_id      uuid REFERENCES public.bn_workbasket(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escalation_policy_id       uuid REFERENCES public.bn_escalation_policy(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_task_policy       jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_bn_product_version_default_workbasket
  ON public.bn_product_version(default_workbasket_id);
CREATE INDEX IF NOT EXISTS idx_bn_product_version_escalation_policy
  ON public.bn_product_version(escalation_policy_id);

COMMENT ON COLUMN public.bn_product_version.default_workbasket_id IS
  'Phase 1: default workbasket for claims of this product version when no stage-specific basket matches.';
COMMENT ON COLUMN public.bn_product_version.external_task_policy IS
  'Phase 1: JSON policy describing required external participant tasks (employer/doctor/claimant) that block forward transitions.';
