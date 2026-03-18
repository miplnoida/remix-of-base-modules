
-- Risk Assessment: add missing spec fields
ALTER TABLE public.ia_risk_assessments
  ADD COLUMN IF NOT EXISTS risk_category text,
  ADD COLUMN IF NOT EXISTS risk_description text,
  ADD COLUMN IF NOT EXISTS risk_owner text,
  ADD COLUMN IF NOT EXISTS assessment_year text;

-- RCM Controls: add evidence and testing fields
ALTER TABLE public.ia_rcm_controls
  ADD COLUMN IF NOT EXISTS evidence_required text,
  ADD COLUMN IF NOT EXISTS last_tested_date date;

-- Department Audits (Plan Closeout): add closure fields
ALTER TABLE public.ia_department_audits
  ADD COLUMN IF NOT EXISTS final_rating text,
  ADD COLUMN IF NOT EXISTS closure_notes text,
  ADD COLUMN IF NOT EXISTS closure_approved_by text,
  ADD COLUMN IF NOT EXISTS closure_approval_date date;
