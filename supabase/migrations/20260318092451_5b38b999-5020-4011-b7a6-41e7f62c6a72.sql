
ALTER TABLE public.ia_audit_engagements 
  ADD COLUMN IF NOT EXISTS function_id uuid REFERENCES public.ia_department_functions(id),
  ADD COLUMN IF NOT EXISTS estimated_budget numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supportive_auditor_ids jsonb DEFAULT '[]'::jsonb;
