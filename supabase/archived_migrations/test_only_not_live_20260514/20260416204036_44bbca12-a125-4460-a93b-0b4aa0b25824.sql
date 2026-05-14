-- 0. Visit ↔ plan item link (the missing backbone)
ALTER TABLE public.ce_inspections
  ADD COLUMN IF NOT EXISTS plan_item_id uuid
  REFERENCES public.ce_weekly_plan_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ce_inspections_plan_item
  ON public.ce_inspections(plan_item_id);

-- 1. Evidence ↔ checklist response link
ALTER TABLE public.ce_inspection_evidence
  ADD COLUMN IF NOT EXISTS checklist_response_id uuid
  REFERENCES public.ce_audit_checklist_responses(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ce_evidence_checklist
  ON public.ce_inspection_evidence(checklist_response_id);

-- 2. Report ↔ plan item link
ALTER TABLE public.ce_employer_audit_reports
  ADD COLUMN IF NOT EXISTS plan_item_id uuid
  REFERENCES public.ce_weekly_plan_items(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ce_audit_reports_plan_item
  ON public.ce_employer_audit_reports(plan_item_id);

-- 3. Violation ↔ audit report link
ALTER TABLE public.ce_violations
  ADD COLUMN IF NOT EXISTS audit_report_id uuid
  REFERENCES public.ce_employer_audit_reports(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ce_violations_audit_report
  ON public.ce_violations(audit_report_id);

-- 4. Backfill structured fields on legacy findings
UPDATE public.ce_inspection_findings
SET title = COALESCE(NULLIF(title, ''), LEFT(SPLIT_PART(description, ':', 1), 200)),
    category = COALESCE(NULLIF(category, ''), finding_type)
WHERE (title IS NULL OR title = '') OR (category IS NULL OR category = '');

-- 5. Unified per-visit metrics view
CREATE OR REPLACE VIEW public.ce_v_visit_execution_metrics AS
SELECT
  i.id                                AS inspection_id,
  i.plan_item_id,
  i.employer_id,
  i.status                            AS inspection_status,
  i.scheduled_date,
  COALESCE(c.total, 0)                AS checklist_total,
  COALESCE(c.answered, 0)             AS checklist_answered,
  CASE
    WHEN COALESCE(c.total, 0) = 0 THEN 0
    ELSE ROUND(c.answered * 100.0 / c.total, 1)
  END                                 AS checklist_pct,
  COALESCE(e.cnt, 0)                  AS evidence_count,
  COALESCE(f.cnt, 0)                  AS findings_count,
  COALESCE(f.critical, 0)             AS findings_critical,
  COALESCE(f.high, 0)                 AS findings_high,
  COALESCE(f.medium, 0)               AS findings_medium,
  COALESCE(f.low, 0)                  AS findings_low,
  COALESCE(fu.cnt, 0)                 AS followup_count,
  COALESCE(v.cnt, 0)                  AS violations_count,
  r.id                                AS report_id,
  r.status                            AS report_status,
  r.report_number
FROM public.ce_inspections i
LEFT JOIN (
  SELECT inspection_id,
         COUNT(*)         AS total,
         COUNT(response)  AS answered
  FROM public.ce_audit_checklist_responses
  GROUP BY inspection_id
) c ON c.inspection_id = i.id
LEFT JOIN (
  SELECT inspection_id, COUNT(*) AS cnt
  FROM public.ce_inspection_evidence
  GROUP BY inspection_id
) e ON e.inspection_id = i.id
LEFT JOIN (
  SELECT inspection_id,
         COUNT(*)                                                 AS cnt,
         COUNT(*) FILTER (WHERE severity = 'Critical')            AS critical,
         COUNT(*) FILTER (WHERE severity = 'High')                AS high,
         COUNT(*) FILTER (WHERE severity = 'Medium')              AS medium,
         COUNT(*) FILTER (WHERE severity = 'Low')                 AS low
  FROM public.ce_inspection_findings
  GROUP BY inspection_id
) f ON f.inspection_id = i.id
LEFT JOIN (
  SELECT fnd.inspection_id, COUNT(*) AS cnt
  FROM public.ce_follow_up_actions fua
  JOIN public.ce_inspection_findings fnd ON fnd.id = fua.finding_id
  WHERE fua.is_deleted = false
  GROUP BY fnd.inspection_id
) fu ON fu.inspection_id = i.id
LEFT JOIN (
  SELECT inspection_id, COUNT(DISTINCT violation_id) AS cnt
  FROM public.ce_inspection_findings
  WHERE violation_id IS NOT NULL
  GROUP BY inspection_id
) v ON v.inspection_id = i.id
LEFT JOIN public.ce_employer_audit_reports r ON r.inspection_id = i.id;