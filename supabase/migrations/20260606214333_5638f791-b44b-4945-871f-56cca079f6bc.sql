
-- 1) Extend external_user_person_link with linking metadata
ALTER TABLE public.external_user_person_link
  DROP CONSTRAINT IF EXISTS external_user_person_link_relationship_type_check,
  DROP CONSTRAINT IF EXISTS external_user_person_link_verification_status_check;

ALTER TABLE public.external_user_person_link
  ADD CONSTRAINT external_user_person_link_relationship_type_check
    CHECK (relationship_type IN ('SELF','CLAIMANT','GUARDIAN','PAYEE','REPRESENTATIVE','BENEFICIARY','APPLICANT_FOR')),
  ADD CONSTRAINT external_user_person_link_verification_status_check
    CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED','REVOKED','FAILED','NEEDS_REVIEW'));

ALTER TABLE public.external_user_person_link
  ADD COLUMN IF NOT EXISTS match_score INTEGER,
  ADD COLUMN IF NOT EXISTS match_method VARCHAR(40),
  ADD COLUMN IF NOT EXISTS verification_method VARCHAR(40),
  ADD COLUMN IF NOT EXISTS verified_email BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_phone BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Email / phone OTP verification attempts
CREATE TABLE IF NOT EXISTS public.external_verification_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('EMAIL','PHONE')),
  destination_masked VARCHAR(100) NOT NULL,
  otp_hash TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','VERIFIED','EXPIRED','FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_verification_attempt TO authenticated;
GRANT ALL ON public.external_verification_attempt TO service_role;
CREATE INDEX IF NOT EXISTS idx_eva_user_channel ON public.external_verification_attempt(user_id, channel, status);

-- 3) Identity-link attempt log (rate limiting + audit)
CREATE TABLE IF NOT EXISTS public.external_identity_link_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempted_ssn_masked VARCHAR(50) NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  decision VARCHAR(20) NOT NULL
    CHECK (decision IN ('AUTO_LINK','MANUAL_REVIEW','REJECT','LOCKED')),
  reason VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_identity_link_attempt TO authenticated;
GRANT ALL ON public.external_identity_link_attempt TO service_role;
CREATE INDEX IF NOT EXISTS idx_eila_user_day ON public.external_identity_link_attempt(user_id, created_at DESC);

-- 4) Threshold / toggle config rows in existing external_portal_feature_config
INSERT INTO public.external_portal_feature_config (feature_key, feature_name, description, enabled)
VALUES
  ('requireEmailVerification', 'Require Email Verification', 'Require email verification before SSN linking.', false),
  ('requirePhoneVerification', 'Require Phone Verification', 'Require phone verification before SSN linking.', false),
  ('allowEitherVerificationChannel', 'Allow Either Email or Phone Verification', 'Accept either channel as proof of contact.', true),
  ('limitedAccountsEnabled', 'Allow Limited Accounts', 'Let users sign in without a verified SSN link with restricted features.', true)
ON CONFLICT (feature_key) DO NOTHING;
