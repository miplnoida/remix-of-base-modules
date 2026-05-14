
GRANT SELECT, INSERT, UPDATE, DELETE ON ce_risk_profiles TO anon, authenticated, service_role;

INSERT INTO ce_risk_profiles (employer_id, employer_name, territory, total_score, risk_band, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score, created_by, last_calculated_at)
SELECT 
  e.regno,
  COALESCE(e.name, 'Employer ' || e.regno),
  CASE e.office_code WHEN 'STK' THEN 'St. Kitts' WHEN 'NEV' THEN 'Nevis' ELSE COALESCE(e.office_code, 'Unknown') END,
  CASE 
    WHEN e.legal_action = 'Y' THEN 55 + MOD(('x' || LEFT(md5(e.regno), 8))::bit(32)::int & 2147483647, 30)
    WHEN e.arrears = 'Y' THEN 28 + MOD(('x' || LEFT(md5(e.regno), 8))::bit(32)::int & 2147483647, 22)
    WHEN COALESCE(e.females_employed,0) + COALESCE(e.males_employed,0) > 50 THEN 15 + MOD(('x' || LEFT(md5(e.regno), 8))::bit(32)::int & 2147483647, 20)
    ELSE MOD(('x' || LEFT(md5(e.regno), 8))::bit(32)::int & 2147483647, 25)
  END,
  CASE 
    WHEN e.legal_action = 'Y' AND (55 + MOD(('x' || LEFT(md5(e.regno), 8))::bit(32)::int & 2147483647, 30)) > 75 THEN 'CRITICAL'
    WHEN e.legal_action = 'Y' THEN 'HIGH'
    WHEN e.arrears = 'Y' THEN 'MEDIUM'
    WHEN COALESCE(e.females_employed,0) + COALESCE(e.males_employed,0) > 50 AND (15 + MOD(('x' || LEFT(md5(e.regno), 8))::bit(32)::int & 2147483647, 20)) > 25 THEN 'MEDIUM'
    ELSE 'LOW'
  END,
  CASE WHEN e.arrears = 'Y' THEN 5 + MOD(('x' || LEFT(md5(e.regno || 'a'), 8))::bit(32)::int & 2147483647, 15) ELSE MOD(('x' || LEFT(md5(e.regno || 'a'), 8))::bit(32)::int & 2147483647, 5) END,
  CASE WHEN e.legal_action = 'Y' THEN 8 + MOD(('x' || LEFT(md5(e.regno || 'v'), 8))::bit(32)::int & 2147483647, 12) ELSE MOD(('x' || LEFT(md5(e.regno || 'v'), 8))::bit(32)::int & 2147483647, 4) END,
  MOD(('x' || LEFT(md5(e.regno || 'f'), 8))::bit(32)::int & 2147483647, 8),
  CASE WHEN e.arrears = 'Y' THEN 3 + MOD(('x' || LEFT(md5(e.regno || 'p'), 8))::bit(32)::int & 2147483647, 10) ELSE MOD(('x' || LEFT(md5(e.regno || 'p'), 8))::bit(32)::int & 2147483647, 5) END,
  CASE WHEN e.legal_action = 'Y' THEN 5 + MOD(('x' || LEFT(md5(e.regno || 'l'), 8))::bit(32)::int & 2147483647, 10) ELSE 0 END,
  'SYSTEM_SEED',
  NOW()
FROM er_master e
WHERE e.status = 'A'
ON CONFLICT (employer_id) DO NOTHING;
