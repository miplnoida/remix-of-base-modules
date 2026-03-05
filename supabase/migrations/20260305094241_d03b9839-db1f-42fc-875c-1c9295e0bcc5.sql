
-- 1. Create ia_audit_reports table for persisting report data
CREATE TABLE IF NOT EXISTS public.ia_audit_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'Plan Summary',
  fiscal_year TEXT,
  period TEXT,
  department_id UUID REFERENCES public.ia_departments(id),
  plan_id UUID REFERENCES public.ia_annual_plans(id),
  status TEXT NOT NULL DEFAULT 'Draft',
  background TEXT,
  key_highlights TEXT,
  overall_assessment TEXT,
  limitations TEXT,
  conclusion TEXT,
  follow_up_actions TEXT,
  distribution_list TEXT,
  prepared_by TEXT,
  reviewed_by TEXT,
  generated_on TIMESTAMPTZ,
  submitted_on TIMESTAMPTZ,
  approved_on TIMESTAMPTZ,
  report_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- 2. Add missing columns to ia_action_tracking for UI compatibility
ALTER TABLE public.ia_action_tracking
  ADD COLUMN IF NOT EXISTS action_description TEXT,
  ADD COLUMN IF NOT EXISTS responsible_person TEXT,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Not Started',
  ADD COLUMN IF NOT EXISTS verified_date TIMESTAMPTZ;

-- 3. Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('ia-evidence', 'ia-evidence', true)
ON CONFLICT (id) DO NOTHING;
