
-- ============ 1. Numbering sequences for source referrals ============
INSERT INTO public.core_number_sequence
  (module_code, entity_type, country_code, prefix_pattern, number_pattern, padding_length, current_number, reset_frequency, last_period_key, is_active, description)
VALUES
  ('COMPLIANCE','LEGAL_REFERRAL','SKN','CMP-LR-SKN','CMP-LR-SKN-{YYYY}-{SEQ}',6,0,'YEARLY','2026',true,'Compliance → Legal referral reference number'),
  ('BENEFITS',  'LEGAL_REFERRAL','SKN','BN-LR-SKN', 'BN-LR-SKN-{YYYY}-{SEQ}', 6,0,'YEARLY','2026',true,'Benefits → Legal referral reference number')
ON CONFLICT (module_code, entity_type, country_code) DO UPDATE
SET prefix_pattern = EXCLUDED.prefix_pattern,
    number_pattern = EXCLUDED.number_pattern,
    padding_length = EXCLUDED.padding_length,
    reset_frequency = EXCLUDED.reset_frequency,
    is_active = true,
    description = EXCLUDED.description,
    updated_at = now();

-- ============ 2. ce_cases legal cross-link columns ============
ALTER TABLE public.ce_cases
  ADD COLUMN IF NOT EXISTS lg_intake_id  uuid,
  ADD COLUMN IF NOT EXISTS lg_intake_no  text,
  ADD COLUMN IF NOT EXISTS lg_referral_no text,
  ADD COLUMN IF NOT EXISTS lg_case_no    text;

CREATE INDEX IF NOT EXISTS idx_ce_cases_lg_intake
  ON public.ce_cases(lg_intake_id) WHERE lg_intake_id IS NOT NULL;

-- ============ 3. ce_legal_referrals tracking columns ============
ALTER TABLE public.ce_legal_referrals
  ADD COLUMN IF NOT EXISTS lg_intake_id   uuid,
  ADD COLUMN IF NOT EXISTS lg_intake_no   text,
  ADD COLUMN IF NOT EXISTS lg_case_no     text,
  ADD COLUMN IF NOT EXISTS source_case_id uuid;

CREATE INDEX IF NOT EXISTS idx_ce_legal_ref_intake
  ON public.ce_legal_referrals(lg_intake_id) WHERE lg_intake_id IS NOT NULL;

-- Prevent duplicate active referrals for the same compliance source case
CREATE UNIQUE INDEX IF NOT EXISTS uq_ce_legal_ref_source_active
  ON public.ce_legal_referrals(source_case_id)
  WHERE source_case_id IS NOT NULL
    AND status NOT IN ('REJECTED','CLOSED');

-- ============ 4. bn_legal_referral table ============
CREATE TABLE IF NOT EXISTS public.bn_legal_referral (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_number     text NOT NULL UNIQUE,
  source_claim_id     uuid REFERENCES public.bn_claim(id) ON DELETE SET NULL,
  source_award_id     uuid,
  insured_person_id   text,
  beneficiary_id      uuid,
  employer_id         text,
  product_code        text,
  matter_type_code    text,
  exposure_amount     numeric(18,2),
  priority_code       text NOT NULL DEFAULT 'MEDIUM',
  referral_reason     text NOT NULL,
  status              text NOT NULL DEFAULT 'SUBMITTED_TO_LEGAL',
  submitted_by        text,
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  lg_intake_id        uuid,
  lg_intake_no        text,
  lg_case_id          uuid,
  lg_case_no          text,
  accepted_date       timestamptz,
  rejected_date       timestamptz,
  rejection_reason    text,
  created_by          text,
  updated_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bn_legal_referral_status_chk
    CHECK (status IN ('SUBMITTED_TO_LEGAL','ACCEPTED_BY_LEGAL','REJECTED','IN_LEGAL_PROCEEDINGS','CLOSED'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_legal_referral TO authenticated;
GRANT ALL ON public.bn_legal_referral TO service_role;
GRANT SELECT ON public.bn_legal_referral TO anon;

CREATE INDEX IF NOT EXISTS idx_bn_legal_referral_claim
  ON public.bn_legal_referral(source_claim_id) WHERE source_claim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bn_legal_referral_intake
  ON public.bn_legal_referral(lg_intake_id) WHERE lg_intake_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bn_legal_referral_status
  ON public.bn_legal_referral(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bn_legal_ref_claim_active
  ON public.bn_legal_referral(source_claim_id)
  WHERE source_claim_id IS NOT NULL
    AND status NOT IN ('REJECTED','CLOSED');

CREATE OR REPLACE FUNCTION public.bn_legal_referral_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bn_legal_referral_touch ON public.bn_legal_referral;
CREATE TRIGGER trg_bn_legal_referral_touch
BEFORE UPDATE ON public.bn_legal_referral
FOR EACH ROW EXECUTE FUNCTION public.bn_legal_referral_touch();

-- ============ 5. bn_claim Legal cross-link columns ============
ALTER TABLE public.bn_claim
  ADD COLUMN IF NOT EXISTS lg_referral_id uuid,
  ADD COLUMN IF NOT EXISTS lg_referral_no text,
  ADD COLUMN IF NOT EXISTS lg_intake_id   uuid,
  ADD COLUMN IF NOT EXISTS lg_intake_no   text,
  ADD COLUMN IF NOT EXISTS lg_case_id     uuid,
  ADD COLUMN IF NOT EXISTS lg_case_no     text;

CREATE INDEX IF NOT EXISTS idx_bn_claim_lg_intake
  ON public.bn_claim(lg_intake_id) WHERE lg_intake_id IS NOT NULL;
