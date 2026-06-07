-- Dedupe BN rule tables (keep earliest row per version+rule_code) and add uniqueness guards.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_version_id, rule_code ORDER BY entered_at NULLS LAST, id) AS rn
  FROM bn_eligibility_rule
)
DELETE FROM bn_eligibility_rule WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_version_id, rule_code ORDER BY entered_at NULLS LAST, id) AS rn
  FROM bn_calculation_rule
)
DELETE FROM bn_calculation_rule WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_version_id, rule_code ORDER BY entered_at NULLS LAST, id) AS rn
  FROM bn_timeline_rule
)
DELETE FROM bn_timeline_rule WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_eligibility_rule_version_code
  ON bn_eligibility_rule(product_version_id, rule_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_calculation_rule_version_code
  ON bn_calculation_rule(product_version_id, rule_code);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_timeline_rule_version_code
  ON bn_timeline_rule(product_version_id, rule_code);