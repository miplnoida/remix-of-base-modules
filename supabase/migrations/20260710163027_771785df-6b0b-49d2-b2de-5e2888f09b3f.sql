ALTER TABLE public.communication_hub_sender_profile
  ADD COLUMN IF NOT EXISTS dkim_selector text NULL,
  ADD COLUMN IF NOT EXISTS provider_identity_id text NULL,
  ADD COLUMN IF NOT EXISTS provider_last_response_summary jsonb NULL;

COMMENT ON COLUMN public.communication_hub_sender_profile.dkim_selector IS
  'CH-S3: DKIM selector used for DNS probe (e.g. "resend"). Non-secret.';
COMMENT ON COLUMN public.communication_hub_sender_profile.provider_identity_id IS
  'CH-S3: Provider (Resend) domain/identity id resolved by probe. Non-secret.';
COMMENT ON COLUMN public.communication_hub_sender_profile.provider_last_response_summary IS
  'CH-S3: Safe summary of last provider probe (no secrets, no tokens).';