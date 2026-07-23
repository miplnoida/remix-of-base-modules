
ALTER TABLE public.comm_hub_sender_readiness
  ADD COLUMN IF NOT EXISTS readiness_kind text NOT NULL DEFAULT 'TEST_READY',
  ADD COLUMN IF NOT EXISTS verification_evidence_version text,
  ADD COLUMN IF NOT EXISTS provider_code text,
  ADD COLUMN IF NOT EXISTS provider_version text,
  ADD COLUMN IF NOT EXISTS environment_code text,
  ADD COLUMN IF NOT EXISTS environment_version text,
  ADD COLUMN IF NOT EXISTS evidence_hash text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advisories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS computed_by uuid,
  ADD COLUMN IF NOT EXISTS reason text;

CREATE INDEX IF NOT EXISTS idx_sender_readiness_lookup
  ON public.comm_hub_sender_readiness (sender_profile_id, readiness_kind, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sender_readiness_hash
  ON public.comm_hub_sender_readiness (sender_profile_id, readiness_kind, evidence_hash);
