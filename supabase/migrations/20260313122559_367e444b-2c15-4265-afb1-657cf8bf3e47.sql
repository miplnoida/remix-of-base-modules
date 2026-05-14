
-- Phase 1A: Add audit_type to ia_department_audits and make annual_plan_id nullable
ALTER TABLE ia_department_audits ADD COLUMN IF NOT EXISTS audit_type TEXT NOT NULL DEFAULT 'planned';

ALTER TABLE ia_department_audits ALTER COLUMN annual_plan_id DROP NOT NULL;

-- Phase 1B: Plan Amendment History table
CREATE TABLE ia_plan_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'annual',
  amendment_type TEXT NOT NULL DEFAULT 'modification',
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  requested_by TEXT,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: Approval Actions audit trail table
CREATE TABLE ia_approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT,
  performer_name TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
