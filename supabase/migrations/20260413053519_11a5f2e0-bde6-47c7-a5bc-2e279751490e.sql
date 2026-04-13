
-- 1) Compliance KPIs View
CREATE OR REPLACE VIEW public.ce_v_compliance_kpis AS
SELECT
  (SELECT COUNT(*) FROM ce_violations WHERE NOT is_merged) AS total_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'OPEN' AND NOT is_merged) AS open_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'IN_PROGRESS' AND NOT is_merged) AS in_progress_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'UNDER_REVIEW' AND NOT is_merged) AS under_review_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'ESCALATED' AND NOT is_merged) AS escalated_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'RESOLVED' AND NOT is_merged) AS resolved_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'CLOSED' AND NOT is_merged) AS closed_violations,
  (SELECT COUNT(*) FROM ce_violations WHERE status = 'CANCELLED' AND NOT is_merged) AS cancelled_violations,
  (SELECT COUNT(*) FROM ce_cases WHERE status IN ('ACTIVE','ESCALATED_LEGAL','UNDER_REVIEW') AND (is_deleted = false OR is_deleted IS NULL)) AS active_cases,
  (SELECT COUNT(*) FROM ce_cases WHERE status = 'CLOSED' AND (is_deleted = false OR is_deleted IS NULL)) AS closed_cases,
  (SELECT COUNT(*) FROM ce_notices WHERE response_received = true) AS notices_responded,
  (SELECT COUNT(*) FROM ce_notices) AS total_notices,
  (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)::numeric, 1) 
   FROM ce_violations WHERE resolved_at IS NOT NULL) AS avg_resolution_days,
  (SELECT COUNT(*) FROM ce_violations WHERE due_date < NOW() AND status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW') AND NOT is_merged) AS overdue_violations,
  (SELECT COUNT(DISTINCT employer_id) FROM ce_violations WHERE status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED') AND NOT is_merged) AS employers_with_active_violations;

-- 2) Violation Trends View (12-month rolling)
CREATE OR REPLACE VIEW public.ce_v_violation_trends AS
SELECT
  to_char(month_start, 'YYYY-MM') AS month_key,
  to_char(month_start, 'Mon YYYY') AS month_label,
  COALESCE(created_count, 0) AS created_count,
  COALESCE(resolved_count, 0) AS resolved_count,
  COALESCE(escalated_count, 0) AS escalated_count
FROM generate_series(
  date_trunc('month', NOW()) - interval '11 months',
  date_trunc('month', NOW()),
  '1 month'
) AS month_start
LEFT JOIN (
  SELECT date_trunc('month', created_at) AS m, COUNT(*) AS created_count
  FROM ce_violations WHERE NOT is_merged
  GROUP BY 1
) c ON c.m = month_start
LEFT JOIN (
  SELECT date_trunc('month', resolved_at) AS m, COUNT(*) AS resolved_count
  FROM ce_violations WHERE resolved_at IS NOT NULL AND NOT is_merged
  GROUP BY 1
) r ON r.m = month_start
LEFT JOIN (
  SELECT date_trunc('month', performed_at) AS m, COUNT(*) AS escalated_count
  FROM ce_violation_history WHERE action = 'status_change' AND to_value = 'ESCALATED'
  GROUP BY 1
) e ON e.m = month_start
ORDER BY month_start;

-- 3) Officer Performance View
CREATE OR REPLACE VIEW public.ce_v_officer_performance AS
SELECT
  v.assigned_to_user_id AS officer_id,
  COALESCE(p.full_name, 'Unassigned') AS officer_name,
  COUNT(*) AS total_assigned,
  COUNT(*) FILTER (WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')) AS active_count,
  COUNT(*) FILTER (WHERE v.status IN ('RESOLVED','CLOSED')) AS resolved_count,
  COUNT(*) FILTER (WHERE v.due_date < NOW() AND v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW')) AS overdue_count,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (v.resolved_at - v.created_at)) / 86400) FILTER (WHERE v.resolved_at IS NOT NULL)::numeric, 1
  ) AS avg_resolution_days,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE v.due_date < NOW() AND v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW'))::numeric / COUNT(*)::numeric * 100), 1)
    ELSE 0
  END AS overdue_pct
FROM ce_violations v
LEFT JOIN profiles p ON p.id::text = v.assigned_to_user_id
WHERE NOT v.is_merged
GROUP BY v.assigned_to_user_id, p.full_name;
