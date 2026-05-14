-- Add calculation configuration columns to ce_risk_config
ALTER TABLE ce_risk_config
  ADD COLUMN IF NOT EXISTS data_source varchar DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS calculation_formula text,
  ADD COLUMN IF NOT EXISTS category varchar DEFAULT 'COMPLIANCE';

-- Seed calculation formulas for existing factors
UPDATE ce_risk_config SET 
  data_source = 'ARREARS_LEDGER',
  calculation_formula = 'IF total_arrears > 100000 THEN 100 ELIF total_arrears > 50000 THEN 75 ELIF total_arrears > 20000 THEN 50 ELIF total_arrears > 5000 THEN 25 ELSE 0',
  category = 'FINANCIAL',
  thresholds = '[{"min":0,"max":5000,"score":0,"label":"Minimal"},{"min":5001,"max":20000,"score":25,"label":"Low"},{"min":20001,"max":50000,"score":50,"label":"Moderate"},{"min":50001,"max":100000,"score":75,"label":"High"},{"min":100001,"max":999999999,"score":100,"label":"Critical"}]'::jsonb
WHERE factor_code = 'arrears';

UPDATE ce_risk_config SET 
  data_source = 'VIOLATION_HISTORY',
  calculation_formula = 'COUNT violations in last 24 months. Score = MIN(violation_count * 20, 100)',
  category = 'COMPLIANCE',
  thresholds = '[{"min":0,"max":0,"score":0,"label":"None"},{"min":1,"max":2,"score":20,"label":"Few"},{"min":3,"max":5,"score":50,"label":"Moderate"},{"min":6,"max":10,"score":80,"label":"Many"},{"min":11,"max":999,"score":100,"label":"Excessive"}]'::jsonb
WHERE factor_code = 'violations';

UPDATE ce_risk_config SET 
  data_source = 'C3_SUBMISSION_HISTORY',
  calculation_formula = 'COUNT missed C3 filings in last 12 months. Score = MIN(missed_count * 25, 100)',
  category = 'COMPLIANCE',
  thresholds = '[{"min":0,"max":0,"score":0,"label":"On Time"},{"min":1,"max":2,"score":25,"label":"Minor"},{"min":3,"max":4,"score":50,"label":"Frequent"},{"min":5,"max":8,"score":75,"label":"Chronic"},{"min":9,"max":999,"score":100,"label":"Severe"}]'::jsonb
WHERE factor_code = 'filings';

UPDATE ce_risk_config SET 
  data_source = 'PAYMENT_HISTORY',
  calculation_formula = 'Ratio of late payments to total payments in last 12 months. Score = late_ratio * 100',
  category = 'FINANCIAL',
  thresholds = '[{"min":0,"max":10,"score":0,"label":"Good"},{"min":11,"max":30,"score":25,"label":"Fair"},{"min":31,"max":60,"score":50,"label":"Poor"},{"min":61,"max":80,"score":75,"label":"Bad"},{"min":81,"max":100,"score":100,"label":"Critical"}]'::jsonb
WHERE factor_code = 'payment';

UPDATE ce_risk_config SET 
  data_source = 'LEGAL_HISTORY',
  calculation_formula = 'IF has_active_legal_case THEN 100 ELIF has_past_legal_case THEN 50 ELSE 0',
  category = 'BEHAVIOURAL',
  thresholds = '[{"min":0,"max":0,"score":0,"label":"None"},{"min":1,"max":1,"score":50,"label":"Past Case"},{"min":2,"max":999,"score":100,"label":"Active/Multiple"}]'::jsonb
WHERE factor_code = 'legal';