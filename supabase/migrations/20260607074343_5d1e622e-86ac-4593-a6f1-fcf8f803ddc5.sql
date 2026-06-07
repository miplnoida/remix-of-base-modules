-- Phase 6: Migrate legacy bn_eligibility_override_request to unified bn_override_request, then drop the legacy table.

-- 1) Backfill any existing legacy rows into the unified table.
INSERT INTO public.bn_override_request (
  claim_id,
  product_version_id,
  policy_area,
  action_code,
  target_entity_type,
  target_entity_id,
  rule_code,
  current_value,
  requested_value,
  reason_code,
  justification,
  supporting_document_id,
  status,
  requested_by,
  requested_at,
  reviewed_by,
  reviewed_at,
  review_decision,
  review_notes,
  policy_id
)
SELECT
  legacy.claim_id,
  c.product_version_id,
  'ELIGIBILITY'::text                                            AS policy_area,
  'DEFAULT'::text                                                 AS action_code,
  CASE WHEN legacy.eligibility_result_id IS NOT NULL THEN 'bn_claim_eligibility' END AS target_entity_type,
  legacy.eligibility_result_id::text                              AS target_entity_id,
  legacy.rule_code,
  jsonb_build_object(
    'actual_value',     legacy.actual_value,
    'expected_value',   legacy.expected_value,
    'operator',         legacy.operator,
    'rule_group_code',  legacy.rule_group_code,
    'field_key',        legacy.field_key,
    'source',           legacy.source_table
  )                                                              AS current_value,
  jsonb_build_object('override_scope', legacy.override_scope, 'passed', true) AS requested_value,
  legacy.reason_code,
  legacy.justification,
  legacy.supporting_document_id,
  CASE
    WHEN legacy.status = 'PENDING'   THEN 'PENDING_APPROVAL'
    WHEN legacy.status = 'APPROVED'  THEN 'APPROVED'
    WHEN legacy.status = 'REJECTED'  THEN 'REJECTED'
    WHEN legacy.status = 'CANCELLED' THEN 'CANCELLED'
    ELSE 'PENDING_APPROVAL'
  END                                                            AS status,
  legacy.requested_by,
  legacy.requested_at,
  legacy.reviewed_by,
  legacy.reviewed_at,
  legacy.review_decision,
  legacy.review_notes,
  (SELECT p.id FROM public.bn_approval_policy p
     WHERE p.product_version_id = c.product_version_id
       AND p.policy_area = 'ELIGIBILITY'
       AND p.action_code = 'DEFAULT'
     LIMIT 1)
FROM public.bn_eligibility_override_request legacy
JOIN public.bn_claim c ON c.id = legacy.claim_id
WHERE c.product_version_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.bn_override_request u
    WHERE u.claim_id = legacy.claim_id
      AND u.policy_area = 'ELIGIBILITY'
      AND COALESCE(u.rule_code, '') = COALESCE(legacy.rule_code, '')
      AND u.requested_by = legacy.requested_by
      AND u.requested_at = legacy.requested_at
  );

-- 2) Drop the legacy table (and its dependents).
DROP TABLE IF EXISTS public.bn_eligibility_override_request CASCADE;