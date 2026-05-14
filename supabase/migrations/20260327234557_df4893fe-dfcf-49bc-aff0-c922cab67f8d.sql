
-- Add missing engagement planning fields
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS expected_deliverable TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS dependencies TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS month TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS estimated_days NUMERIC DEFAULT 0;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS auditee_contact TEXT;
ALTER TABLE ia_audit_engagements ADD COLUMN IF NOT EXISTS auditable_area_summary TEXT;

-- Add plan-level version tracking fields
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS methodology_notes TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS scope_description TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS last_material_change_at TIMESTAMPTZ;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS last_material_change_by TEXT;
ALTER TABLE ia_annual_plans ADD COLUMN IF NOT EXISTS artifact_version_number INTEGER DEFAULT 0;
