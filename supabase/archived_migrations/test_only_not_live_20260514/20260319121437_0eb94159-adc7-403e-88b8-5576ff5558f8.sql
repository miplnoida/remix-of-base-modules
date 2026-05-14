
ALTER TABLE ia_audit_engagements 
ADD COLUMN IF NOT EXISTS engagement_type TEXT DEFAULT 'Planned Audit';

CREATE TABLE IF NOT EXISTS ia_plan_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ia_annual_plans(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  description TEXT,
  changed_by TEXT,
  change_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
