
-- 1. Override request table
CREATE TABLE IF NOT EXISTS public.bn_eligibility_override_request (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL,
  eligibility_result_id UUID NULL,
  rule_code TEXT NOT NULL,
  rule_group_code TEXT NULL,
  field_key TEXT NULL,
  source_table TEXT NULL,
  source_record_id TEXT NULL,
  actual_value JSONB NULL,
  expected_value JSONB NULL,
  operator TEXT NULL,
  override_scope TEXT NOT NULL DEFAULT 'THIS_RULE_ONLY',
  reason_code TEXT NOT NULL,
  justification TEXT NOT NULL,
  supporting_document_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by TEXT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  review_decision TEXT NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_eor_scope_chk CHECK (override_scope IN ('THIS_RULE_ONLY','RULE_GROUP','FULL_ELIGIBILITY')),
  CONSTRAINT bn_eor_status_chk CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_eligibility_override_request TO authenticated;
GRANT ALL ON public.bn_eligibility_override_request TO service_role;
-- RLS intentionally disabled per project policy (role-based security only).

CREATE INDEX IF NOT EXISTS idx_bn_eor_claim ON public.bn_eligibility_override_request(claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_eor_status ON public.bn_eligibility_override_request(status);
CREATE INDEX IF NOT EXISTS idx_bn_eor_rule_code ON public.bn_eligibility_override_request(rule_code);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_eor_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bn_eor_set_updated_at ON public.bn_eligibility_override_request;
CREATE TRIGGER trg_bn_eor_set_updated_at
BEFORE UPDATE ON public.bn_eligibility_override_request
FOR EACH ROW EXECUTE FUNCTION public.bn_eor_set_updated_at();

-- 2. Product-version eligibility-override policy fields
ALTER TABLE public.bn_product_version
  ADD COLUMN IF NOT EXISTS allow_eligibility_override BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS override_requires_supervisor BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS override_requires_document BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_allowed_rule_codes TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS override_blocked_rule_codes TEXT[] NOT NULL DEFAULT '{}'::text[];

-- 3. Seed standard ELIGIBILITY_OVERRIDE reason codes (idempotent)
INSERT INTO public.bn_reason_code (reason_code, reason_label, reason_category, applicable_actions, requires_narrative, is_active, entered_by, country_code)
VALUES
  ('ELIG_OVR_ADMIN_DISCRETION',     'Administrative Discretion',          'ELIGIBILITY_OVERRIDE', ARRAY['OVERRIDE_ELIGIBILITY']::text[], true, true, 'SEED-BACKFILL', 'SKN'),
  ('ELIG_OVR_LATE_EVIDENCE',        'Late Evidence Accepted',             'ELIGIBILITY_OVERRIDE', ARRAY['OVERRIDE_ELIGIBILITY']::text[], true, true, 'SEED-BACKFILL', 'SKN'),
  ('ELIG_OVR_CONTRIB_PENDING',      'Contribution Record Pending Update', 'ELIGIBILITY_OVERRIDE', ARRAY['OVERRIDE_ELIGIBILITY']::text[], true, true, 'SEED-BACKFILL', 'SKN'),
  ('ELIG_OVR_LEGACY_CONFIRMED',     'Legacy Record Confirmed',            'ELIGIBILITY_OVERRIDE', ARRAY['OVERRIDE_ELIGIBILITY']::text[], true, true, 'SEED-BACKFILL', 'SKN'),
  ('ELIG_OVR_MED_BOARD_EXCEPTION',  'Medical Board Exception',            'ELIGIBILITY_OVERRIDE', ARRAY['OVERRIDE_ELIGIBILITY']::text[], true, true, 'SEED-BACKFILL', 'SKN'),
  ('ELIG_OVR_SPECIAL_APPROVAL',     'Special Approval',                   'ELIGIBILITY_OVERRIDE', ARRAY['OVERRIDE_ELIGIBILITY']::text[], true, true, 'SEED-BACKFILL', 'SKN')
ON CONFLICT (reason_code) DO NOTHING;
