
ALTER TABLE public.ia_audit_engagements
  ADD COLUMN IF NOT EXISTS inclusion_reason_codes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS inclusion_reason_notes TEXT,
  ADD COLUMN IF NOT EXISTS expected_deliverable_codes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expected_deliverable_notes TEXT,
  ADD COLUMN IF NOT EXISTS primary_auditee_contact_id UUID,
  ADD COLUMN IF NOT EXISTS secondary_auditee_contact_ids JSONB DEFAULT '[]'::jsonb;
