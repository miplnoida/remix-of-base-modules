
-- 1. Compliance Monitoring View
CREATE OR REPLACE VIEW public.ce_v_compliance_monitoring AS
SELECT
  cs.id,
  cs.employer_id,
  e.name AS employer_name,
  e.regno AS employer_regno,
  cs.overall_compliance_status,
  cs.filing_status,
  cs.payment_status,
  cs.current_arrears_amount,
  cs.current_penalty_amount,
  cs.active_violation_count,
  cs.active_case_count,
  cs.active_arrangement_count,
  cs.last_filing_period,
  cs.last_payment_date,
  cs.last_computed_at,
  cs.review_due_date,
  COALESCE(rp.risk_band, 'UNKNOWN')::text AS risk_band,
  COALESCE(rp.total_score, 0) AS risk_score
FROM ce_employer_compliance_status cs
LEFT JOIN er_master e ON cs.employer_id = e.regno
LEFT JOIN ce_risk_profiles rp ON cs.employer_id = rp.employer_id;

-- 2. C3 Compliance Summary View
CREATE OR REPLACE VIEW public.ce_v_c3_compliance_summary AS
SELECT
  c3.payer_id AS employer_id,
  e.name AS employer_name,
  e.office_code AS zone,
  COUNT(*) FILTER (WHERE c3.posting_status = 'P') AS on_time,
  COUNT(*) FILTER (WHERE c3.posting_status != 'P') AS late,
  COALESCE(m.missing_count, 0)::bigint AS missing,
  CASE
    WHEN COUNT(*) > 0 THEN
      ROUND(100.0 * COUNT(*) FILTER (WHERE c3.posting_status = 'P') / GREATEST(COUNT(*) + COALESCE(m.missing_count, 0), 1), 1)
    ELSE 0
  END AS compliance_rate
FROM cn_c3_reported c3
LEFT JOIN er_master e ON c3.payer_id = e.regno
LEFT JOIN (
  SELECT payer_id, COUNT(*) AS missing_count
  FROM cn_c3_missing
  GROUP BY payer_id
) m ON c3.payer_id = m.payer_id
GROUP BY c3.payer_id, e.name, e.office_code, m.missing_count;

-- 3. C3 Aggregate Stats View
CREATE OR REPLACE VIEW public.ce_v_c3_aggregate_stats AS
SELECT
  COUNT(*) FILTER (WHERE posting_status = 'P') AS total_on_time,
  COUNT(*) FILTER (WHERE posting_status != 'P') AS total_late,
  (SELECT COUNT(*) FROM cn_c3_missing) AS total_missing,
  COUNT(*) AS total_submissions
FROM cn_c3_reported;

-- 4. Case Monthly Trend View
CREATE OR REPLACE VIEW public.ce_v_case_monthly_trend AS
SELECT
  TO_CHAR(created_at, 'YYYY-MM') AS month_key,
  TO_CHAR(created_at, 'Mon') AS month_label,
  COUNT(*) AS created,
  COUNT(*) FILTER (WHERE status = 'COMPLETED' OR status = 'CLOSED') AS closed
FROM ce_cases
WHERE is_deleted = false
GROUP BY TO_CHAR(created_at, 'YYYY-MM'), TO_CHAR(created_at, 'Mon')
ORDER BY month_key;

-- 5. Case Resolution Stats View
CREATE OR REPLACE VIEW public.ce_v_case_resolution_stats AS
SELECT
  case_type,
  ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(closed_date, NOW()) - opened_date)) / 86400))::integer AS avg_days,
  COUNT(*) AS case_count
FROM ce_cases
WHERE is_deleted = false
GROUP BY case_type;

-- 6. Seed Inspection Demo Data (inspector_id is varchar(10), use inspector_code)
INSERT INTO ce_inspections (id, inspection_number, employer_id, employer_name, territory, inspection_type, status, inspector_id, inspector_name, scheduled_date, location_address, findings_summary, created_by, created_at, updated_by, updated_at)
VALUES
  ('d0d0d0d0-0001-4000-8000-000000000001', 'INS-2026-056', '100001', 'Caribbean Sugar Mills', 'Z1', 'Routine Inspection', 'Completed', 'INS-001', 'James Martinez', '2026-03-05', 'Bay Road, Basseterre', '3 findings', 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0002-4000-8000-000000000002', 'INS-2026-057', '100002', 'Island Construction', 'Z1', 'Follow-up Visit', 'In Progress', 'INS-002', 'Sarah Thompson', '2026-03-09', 'Frigate Bay', NULL, 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0003-4000-8000-000000000003', 'INS-2026-058', '100005', 'Nevis Auto Parts', 'Z3', 'Wage Book Review', 'Scheduled', 'INS-004', 'Jennifer Davis', '2026-03-10', 'Charlestown', NULL, 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0004-4000-8000-000000000004', 'INS-2026-059', '100003', 'KN Shipping', 'Z1', 'Complaint', 'Scheduled', 'INS-001', 'James Martinez', '2026-03-12', 'Bird Rock', NULL, 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0005-4000-8000-000000000005', 'INS-2026-060', '100004', 'Palm View Resort', 'Z2', 'Routine Inspection', 'Overdue', 'INS-003', 'Michael Brown', '2026-03-01', 'Frigate Bay', NULL, 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0006-4000-8000-000000000006', 'INS-2026-055', '100006', 'Sandy Point Bakery', 'Z2', 'Scouting Visit', 'Completed', 'INS-003', 'Michael Brown', '2026-02-28', 'Sandy Point', '1 finding', 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0007-4000-8000-000000000007', 'INS-2026-061', '100007', 'Tropical Beverages', 'Z3', 'C3 Verify', 'Completed', 'INS-005', 'Robert Wilson', '2026-02-20', 'Newcastle', '2 findings', 'seed', NOW(), 'seed', NOW()),
  ('d0d0d0d0-0008-4000-8000-000000000008', 'INS-2026-062', '100008', 'Federation Print', 'Z1', 'Routine', 'Scheduled', 'INS-002', 'Sarah Thompson', '2026-03-15', 'Fort Street', NULL, 'seed', NOW(), 'seed', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO ce_inspection_findings (id, inspection_id, finding_type, description, severity, violation_created, created_by, created_at, updated_at, updated_by)
VALUES
  (gen_random_uuid(), 'd0d0d0d0-0001-4000-8000-000000000001', 'RECORD_KEEPING', 'Wage books not current', 'MEDIUM', false, 'seed', NOW(), NOW(), 'seed'),
  (gen_random_uuid(), 'd0d0d0d0-0001-4000-8000-000000000001', 'CONTRIB_GAP', 'Under-reported wages Q3', 'HIGH', true, 'seed', NOW(), NOW(), 'seed'),
  (gen_random_uuid(), 'd0d0d0d0-0001-4000-8000-000000000001', 'REGISTRATION', 'Unregistered workers', 'MEDIUM', false, 'seed', NOW(), NOW(), 'seed'),
  (gen_random_uuid(), 'd0d0d0d0-0006-4000-8000-000000000006', 'RECORD_KEEPING', 'Minor filing issue', 'LOW', false, 'seed', NOW(), NOW(), 'seed'),
  (gen_random_uuid(), 'd0d0d0d0-0007-4000-8000-000000000007', 'CONTRIB_GAP', 'C3 mismatch', 'HIGH', true, 'seed', NOW(), NOW(), 'seed'),
  (gen_random_uuid(), 'd0d0d0d0-0007-4000-8000-000000000007', 'RECORD_KEEPING', 'Late termination report', 'MEDIUM', false, 'seed', NOW(), NOW(), 'seed');
