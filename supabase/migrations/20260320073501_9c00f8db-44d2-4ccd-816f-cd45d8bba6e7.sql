
-- Phase 1a: Add department_id and date columns to ia_annual_plans
ALTER TABLE ia_annual_plans 
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES ia_departments(id),
  ADD COLUMN IF NOT EXISTS audit_scope TEXT,
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE;

-- Phase 1b: Create ia_audit_plan_functions table
CREATE TABLE IF NOT EXISTS ia_audit_plan_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ia_annual_plans(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES ia_department_functions(id),
  risk_score NUMERIC,
  risk_level TEXT,
  priority TEXT DEFAULT 'Normal',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, function_id)
);

-- Phase 1c: Create ia_audit_queries table
CREATE TABLE IF NOT EXISTS ia_audit_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES ia_audit_engagements(id) ON DELETE CASCADE,
  department_id UUID REFERENCES ia_departments(id),
  question TEXT NOT NULL,
  requested_document TEXT,
  requested_by TEXT,
  requested_date TIMESTAMPTZ DEFAULT now(),
  response TEXT,
  response_by TEXT,
  response_date TIMESTAMPTZ,
  status TEXT DEFAULT 'Pending',
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 1d: Create ia_audit_closure table
CREATE TABLE IF NOT EXISTS ia_audit_closure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES ia_audit_engagements(id) ON DELETE CASCADE,
  closure_summary TEXT,
  lessons_learned TEXT,
  approved_by TEXT,
  closure_date DATE,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(engagement_id)
);

-- Add executive_summary and methodology to ia_audit_reports if missing
ALTER TABLE ia_audit_reports
  ADD COLUMN IF NOT EXISTS executive_summary TEXT,
  ADD COLUMN IF NOT EXISTS audit_objective TEXT,
  ADD COLUMN IF NOT EXISTS audit_scope TEXT,
  ADD COLUMN IF NOT EXISTS methodology TEXT,
  ADD COLUMN IF NOT EXISTS recommendations TEXT,
  ADD COLUMN IF NOT EXISTS risk_rating TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT;
