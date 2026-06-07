
-- ============================================================
-- Phase 1: Approval / Override Policies foundation
-- ============================================================

-- 1. Policy areas lookup
CREATE TABLE IF NOT EXISTS public.bn_policy_area (
  code TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bn_policy_area TO authenticated;
GRANT ALL ON public.bn_policy_area TO service_role;
ALTER TABLE public.bn_policy_area DISABLE ROW LEVEL SECURITY;

INSERT INTO public.bn_policy_area (code, display_name, sort_order, description) VALUES
  ('ELIGIBILITY',   'Eligibility Overrides',   10, 'Override failed eligibility rules or full eligibility decision'),
  ('CALCULATION',   'Calculation Overrides',   20, 'Override calculation inputs, caps, or final amount'),
  ('DOCUMENTS',     'Document Waivers',        30, 'Waive mandatory documents or accept alternates'),
  ('AMENDMENTS',    'Claim Amendments',        40, 'Edit locked claim fields after stage cutoff'),
  ('PARTICIPANTS',  'Participant Changes',     50, 'Add/remove/edit participants after lock'),
  ('WORKFLOW',      'Workflow Overrides',      60, 'Skip, re-route or unlock workflow steps'),
  ('AWARD',         'Award Overrides',         70, 'Backdate, suspend, reinstate, life-cert exceptions'),
  ('PAYMENT',       'Payment Overrides',       80, 'Release holds, method/bank/amount override'),
  ('COMMUNICATION', 'Communication Overrides', 90, 'Re-send, suppress, re-template communications')
ON CONFLICT (code) DO NOTHING;

-- 2. Approval / Override policy per product version × area × action
CREATE TABLE IF NOT EXISTS public.bn_approval_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  policy_area TEXT NOT NULL REFERENCES public.bn_policy_area(code),
  action_code TEXT NOT NULL DEFAULT 'DEFAULT',

  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  requires_reason_code BOOLEAN NOT NULL DEFAULT TRUE,
  requires_justification BOOLEAN NOT NULL DEFAULT TRUE,
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  requires_supervisor_approval BOOLEAN NOT NULL DEFAULT TRUE,
  self_approval_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  audit_required BOOLEAN NOT NULL DEFAULT TRUE,
  non_waivable BOOLEAN NOT NULL DEFAULT FALSE,

  approval_role TEXT,
  approval_workbasket_id UUID,
  reason_code_group TEXT,

  allowed_statuses TEXT[] NOT NULL DEFAULT '{}',
  blocked_statuses TEXT[] NOT NULL DEFAULT '{}',
  allowed_rule_codes TEXT[] NOT NULL DEFAULT '{}',
  blocked_rule_codes TEXT[] NOT NULL DEFAULT '{}',

  max_override_amount NUMERIC(18,2),
  max_override_percent NUMERIC(7,4),
  expiry_status TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50),

  UNIQUE (product_version_id, policy_area, action_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_approval_policy TO authenticated;
GRANT ALL ON public.bn_approval_policy TO service_role;
ALTER TABLE public.bn_approval_policy DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bn_approval_policy_pv ON public.bn_approval_policy(product_version_id);
CREATE INDEX IF NOT EXISTS idx_bn_approval_policy_area ON public.bn_approval_policy(policy_area);

-- 3. Unified override request table
CREATE TABLE IF NOT EXISTS public.bn_override_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id),
  policy_area TEXT NOT NULL REFERENCES public.bn_policy_area(code),
  action_code TEXT NOT NULL DEFAULT 'DEFAULT',

  target_entity_type TEXT,
  target_entity_id TEXT,
  rule_code TEXT,
  current_value JSONB,
  requested_value JSONB,

  reason_code TEXT,
  justification TEXT,
  supporting_document_id UUID,

  status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL'
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED','EXPIRED')),

  requested_by VARCHAR(50) NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by VARCHAR(50),
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT,
  review_notes TEXT,

  applied_at TIMESTAMPTZ,
  applied_by VARCHAR(50),
  expires_at TIMESTAMPTZ,

  policy_id UUID REFERENCES public.bn_approval_policy(id),
  correlation_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_override_request TO authenticated;
GRANT ALL ON public.bn_override_request TO service_role;
ALTER TABLE public.bn_override_request DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bn_override_request_claim ON public.bn_override_request(claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_override_request_status ON public.bn_override_request(status);
CREATE INDEX IF NOT EXISTS idx_bn_override_request_area ON public.bn_override_request(policy_area);

-- 4. Append-only event log for override requests
CREATE TABLE IF NOT EXISTS public.bn_override_request_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.bn_override_request(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor VARCHAR(50) NOT NULL,
  notes TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.bn_override_request_event TO authenticated;
GRANT ALL ON public.bn_override_request_event TO service_role;
ALTER TABLE public.bn_override_request_event DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bn_override_request_event_req ON public.bn_override_request_event(request_id);

-- 5. updated_at trigger reuse
CREATE OR REPLACE FUNCTION public.bn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bn_approval_policy_uat ON public.bn_approval_policy;
CREATE TRIGGER trg_bn_approval_policy_uat
  BEFORE UPDATE ON public.bn_approval_policy
  FOR EACH ROW EXECUTE FUNCTION public.bn_set_updated_at();

DROP TRIGGER IF EXISTS trg_bn_override_request_uat ON public.bn_override_request;
CREATE TRIGGER trg_bn_override_request_uat
  BEFORE UPDATE ON public.bn_override_request
  FOR EACH ROW EXECUTE FUNCTION public.bn_set_updated_at();

-- 6. Backfill: one disabled default policy row per existing product_version × area
INSERT INTO public.bn_approval_policy
  (product_version_id, policy_area, action_code, is_enabled, created_by, updated_by)
SELECT pv.id, pa.code, 'DEFAULT', FALSE, 'SEED-PHASE1', 'SEED-PHASE1'
FROM public.bn_product_version pv
CROSS JOIN public.bn_policy_area pa
ON CONFLICT (product_version_id, policy_area, action_code) DO NOTHING;
