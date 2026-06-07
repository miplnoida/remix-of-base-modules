
-- =========================================================================
-- 1. bn_payment_profile
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bn_payment_profile (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_ssn                  text NOT NULL,
  payee_id                    uuid,
  payment_method              text NOT NULL CHECK (payment_method IN ('EFT','CHEQUE','CASH_PICKUP','INTERNAL_TRANSFER')),
  bank_name                   text,
  bank_code                   text,
  branch_name                 text,
  branch_code                 text,
  account_number_masked       text,
  account_number_token        text,
  account_holder_name         text,
  account_holder_relationship text,
  account_type                text,
  payment_currency            text NOT NULL DEFAULT 'XCD',
  postal_address_snapshot     jsonb,
  verification_status         text NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  verified_by                 varchar(50),
  verified_at                 timestamptz,
  active                      boolean NOT NULL DEFAULT true,
  effective_from              date NOT NULL DEFAULT CURRENT_DATE,
  effective_to                date,
  notes                       text,
  entered_by                  varchar(50),
  entered_at                  timestamptz NOT NULL DEFAULT now(),
  modified_by                 varchar(50),
  modified_at                 timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_profile TO authenticated;
GRANT ALL ON public.bn_payment_profile TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_pp_person ON public.bn_payment_profile(person_ssn);
CREATE INDEX IF NOT EXISTS idx_bn_pp_payee  ON public.bn_payment_profile(payee_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_bn_pp_active
  ON public.bn_payment_profile(person_ssn, COALESCE(payee_id, '00000000-0000-0000-0000-000000000000'::uuid), payment_method, payment_currency)
  WHERE active = true;

DROP TRIGGER IF EXISTS trg_bn_pp_updated_at ON public.bn_payment_profile;
CREATE TRIGGER trg_bn_pp_updated_at
  BEFORE UPDATE ON public.bn_payment_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. bn_payment_profile_change_request
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bn_payment_profile_change_request (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id             uuid REFERENCES public.bn_payment_profile(id) ON DELETE SET NULL,
  person_ssn             text NOT NULL,
  claim_id               uuid,
  entitlement_id         uuid,
  requested_by           varchar(50),
  channel                text NOT NULL CHECK (channel IN (
                           'PUBLIC_ONLINE','STAFF_OFFLINE','ASSISTED_COUNTER',
                           'CLAIM_WORKBENCH','EFT_UPDATE_SERVICE','CLAIMANT_PORTAL')),
  old_profile_snapshot   jsonb,
  new_profile_snapshot   jsonb NOT NULL,
  status                 text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CANCELLED')),
  reason                 text,
  proof_document_ids     uuid[] NOT NULL DEFAULT '{}',
  approved_by            varchar(50),
  approved_at            timestamptz,
  rejected_reason        text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_payment_profile_change_request TO authenticated;
GRANT ALL ON public.bn_payment_profile_change_request TO service_role;

CREATE INDEX IF NOT EXISTS idx_bn_ppcr_person ON public.bn_payment_profile_change_request(person_ssn);
CREATE INDEX IF NOT EXISTS idx_bn_ppcr_status ON public.bn_payment_profile_change_request(status);
CREATE INDEX IF NOT EXISTS idx_bn_ppcr_claim  ON public.bn_payment_profile_change_request(claim_id);

DROP TRIGGER IF EXISTS trg_bn_ppcr_updated_at ON public.bn_payment_profile_change_request;
CREATE TRIGGER trg_bn_ppcr_updated_at
  BEFORE UPDATE ON public.bn_payment_profile_change_request
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. Extend bn_payment_instruction
-- =========================================================================
ALTER TABLE public.bn_payment_instruction
  ADD COLUMN IF NOT EXISTS payment_profile_id uuid REFERENCES public.bn_payment_profile(id);

CREATE INDEX IF NOT EXISTS idx_bn_pi_payment_profile
  ON public.bn_payment_instruction(payment_profile_id);

-- =========================================================================
-- 4. Extend bn_product_channel_config — payment policy
-- =========================================================================
ALTER TABLE public.bn_product_channel_config
  ADD COLUMN IF NOT EXISTS payment_required_at_application       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_required_before_approval      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_required_before_payment       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_third_party_payee               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_guardian_payee                  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_bank_verification             boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_supervisor_approval_for_change boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_proof_for_change              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cheque_address_required               boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allowed_payment_methods               text[]  NOT NULL DEFAULT ARRAY['EFT','CHEQUE'],
  ADD COLUMN IF NOT EXISTS default_payment_method                text;

-- =========================================================================
-- 5. App_modules registration + auto Admin permissions
-- =========================================================================
INSERT INTO public.app_modules (name, display_name, description, route, parent_id, sort_order, show_in_menu, is_enabled)
VALUES (
  'bn_payment_profiles',
  'Payment Profiles',
  'Verified payment profiles (bank / cheque address) used across BN payments',
  '/bn/payment-profiles',
  'bfaed564-14ce-47a1-816b-8dd5fb9fa539',
  70, true, true)
ON CONFLICT (name) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      route        = EXCLUDED.route,
      parent_id    = EXCLUDED.parent_id,
      sort_order   = EXCLUDED.sort_order,
      show_in_menu = true,
      is_enabled   = true;

WITH m AS (SELECT id FROM public.app_modules WHERE name = 'bn_payment_profiles')
INSERT INTO public.module_actions (module_id, action_name, display_name)
SELECT m.id, a.action_name, a.display_name
FROM m, (VALUES
  ('view','View'),
  ('create','Create'),
  ('edit','Edit'),
  ('delete','Delete'),
  ('verify','Verify Bank'),
  ('approve_change','Approve Change'),
  ('reject_change','Reject Change')
) AS a(action_name, display_name)
ON CONFLICT (module_id, action_name) DO NOTHING;
