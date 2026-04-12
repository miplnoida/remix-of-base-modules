
-- Seed risk profiles for all active employers that don't have one yet
INSERT INTO ce_risk_profiles (employer_id, employer_name, territory, total_score, risk_band, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score, created_by, last_calculated_at)
SELECT 
  e.regno,
  COALESCE(e.name, 'Employer ' || e.regno),
  CASE e.office_code WHEN 'STK' THEN 'St. Kitts' WHEN 'NEV' THEN 'Nevis' ELSE COALESCE(e.office_code, 'Unknown') END,
  -- Generate realistic risk scores using a deterministic formula based on employer attributes
  CASE 
    WHEN e.legal_action = 'Y' THEN 55 + (abs(hashtext(e.regno)) % 30)  -- 55-84: HIGH/CRITICAL
    WHEN e.arrears = 'Y' AND e.legal_action IS DISTINCT FROM 'Y' THEN 28 + (abs(hashtext(e.regno || 'a')) % 22) -- 28-49: MEDIUM
    WHEN (e.females_employed + e.males_employed) > 50 THEN 15 + (abs(hashtext(e.regno || 'b')) % 20) -- 15-34: LOW-MEDIUM
    ELSE abs(hashtext(e.regno || 'c')) % 25  -- 0-24: LOW
  END as total_score,
  -- Band based on the same logic
  CASE 
    WHEN e.legal_action = 'Y' AND (55 + (abs(hashtext(e.regno)) % 30)) > 75 THEN 'CRITICAL'
    WHEN e.legal_action = 'Y' THEN 'HIGH'
    WHEN e.arrears = 'Y' AND e.legal_action IS DISTINCT FROM 'Y' THEN 'MEDIUM'
    WHEN (e.females_employed + e.males_employed) > 50 AND (15 + (abs(hashtext(e.regno || 'b')) % 20)) > 25 THEN 'MEDIUM'
    ELSE 'LOW'
  END as risk_band,
  -- Factor scores
  CASE WHEN e.arrears = 'Y' THEN 5 + (abs(hashtext(e.regno || 'arr')) % 15) ELSE abs(hashtext(e.regno || 'arr2')) % 5 END,
  CASE WHEN e.legal_action = 'Y' THEN 8 + (abs(hashtext(e.regno || 'vio')) % 12) ELSE abs(hashtext(e.regno || 'vio2')) % 4 END,
  abs(hashtext(e.regno || 'fil')) % 8,
  CASE WHEN e.arrears = 'Y' THEN 3 + (abs(hashtext(e.regno || 'pay')) % 10) ELSE abs(hashtext(e.regno || 'pay2')) % 5 END,
  CASE WHEN e.legal_action = 'Y' THEN 5 + (abs(hashtext(e.regno || 'leg')) % 10) ELSE 0 END,
  'SYSTEM_SEED',
  NOW()
FROM er_master e
WHERE e.status = 'A'
AND NOT EXISTS (SELECT 1 FROM ce_risk_profiles rp WHERE rp.employer_id = e.regno);
