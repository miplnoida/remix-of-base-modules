-- ============================================================
-- Field Audit Execution — Data Integrity SQL Test Suite
-- Knowledge Repo: kb_articles[module_key='compliance', screen_key='audit-execution-model']
--
-- Each query must return ZERO rows. Run via:
--   psql -f supabase/tests/sql/ce_field_audit_integrity.sql
-- A non-empty result = data integrity violation in the canonical chain.
-- ============================================================

-- 1. Every visit on an executed plan must link back to a plan_item.
SELECT 'visit_missing_plan_item_id' AS check_name, i.id
FROM public.ce_inspections i
JOIN public.ce_weekly_plan_items pi
  ON pi.employer_id = i.employer_id
 AND pi.scheduled_date = i.scheduled_date
WHERE i.plan_item_id IS NULL;

-- 2. Every violation generated from a finding must point at the finding's inspection.
SELECT 'violation_inspection_mismatch' AS check_name, v.id
FROM public.ce_violations v
JOIN public.ce_inspection_findings f ON f.violation_id = v.id
WHERE v.inspection_id IS DISTINCT FROM f.inspection_id;

-- 3. When an audit report exists for a visit, all violations of that visit must reference it.
SELECT 'violation_missing_audit_report_link' AS check_name, v.id
FROM public.ce_violations v
JOIN public.ce_employer_audit_reports r ON r.inspection_id = v.inspection_id
WHERE v.audit_report_id IS NULL;

-- 4. Every finding must be structured (title + category + severity).
SELECT 'finding_missing_structured_fields' AS check_name, id
FROM public.ce_inspection_findings
WHERE COALESCE(NULLIF(title,''), NULL) IS NULL
   OR COALESCE(NULLIF(category,''), NULL) IS NULL
   OR severity IS NULL;

-- 5. Unified view counts must match raw tables (sample: findings_count).
SELECT 'view_findings_count_mismatch' AS check_name, m.inspection_id
FROM public.ce_v_visit_execution_metrics m
LEFT JOIN (
  SELECT inspection_id, COUNT(*) AS cnt
  FROM public.ce_inspection_findings
  GROUP BY inspection_id
) raw ON raw.inspection_id = m.inspection_id
WHERE COALESCE(m.findings_count, 0) <> COALESCE(raw.cnt, 0);

-- 6. Unified view evidence_count must match raw evidence rows.
SELECT 'view_evidence_count_mismatch' AS check_name, m.inspection_id
FROM public.ce_v_visit_execution_metrics m
LEFT JOIN (
  SELECT inspection_id, COUNT(*) AS cnt
  FROM public.ce_inspection_evidence
  GROUP BY inspection_id
) raw ON raw.inspection_id = m.inspection_id
WHERE COALESCE(m.evidence_count, 0) <> COALESCE(raw.cnt, 0);

-- 7. Audit reports must reference a real inspection.
SELECT 'audit_report_orphaned' AS check_name, r.id
FROM public.ce_employer_audit_reports r
LEFT JOIN public.ce_inspections i ON i.id = r.inspection_id
WHERE i.id IS NULL;

-- 8. Follow-up actions sourced from a finding must reference an existing finding.
SELECT 'followup_orphaned_finding' AS check_name, fua.id
FROM public.ce_follow_up_actions fua
LEFT JOIN public.ce_inspection_findings f ON f.id = fua.finding_id
WHERE fua.source = 'FINDING' AND fua.finding_id IS NOT NULL AND f.id IS NULL;
