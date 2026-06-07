-- One-time backfill: ensure every active/draft BN product version has full comm mapping coverage
-- Baseline = SKN-AGE v1 (aa100001-6666-4000-a000-000000000009) which has the 20 canonical events.

WITH baseline AS (
  SELECT event_code, channel, recipient_type, template_id, is_required, fallback_priority, delivery_method
  FROM bn_comm_mapping
  WHERE bn_product_version_id = 'aa100001-6666-4000-a000-000000000009' AND active
),
targets AS (
  SELECT pv.id AS pv_id
  FROM bn_product_version pv
  JOIN bn_product p ON p.id = pv.product_id
  WHERE pv.status IN ('ACTIVE','DRAFT')
    AND pv.id <> 'aa100001-6666-4000-a000-000000000009'
    AND p.benefit_code NOT LIKE 'SKN-SVC-%'   -- services handled separately
)
INSERT INTO bn_comm_mapping (bn_product_version_id, event_code, channel, recipient_type, template_id, is_required, fallback_priority, delivery_method, active, created_by)
SELECT t.pv_id, b.event_code, b.channel, b.recipient_type, b.template_id, b.is_required, b.fallback_priority, b.delivery_method, true, 'SYSTEM-PARITY'
FROM targets t CROSS JOIN baseline b
WHERE NOT EXISTS (
  SELECT 1 FROM bn_comm_mapping cm
  WHERE cm.bn_product_version_id = t.pv_id
    AND cm.event_code = b.event_code
    AND cm.channel = b.channel
    AND cm.recipient_type = b.recipient_type
);

-- Services: lighter subset (submitted/approved/denied/evidence_requested) on EMAIL+SMS+IN_APP supervisor
WITH baseline AS (
  SELECT event_code, channel, recipient_type, template_id, is_required, fallback_priority, delivery_method
  FROM bn_comm_mapping
  WHERE bn_product_version_id = 'aa100001-6666-4000-a000-000000000009' AND active
    AND event_code IN ('bn.claim.submitted','bn.claim.approved','bn.claim.denied','bn.evidence.requested','bn.decision.pending')
),
svc_targets AS (
  SELECT pv.id AS pv_id
  FROM bn_product_version pv
  JOIN bn_product p ON p.id = pv.product_id
  WHERE pv.status IN ('ACTIVE','DRAFT')
    AND p.benefit_code LIKE 'SKN-SVC-%'
)
INSERT INTO bn_comm_mapping (bn_product_version_id, event_code, channel, recipient_type, template_id, is_required, fallback_priority, delivery_method, active, created_by)
SELECT t.pv_id, b.event_code, b.channel, b.recipient_type, b.template_id, b.is_required, b.fallback_priority, b.delivery_method, true, 'SYSTEM-PARITY'
FROM svc_targets t CROSS JOIN baseline b
WHERE NOT EXISTS (
  SELECT 1 FROM bn_comm_mapping cm
  WHERE cm.bn_product_version_id = t.pv_id
    AND cm.event_code = b.event_code
    AND cm.channel = b.channel
    AND cm.recipient_type = b.recipient_type
);

-- Parity report
SELECT p.benefit_code, pv.version_number, pv.status,
  (SELECT count(*) FROM bn_comm_mapping cm WHERE cm.bn_product_version_id=pv.id AND cm.active) AS comm_mappings
FROM bn_product_version pv JOIN bn_product p ON pv.product_id=p.id
WHERE pv.status IN ('ACTIVE','DRAFT') ORDER BY p.benefit_code, pv.version_number;
