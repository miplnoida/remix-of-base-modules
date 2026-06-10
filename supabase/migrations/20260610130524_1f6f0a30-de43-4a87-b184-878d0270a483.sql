-- ============================================================
-- Compliance fixes: Active Violations count + table comments
-- ============================================================

-- (1) Overview "Active Violations" must EXCLUDE resolved/closed/dismissed/cancelled,
--     soft-deleted rows, and rows merged or split into other violations.
CREATE OR REPLACE VIEW public.dashboard_v_compliance_metrics AS
SELECT
  (SELECT COUNT(*)::int FROM er_master WHERE status = 'A') AS total_employers,
  (SELECT COUNT(*)::int
     FROM dashboard_v_employer_compliance_status
    WHERE bucket = 'Compliant') AS compliant_employers,
  (SELECT COUNT(*)::int
     FROM ce_violations
    WHERE (status)::text NOT IN ('RESOLVED','CLOSED','DISMISSED','CANCELLED')
      AND (is_deleted IS NULL OR is_deleted = false)
      AND (is_merged  IS NULL OR is_merged  = false)
      AND merged_into_id IS NULL) AS active_violations,
  (SELECT COUNT(*)::int
     FROM ce_inspections
    WHERE (status)::text = ANY (ARRAY['SCHEDULED','PENDING'])) AS pending_audits;

GRANT SELECT ON public.dashboard_v_compliance_metrics TO authenticated, anon, service_role;

-- (2) Document the "active violation" definition so future devs don't drift.
COMMENT ON VIEW public.dashboard_v_compliance_metrics IS
  'Compliance Dashboard KPIs. active_violations excludes RESOLVED/CLOSED/DISMISSED/CANCELLED, soft-deleted, merged, and split-parent rows.';
