
-- 1. Create ia_audit_checklists table
CREATE TABLE IF NOT EXISTS public.ia_audit_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.ia_audit_engagements(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  description TEXT,
  response TEXT DEFAULT 'Not Assessed',
  remarks TEXT,
  evidence_file TEXT,
  status TEXT DEFAULT 'Pending',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

-- 2. Add checklist_id and recommendation to ia_findings
ALTER TABLE public.ia_findings ADD COLUMN IF NOT EXISTS checklist_id UUID REFERENCES public.ia_audit_checklists(id);
ALTER TABLE public.ia_findings ADD COLUMN IF NOT EXISTS recommendation TEXT;

-- 3. Add closure fields to ia_audit_engagements
ALTER TABLE public.ia_audit_engagements ADD COLUMN IF NOT EXISTS closure_date DATE;
ALTER TABLE public.ia_audit_engagements ADD COLUMN IF NOT EXISTS closed_by TEXT;
ALTER TABLE public.ia_audit_engagements ADD COLUMN IF NOT EXISTS closure_notes TEXT;

-- 4. Add function_id, risk_level, assigned_auditor to ia_annual_plans
ALTER TABLE public.ia_annual_plans ADD COLUMN IF NOT EXISTS function_id UUID REFERENCES public.ia_department_functions(id);
ALTER TABLE public.ia_annual_plans ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE public.ia_annual_plans ADD COLUMN IF NOT EXISTS assigned_auditor TEXT;
