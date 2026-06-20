
-- ============================================================
-- BN Escalation Linkage: Workbasket SLA fields + assignments
-- ============================================================

-- 1. Workbasket SLA + escalation linkage columns
ALTER TABLE public.bn_workbasket
  ADD COLUMN IF NOT EXISTS default_escalation_policy_id UUID REFERENCES public.bn_escalation_policy(id),
  ADD COLUMN IF NOT EXISTS supervisor_role TEXT,
  ADD COLUMN IF NOT EXISTS manager_role TEXT,
  ADD COLUMN IF NOT EXISTS allow_auto_reassign BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS escalation_target_basket_id UUID REFERENCES public.bn_workbasket(id);

COMMENT ON COLUMN public.bn_workbasket.default_escalation_policy_id IS
  'Default SLA escalation policy for all tasks in this basket. Overridden by workflow-step-level policy.';
COMMENT ON COLUMN public.bn_workbasket.escalation_target_basket_id IS
  'Where to auto-reassign tasks when the escalation policy fires with auto_reassign=TRUE.';

CREATE INDEX IF NOT EXISTS idx_bn_workbasket_default_esc_policy
  ON public.bn_workbasket(default_escalation_policy_id)
  WHERE default_escalation_policy_id IS NOT NULL;

-- 2. Auto-assign seeded escalation policies to matching workbaskets by code prefix/keyword.
--    Best-effort linkage; admins can adjust via the Workbasket config screen.
WITH map AS (
  SELECT * FROM (VALUES
    ('INTAKE',              'INTAKE_REVIEW_24H'),
    ('DOCUMENT',            'DOCUMENT_REVIEW_48H'),
    ('ELIGIBILITY',         'ELIGIBILITY_REVIEW_48H'),
    ('MEDICAL',             'MEDICAL_BOARD_7D'),
    ('CALCULATION',         'CALCULATION_REVIEW_24H'),
    ('PAYMENT_APPROVAL',    'PAYMENT_APPROVAL_24H'),
    ('PAYMENT',             'PAYMENT_PREPARATION_24H'),
    ('OVERRIDE',            'OVERRIDE_REVIEW_24H'),
    ('APPEAL',              'APPEAL_REVIEW_14D'),
    ('DECISION',            'ELIGIBILITY_REVIEW_48H')
  ) AS m(keyword, policy_code)
),
candidates AS (
  SELECT DISTINCT ON (w.id)
    w.id AS workbasket_id, p.id AS policy_id
  FROM public.bn_workbasket w
  JOIN map m
    ON UPPER(w.basket_code) LIKE '%' || m.keyword || '%'
    OR UPPER(w.basket_name) LIKE '%' || m.keyword || '%'
  JOIN public.bn_escalation_policy p ON p.policy_code = m.policy_code
  WHERE w.default_escalation_policy_id IS NULL
  ORDER BY w.id,
    CASE m.keyword
      WHEN 'PAYMENT_APPROVAL' THEN 1
      WHEN 'INTAKE' THEN 2
      WHEN 'DOCUMENT' THEN 3
      WHEN 'ELIGIBILITY' THEN 4
      WHEN 'MEDICAL' THEN 5
      WHEN 'CALCULATION' THEN 6
      WHEN 'PAYMENT' THEN 7
      WHEN 'OVERRIDE' THEN 8
      WHEN 'APPEAL' THEN 9
      WHEN 'DECISION' THEN 10
      ELSE 99
    END
)
UPDATE public.bn_workbasket w
SET default_escalation_policy_id = c.policy_id
FROM candidates c
WHERE w.id = c.workbasket_id;

-- 3. Ensure escalation policies have escalation_target_basket_id populated where reasonable
--    (route auto-reassigns to the basket of the supervisor role, where one exists).
--    No-op for now (policies seeded with auto_reassign=FALSE); left to manual config.
