-- 1. Unique constraint: one active plan per inspector per week
CREATE UNIQUE INDEX ce_weekly_plans_unique_active_per_week
ON public.ce_weekly_plans (inspector_id, week_start_date)
WHERE status NOT IN ('WITHDRAWN');

-- 2. Employer Interaction table
CREATE TABLE public.ce_inspection_employer_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.ce_inspections(id) ON DELETE CASCADE,
  plan_item_id UUID REFERENCES public.ce_weekly_plan_items(id) ON DELETE SET NULL,
  representative_name VARCHAR(200),
  representative_designation VARCHAR(100),
  representative_contact VARCHAR(50),
  records_declaration VARCHAR(30) NOT NULL DEFAULT 'COMPLETE',
  records_missing_details TEXT,
  authorization_status VARCHAR(30) NOT NULL DEFAULT 'GRANTED',
  refusal_notes TEXT,
  employer_acknowledged BOOLEAN NOT NULL DEFAULT false,
  employer_signature_data TEXT,
  signature_refused BOOLEAN NOT NULL DEFAULT false,
  signature_refusal_reason TEXT,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Working Papers table
CREATE TABLE public.ce_inspection_working_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.ce_inspections(id) ON DELETE CASCADE,
  plan_item_id UUID REFERENCES public.ce_weekly_plan_items(id) ON DELETE SET NULL,
  payroll_reviewed BOOLEAN NOT NULL DEFAULT false,
  payroll_notes TEXT,
  contributions_reviewed BOOLEAN NOT NULL DEFAULT false,
  contributions_notes TEXT,
  employee_sample_size INTEGER DEFAULT 0,
  employee_sample_notes TEXT,
  wage_book_reviewed BOOLEAN NOT NULL DEFAULT false,
  wage_book_notes TEXT,
  discrepancies_found TEXT,
  inspector_observations TEXT,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Normalized Evidence table
CREATE TABLE public.ce_inspection_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.ce_inspections(id) ON DELETE CASCADE,
  finding_id UUID REFERENCES public.ce_inspection_findings(id) ON DELETE SET NULL,
  plan_item_id UUID REFERENCES public.ce_weekly_plan_items(id) ON DELETE SET NULL,
  evidence_type VARCHAR(30) NOT NULL DEFAULT 'DOCUMENT',
  file_name VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  description TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by VARCHAR(50),
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ce_evidence_inspection ON public.ce_inspection_evidence(inspection_id);
CREATE INDEX idx_ce_evidence_finding ON public.ce_inspection_evidence(finding_id);

-- 5. Enhance findings table
ALTER TABLE public.ce_inspection_findings
  ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS explanation_if_no_violation TEXT;

-- 6. Index for unexecuted plan items
CREATE INDEX IF NOT EXISTS idx_ce_items_planned
ON public.ce_weekly_plan_items(plan_id)
WHERE execution_status = 'PLANNED';

-- 7. Weekly Report Aggregation View
CREATE OR REPLACE VIEW public.ce_v_weekly_report_summary AS
SELECT
  p.id AS plan_id,
  p.plan_number,
  p.inspector_id,
  p.inspector_name,
  p.week_start_date,
  p.week_end_date,
  p.status AS plan_status,
  COUNT(i.id) AS total_planned,
  COUNT(i.id) FILTER (WHERE i.execution_status = 'COMPLETED') AS completed_visits,
  COUNT(i.id) FILTER (WHERE i.execution_status = 'RESCHEDULED') AS rescheduled_visits,
  COUNT(i.id) FILTER (WHERE i.execution_status = 'CANCELLED') AS cancelled_visits,
  COUNT(i.id) FILTER (WHERE i.execution_status = 'NOT_DONE') AS not_done_visits,
  COUNT(i.id) FILTER (WHERE i.execution_status = 'PLANNED') AS still_planned,
  COALESCE(
    ROUND(
      SUM(
        CASE WHEN i.check_in_time IS NOT NULL AND i.check_out_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (i.check_out_time - i.check_in_time)) / 3600.0
        ELSE 0 END
      )::numeric, 1
    ), 0
  ) AS total_hours,
  COALESCE((
    SELECT COUNT(*) FROM public.ce_inspection_evidence e
    JOIN public.ce_inspections insp ON insp.id = e.inspection_id
    WHERE insp.scheduled_date BETWEEN p.week_start_date AND p.week_end_date
      AND insp.inspector_id = p.inspector_id::text
  ), 0) AS evidence_count,
  COALESCE((
    SELECT COUNT(*) FROM public.ce_inspection_findings f
    JOIN public.ce_inspections insp ON insp.id = f.inspection_id
    WHERE insp.scheduled_date BETWEEN p.week_start_date AND p.week_end_date
      AND insp.inspector_id = p.inspector_id::text
  ), 0) AS findings_count,
  COALESCE((
    SELECT COUNT(*) FROM public.ce_inspection_findings f
    JOIN public.ce_inspections insp ON insp.id = f.inspection_id
    WHERE insp.scheduled_date BETWEEN p.week_start_date AND p.week_end_date
      AND insp.inspector_id = p.inspector_id::text
      AND f.violation_created = true
  ), 0) AS violations_created,
  p.outcome_narrative,
  p.outcome_submitted_at
FROM public.ce_weekly_plans p
LEFT JOIN public.ce_weekly_plan_items i ON i.plan_id = p.id
GROUP BY p.id, p.plan_number, p.inspector_id, p.inspector_name,
         p.week_start_date, p.week_end_date, p.status,
         p.outcome_narrative, p.outcome_submitted_at;