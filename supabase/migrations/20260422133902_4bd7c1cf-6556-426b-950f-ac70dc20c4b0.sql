-- Per-communication audit-trail for late/exception handling
ALTER TABLE public.ce_audit_communications
  ADD COLUMN IF NOT EXISTS sent_late BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS late_reason TEXT,
  ADD COLUMN IF NOT EXISTS exception_recorded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS exception_recorded_by TEXT,
  ADD COLUMN IF NOT EXISTS exception_reason TEXT;

-- Configurable minimum lead time (hours) on a template — used to classify
-- on-time vs late for pre-visit communications such as audit intimation.
ALTER TABLE public.ce_audit_communication_templates
  ADD COLUMN IF NOT EXISTS min_lead_hours INTEGER;

COMMENT ON COLUMN public.ce_audit_communications.sent_late IS
  'TRUE when send happened after the template''s required lead time before planned visit date.';
COMMENT ON COLUMN public.ce_audit_communications.exception_reason IS
  'Reason captured when an inspector formally exceptions a missing pre-visit communication (e.g., missed intimation).';
COMMENT ON COLUMN public.ce_audit_communication_templates.min_lead_hours IS
  'Minimum lead time (hours before planned visit) for on-time delivery. Currently used by audit intimation gating; defaults to 48h when null.';