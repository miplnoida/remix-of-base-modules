
-- BN Communication integration tables (event-driven; reuses notification_templates)

-- Event catalog
CREATE TABLE IF NOT EXISTS public.bn_comm_event (
  event_code VARCHAR(80) PRIMARY KEY,
  event_name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(40) NOT NULL DEFAULT 'LIFECYCLE',
  is_mandatory_letter BOOLEAN NOT NULL DEFAULT false,
  requires_reason_code BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_comm_event TO authenticated;
GRANT ALL ON public.bn_comm_event TO service_role;

-- Event → channel/recipient/template mapping (optionally scoped to product version)
CREATE TABLE IF NOT EXISTS public.bn_comm_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code VARCHAR(80) NOT NULL REFERENCES public.bn_comm_event(event_code) ON DELETE CASCADE,
  bn_product_version_id UUID,
  workflow_step_id UUID,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','LETTER','IN_APP','INTERNAL_EMAIL')),
  recipient_type VARCHAR(30) NOT NULL CHECK (recipient_type IN ('CLAIMANT','PAYEE','EMPLOYER','ASSIGNED_OFFICER','SUPERVISOR','FINANCE','MEDICAL_BOARD','AUDITOR')),
  template_id UUID,
  is_required BOOLEAN NOT NULL DEFAULT false,
  fallback_priority INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS idx_bn_comm_mapping_event ON public.bn_comm_mapping(event_code, active);
CREATE INDEX IF NOT EXISTS idx_bn_comm_mapping_version ON public.bn_comm_mapping(bn_product_version_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_comm_mapping TO authenticated;
GRANT ALL ON public.bn_comm_mapping TO service_role;

-- Physical letter lifecycle
CREATE TABLE IF NOT EXISTS public.bn_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  event_code VARCHAR(80) NOT NULL,
  template_id UUID,
  recipient_type VARCHAR(30) NOT NULL,
  recipient_name VARCHAR(300),
  recipient_address_snapshot JSONB,
  subject TEXT,
  body_html TEXT,
  merge_context JSONB,
  pdf_storage_path TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','GENERATED','PENDING_APPROVAL','APPROVED_TO_PRINT','PRINTED','DISPATCHED','DELIVERED','RETURNED','CANCELLED')),
  generated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  printed_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_by VARCHAR(50),
  approved_by VARCHAR(50),
  printed_by VARCHAR(50),
  dispatched_by VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_letter_claim ON public.bn_letter(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bn_letter_status ON public.bn_letter(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_letter TO authenticated;
GRANT ALL ON public.bn_letter TO service_role;

-- Unified communication log (one row per channel send attempt)
CREATE TABLE IF NOT EXISTS public.bn_communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  event_code VARCHAR(80) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient_type VARCHAR(30) NOT NULL,
  recipient_address TEXT,
  template_id UUID,
  subject TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','FAILED','RETRYING','DELIVERED','SKIPPED')),
  provider_message_id TEXT,
  letter_id UUID REFERENCES public.bn_letter(id) ON DELETE SET NULL,
  workflow_step_id UUID,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  context JSONB,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bn_comm_log_claim ON public.bn_communication_log(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bn_comm_log_status ON public.bn_communication_log(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_communication_log TO authenticated;
GRANT ALL ON public.bn_communication_log TO service_role;

-- updated_at triggers (reuse existing helper if present, else inline)
CREATE OR REPLACE FUNCTION public.bn_comm_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_comm_event_updated ON public.bn_comm_event;
CREATE TRIGGER trg_bn_comm_event_updated BEFORE UPDATE ON public.bn_comm_event FOR EACH ROW EXECUTE FUNCTION public.bn_comm_set_updated_at();
DROP TRIGGER IF EXISTS trg_bn_comm_mapping_updated ON public.bn_comm_mapping;
CREATE TRIGGER trg_bn_comm_mapping_updated BEFORE UPDATE ON public.bn_comm_mapping FOR EACH ROW EXECUTE FUNCTION public.bn_comm_set_updated_at();
DROP TRIGGER IF EXISTS trg_bn_letter_updated ON public.bn_letter;
CREATE TRIGGER trg_bn_letter_updated BEFORE UPDATE ON public.bn_letter FOR EACH ROW EXECUTE FUNCTION public.bn_comm_set_updated_at();
DROP TRIGGER IF EXISTS trg_bn_comm_log_updated ON public.bn_communication_log;
CREATE TRIGGER trg_bn_comm_log_updated BEFORE UPDATE ON public.bn_communication_log FOR EACH ROW EXECUTE FUNCTION public.bn_comm_set_updated_at();

-- Seed event catalog
INSERT INTO public.bn_comm_event (event_code, event_name, description, category, is_mandatory_letter, requires_reason_code) VALUES
  ('bn.claim.submitted',         'Claim Submitted',          'Acknowledgement when a claim is submitted',           'LIFECYCLE', false, false),
  ('bn.claim.intake.started',    'Intake Started',           'Intake review has begun',                              'LIFECYCLE', false, false),
  ('bn.identity.verified',       'Identity Verified',        'Claimant identity confirmed',                          'EVIDENCE',  false, false),
  ('bn.evidence.requested',      'Evidence Requested',       'Missing documents requested from claimant',            'EVIDENCE',  false, false),
  ('bn.evidence.received',       'Evidence Received',        'Submitted evidence acknowledged',                      'EVIDENCE',  false, false),
  ('bn.eligibility.passed',      'Eligibility Passed',       'Eligibility evaluation passed',                        'LIFECYCLE', false, false),
  ('bn.eligibility.failed',      'Eligibility Failed',       'Eligibility evaluation failed',                        'DECISION',  true,  true),
  ('bn.calculation.completed',   'Calculation Completed',    'Benefit calculation completed',                        'LIFECYCLE', false, false),
  ('bn.decision.pending',        'Decision Pending',         'Recommendation submitted for approval',                'LIFECYCLE', false, false),
  ('bn.claim.approved',          'Claim Approved',           'Formal approval of claim',                             'DECISION',  true,  false),
  ('bn.claim.disallowed',        'Claim Disallowed',         'Claim disallowed (procedural)',                        'DECISION',  true,  true),
  ('bn.claim.denied',            'Claim Denied',             'Formal denial with appeal rights',                     'DECISION',  true,  true),
  ('bn.claim.suspended',         'Claim Suspended',          'Award suspended',                                      'DECISION',  true,  true),
  ('bn.claim.reopened',          'Claim Reopened',           'Previously closed claim reopened',                     'LIFECYCLE', false, false),
  ('bn.claim.withdrawn',         'Claim Withdrawn',          'Claim withdrawn by claimant',                          'LIFECYCLE', false, false),
  ('bn.payment.ready',           'Payment Ready',            'Payment instruction prepared',                         'PAYMENT',   false, false),
  ('bn.payment.issued',          'Payment Issued',           'Payment dispatched',                                   'PAYMENT',   false, false),
  ('bn.life_certificate.due',    'Life Certificate Due',     'Life certificate required',                            'REVIEW',    false, false),
  ('bn.overpayment.created',     'Overpayment Created',      'Overpayment ledger entry raised',                      'DECISION',  true,  true)
ON CONFLICT (event_code) DO NOTHING;
