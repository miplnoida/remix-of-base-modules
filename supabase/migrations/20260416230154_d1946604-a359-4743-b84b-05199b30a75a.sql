-- Phase 1: Audit Contact + Signer identity model

-- Extend audit reports with audit-contact fields (separate from signer)
ALTER TABLE public.ce_employer_audit_reports
  ADD COLUMN IF NOT EXISTS audit_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS audit_contact_designation TEXT,
  ADD COLUMN IF NOT EXISTS audit_contact_relationship TEXT,
  ADD COLUMN IF NOT EXISTS audit_contact_present BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS audit_contact_captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audit_contact_captured_by TEXT;

-- Backfill existing employer_rep_* into audit_contact_*
UPDATE public.ce_employer_audit_reports
SET audit_contact_name = employer_rep_name,
    audit_contact_designation = employer_rep_designation,
    audit_contact_captured_at = COALESCE(audit_contact_captured_at, created_at)
WHERE audit_contact_name IS NULL AND employer_rep_name IS NOT NULL;

-- Extend signatures with same/different person + witness + supersede chain
ALTER TABLE public.ce_audit_report_signatures
  ADD COLUMN IF NOT EXISTS signer_same_as_contact BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS signer_authority_note TEXT,
  ADD COLUMN IF NOT EXISTS signer_relationship TEXT,
  ADD COLUMN IF NOT EXISTS witness_name TEXT,
  ADD COLUMN IF NOT EXISTS witness_designation TEXT,
  ADD COLUMN IF NOT EXISTS witness_signature_image_url TEXT,
  ADD COLUMN IF NOT EXISTS inspector_attestation_signature_id UUID REFERENCES public.ce_audit_report_signatures(id),
  ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.ce_audit_report_signatures(id),
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_sig_active
  ON public.ce_audit_report_signatures (report_id, signer_role)
  WHERE superseded_by IS NULL;

-- Immutable audit trail of all signature events
CREATE TABLE IF NOT EXISTS public.ce_audit_report_signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_id UUID REFERENCES public.ce_audit_report_signatures(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.ce_employer_audit_reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_code TEXT,
  actor_ip TEXT,
  actor_user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sig_events_report ON public.ce_audit_report_signature_events (report_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_sig_events_signature ON public.ce_audit_report_signature_events (signature_id);