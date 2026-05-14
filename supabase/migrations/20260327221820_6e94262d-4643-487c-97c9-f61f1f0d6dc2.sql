
-- 1. Extend ia_annual_plans with planning narrative, resource, governance, and board pack fields
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS executive_summary TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS planning_assumptions TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS exclusions TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS resource_constraints TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS plan_owner TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS prepared_by TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS total_available_hours NUMERIC;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS planned_hours NUMERIC;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS contingency_hours NUMERIC;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS outsourced_support_notes TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS skills_constraints TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS board_committee_name TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS minutes_reference TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS board_pack_status TEXT DEFAULT 'None';

-- 2. Extend ia_audit_engagements with portfolio fields
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS quarter TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS sequence_no INTEGER;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS inclusion_rationale TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS coverage_category TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS board_priority_flag BOOLEAN DEFAULT FALSE;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS is_adhoc BOOLEAN DEFAULT FALSE;

-- 3. Create ia_plan_artifacts table
CREATE TABLE IF NOT EXISTS ia_plan_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ia_annual_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  artifact_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  file_name TEXT,
  file_path TEXT,
  mime_type TEXT,
  checksum TEXT,
  generated_at TIMESTAMPTZ,
  generated_by TEXT,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create ia_plan_distribution_logs table
CREATE TABLE IF NOT EXISTS ia_plan_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES ia_annual_plans(id) ON DELETE CASCADE,
  artifact_id UUID REFERENCES ia_plan_artifacts(id) ON DELETE SET NULL,
  recipient_name TEXT,
  recipient_email TEXT NOT NULL,
  recipient_type TEXT DEFAULT 'external',
  subject TEXT,
  message_body TEXT,
  send_status TEXT DEFAULT 'Pending',
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  sent_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Partial unique index: only one Approved plan per fiscal year
CREATE UNIQUE INDEX IF NOT EXISTS uq_ia_annual_plans_approved_fiscal_year
  ON ia_annual_plans (fiscal_year)
  WHERE status = 'Approved';

-- 6. Create storage bucket for artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('ia-artifacts', 'ia-artifacts', false)
ON CONFLICT (id) DO NOTHING;
