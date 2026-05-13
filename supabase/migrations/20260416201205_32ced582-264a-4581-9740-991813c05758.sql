
-- 1. Checklist responses
CREATE TABLE public.ce_audit_checklist_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.ce_inspections(id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES public.ce_weekly_plan_items(id) ON DELETE SET NULL,
  template_key varchar(50) NOT NULL,
  category varchar(100) NOT NULL,
  question_id varchar(50) NOT NULL,
  question_text text NOT NULL,
  response varchar(10),
  notes text,
  evidence_required boolean NOT NULL DEFAULT false,
  created_by varchar(50) NOT NULL DEFAULT 'SYSTEM',
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ce_acr_response_chk CHECK (response IS NULL OR response IN ('Yes','No','Partial','N/A'))
);
CREATE UNIQUE INDEX ce_acr_inspection_question_uniq ON public.ce_audit_checklist_responses(inspection_id, question_id);
CREATE INDEX ce_acr_inspection_idx ON public.ce_audit_checklist_responses(inspection_id);
CREATE INDEX ce_acr_plan_item_idx ON public.ce_audit_checklist_responses(plan_item_id);

CREATE TRIGGER trg_ce_acr_updated_at
BEFORE UPDATE ON public.ce_audit_checklist_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Employer audit reports
CREATE SEQUENCE IF NOT EXISTS public.ce_employer_audit_report_seq START 1;

CREATE OR REPLACE FUNCTION public.ce_generate_audit_report_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_seq bigint := nextval('public.ce_employer_audit_report_seq');
BEGIN
  RETURN 'AR-' || v_year || '-' || lpad(v_seq::text, 6, '0');
END;
$$;

CREATE TABLE public.ce_employer_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number varchar(50) NOT NULL UNIQUE DEFAULT public.ce_generate_audit_report_number(),
  inspection_id uuid NOT NULL REFERENCES public.ce_inspections(id) ON DELETE CASCADE,
  employer_id varchar(20),
  employer_name varchar(200),
  inspector_id varchar(50),
  inspector_name varchar(200),
  report_date date NOT NULL DEFAULT current_date,
  executive_summary text,
  scope text,
  conclusions text,
  recommendations text,
  total_findings integer NOT NULL DEFAULT 0,
  total_evidence integer NOT NULL DEFAULT 0,
  total_violations integer NOT NULL DEFAULT 0,
  checklist_completion_pct numeric(5,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'DRAFT',
  pdf_url text,
  generated_at timestamptz,
  generated_by varchar(50),
  finalized_at timestamptz,
  finalized_by varchar(50),
  created_by varchar(50) NOT NULL DEFAULT 'SYSTEM',
  updated_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ce_ear_status_chk CHECK (status IN ('DRAFT','FINAL','SHARED'))
);
CREATE INDEX ce_ear_inspection_idx ON public.ce_employer_audit_reports(inspection_id);
CREATE INDEX ce_ear_employer_idx ON public.ce_employer_audit_reports(employer_id);
CREATE INDEX ce_ear_status_idx ON public.ce_employer_audit_reports(status);

CREATE TRIGGER trg_ce_ear_updated_at
BEFORE UPDATE ON public.ce_employer_audit_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Structured fields on findings
ALTER TABLE public.ce_inspection_findings
  ADD COLUMN IF NOT EXISTS title varchar(200),
  ADD COLUMN IF NOT EXISTS category varchar(100),
  ADD COLUMN IF NOT EXISTS recommended_action text;

-- 4. Relax follow-up actions to allow finding-only follow-ups
ALTER TABLE public.ce_follow_up_actions
  ALTER COLUMN violation_id DROP NOT NULL;

ALTER TABLE public.ce_follow_up_actions
  ADD COLUMN IF NOT EXISTS finding_id uuid REFERENCES public.ce_inspection_findings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ce_fua_finding_idx ON public.ce_follow_up_actions(finding_id);

-- Ensure at least one of violation_id or finding_id is present
ALTER TABLE public.ce_follow_up_actions
  ADD CONSTRAINT ce_fua_source_chk CHECK (violation_id IS NOT NULL OR finding_id IS NOT NULL);
