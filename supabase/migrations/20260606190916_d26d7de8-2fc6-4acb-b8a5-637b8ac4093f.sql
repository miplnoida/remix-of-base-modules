
-- Persona / external user identity model
-- Captures the verified relationship between an external portal user (auth.users)
-- and one or more Social Security records (ip_master.ssn).

CREATE TABLE IF NOT EXISTS public.external_user_person_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ssn varchar(50) NOT NULL,
  relationship_type varchar(40) NOT NULL
    CHECK (relationship_type IN ('SELF','GUARDIAN','PAYEE','REPRESENTATIVE','BENEFICIARY','APPLICANT_FOR')),
  is_primary boolean NOT NULL DEFAULT false,
  verification_status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED','REVOKED')),
  verified_at timestamptz,
  verified_by varchar(50),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_user_person_link_uniq UNIQUE (user_id, ssn, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_eupl_user ON public.external_user_person_link(user_id);
CREATE INDEX IF NOT EXISTS idx_eupl_ssn ON public.external_user_person_link(ssn);
CREATE INDEX IF NOT EXISTS idx_eupl_verified
  ON public.external_user_person_link(user_id, verification_status)
  WHERE verification_status = 'VERIFIED';

-- Only one SELF link per user (regardless of SSN) — protects "one person = one SELF identity".
CREATE UNIQUE INDEX IF NOT EXISTS idx_eupl_one_self_per_user
  ON public.external_user_person_link(user_id)
  WHERE relationship_type = 'SELF';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_user_person_link TO authenticated;
GRANT ALL ON public.external_user_person_link TO service_role;
ALTER TABLE public.external_user_person_link ENABLE ROW LEVEL SECURITY;

-- Users may read their own links; insert/update/delete reserved for staff & edge functions (service_role bypass).
CREATE POLICY "eupl_select_own"
  ON public.external_user_person_link
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Append-only audit log for persona-sensitive events
CREATE TABLE IF NOT EXISTS public.external_persona_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type varchar(50) NOT NULL,
  target_ssn varchar(50),
  target_claim_id uuid,
  target_award_id uuid,
  payload jsonb,
  ip varchar(64),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_epa_user_time ON public.external_persona_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_epa_event ON public.external_persona_audit(event_type, created_at DESC);

GRANT SELECT, INSERT ON public.external_persona_audit TO authenticated;
GRANT ALL ON public.external_persona_audit TO service_role;
ALTER TABLE public.external_persona_audit ENABLE ROW LEVEL SECURITY;

-- Users may insert their own audit rows (client-side audit) and read their own log.
CREATE POLICY "epa_insert_own"
  ON public.external_persona_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "epa_select_own"
  ON public.external_persona_audit
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- updated_at trigger for the link table
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eupl_updated_at ON public.external_user_person_link;
CREATE TRIGGER trg_eupl_updated_at
  BEFORE UPDATE ON public.external_user_person_link
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
