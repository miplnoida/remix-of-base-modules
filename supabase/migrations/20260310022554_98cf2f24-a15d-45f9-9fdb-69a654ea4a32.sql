
-- Fix risk factor data for St Kitts & Nevis context (XCD currency)
-- Total weights must equal 100%

-- 1. Arrears Amount: 25% weight, tiered method, XCD-calibrated thresholds
UPDATE ce_risk_config SET 
  weight = 25,
  scoring_method = 'tiered',
  description = 'Total outstanding arrears across all funds (SS, LV, PE) in XCD',
  calculation_formula = 'Tiered scoring based on total XCD arrears. Thresholds calibrated for St Kitts & Nevis employer size.',
  thresholds = '[{"min":0,"max":10000,"score":0,"label":"Minimal (≤$10K XCD)"},{"min":10001,"max":50000,"score":25,"label":"Low ($10K–$50K XCD)"},{"min":50001,"max":150000,"score":50,"label":"Moderate ($50K–$150K XCD)"},{"min":150001,"max":500000,"score":75,"label":"High ($150K–$500K XCD)"},{"min":500001,"max":999999999,"score":100,"label":"Critical (>$500K XCD)"}]'::jsonb
WHERE factor_code = 'arrears';

-- 2. Repeated Violations: 25% weight, tiered method (was incorrectly "linear")
UPDATE ce_risk_config SET 
  weight = 25,
  scoring_method = 'tiered',
  description = 'Number of compliance violations in rolling 24-month period',
  calculation_formula = 'Count of violations recorded against employer in last 24 months. Scored by tier.',
  thresholds = '[{"min":0,"max":0,"score":0,"label":"None"},{"min":1,"max":2,"score":20,"label":"Minor (1–2)"},{"min":3,"max":5,"score":50,"label":"Moderate (3–5)"},{"min":6,"max":10,"score":80,"label":"Serious (6–10)"},{"min":11,"max":999,"score":100,"label":"Chronic (11+)"}]'::jsonb
WHERE factor_code = 'violations';

-- 3. Missed Filings: 20% weight, tiered method (was incorrectly "linear")
UPDATE ce_risk_config SET 
  weight = 20,
  scoring_method = 'tiered',
  description = 'Count of missed or late C3 submissions in rolling 12-month period',
  calculation_formula = 'Count of C3 filings not submitted by deadline in last 12 months. Monthly filers have 12 opportunities, weekly have more.',
  thresholds = '[{"min":0,"max":0,"score":0,"label":"All On Time"},{"min":1,"max":2,"score":25,"label":"Occasional (1–2)"},{"min":3,"max":4,"score":50,"label":"Frequent (3–4)"},{"min":5,"max":8,"score":75,"label":"Chronic (5–8)"},{"min":9,"max":999,"score":100,"label":"Severe (9+)"}]'::jsonb
WHERE factor_code = 'filings';

-- 4. Payment Behavior: 20% weight (was 15%), tiered method (was incorrectly "linear")
UPDATE ce_risk_config SET 
  weight = 20,
  scoring_method = 'tiered',
  description = 'Percentage of late or partial payments in rolling 12-month period',
  calculation_formula = 'Late payment ratio = (late_payments / total_payments) × 100 over last 12 months. Includes partial payments and broken payment plans.',
  thresholds = '[{"min":0,"max":10,"score":0,"label":"Good (≤10%)"},{"min":11,"max":30,"score":25,"label":"Fair (11–30%)"},{"min":31,"max":60,"score":50,"label":"Poor (31–60%)"},{"min":61,"max":80,"score":75,"label":"Bad (61–80%)"},{"min":81,"max":100,"score":100,"label":"Critical (81–100%)"}]'::jsonb
WHERE factor_code = 'payment';

-- 5. Legal History: 10% weight, threshold method (correct)
UPDATE ce_risk_config SET 
  weight = 10,
  scoring_method = 'threshold',
  description = 'Prior legal escalations, summons, writs, and judgments',
  calculation_formula = 'Boolean check: active legal case = 100, past resolved case = 50, no history = 0. Includes summons, writs, and JDS filings.',
  thresholds = '[{"min":0,"max":0,"score":0,"label":"No Legal History"},{"min":1,"max":1,"score":50,"label":"Past Resolved Case"},{"min":2,"max":999,"score":100,"label":"Active/Multiple Cases"}]'::jsonb
WHERE factor_code = 'legal';
