
INSERT INTO ce_risk_profiles (employer_id, employer_name, territory, total_score, risk_band, arrears_score, violation_score, filing_score, payment_behavior_score, legal_history_score, created_by, last_calculated_at)
VALUES ('100001', 'Caribbean Sugar Mills Ltd', 'St. Kitts', 65, 'HIGH', 12, 15, 3, 8, 10, 'SYSTEM_SEED', NOW())
ON CONFLICT (employer_id) DO UPDATE SET total_score = EXCLUDED.total_score, risk_band = EXCLUDED.risk_band;
