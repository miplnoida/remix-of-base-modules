
-- 1) Extend bn_country_participant_type with staged verification intent + optional proof hints
ALTER TABLE public.bn_country_participant_type
  ADD COLUMN IF NOT EXISTS requires_identity_verification boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS requires_relationship_or_authority_proof boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS relationship_category text,
  ADD COLUMN IF NOT EXISTS authority_category text,
  ADD COLUMN IF NOT EXISTS online_access_allowed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_apply_for_self boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_apply_for_others boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_receive_communication boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_receive_payment boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_officer_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS proof_requirement_code text,
  ADD COLUMN IF NOT EXISTS suggested_document_category text,
  ADD COLUMN IF NOT EXISTS suggested_document_label text;

-- Backfill from legacy columns where present
UPDATE public.bn_country_participant_type
   SET requires_identity_verification = COALESCE(requires_id, true)
 WHERE requires_identity_verification IS DISTINCT FROM COALESCE(requires_id, true);

UPDATE public.bn_country_participant_type
   SET requires_relationship_or_authority_proof = COALESCE(requires_relationship_proof, false)
 WHERE requires_relationship_or_authority_proof IS DISTINCT FROM COALESCE(requires_relationship_proof, false);

-- 2) Optional later-stage linkage to Document Library
CREATE TABLE IF NOT EXISTS public.bn_country_participant_proof_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.bn_country(country_code) ON DELETE CASCADE,
  participant_type_code text NOT NULL,
  proof_requirement_code text NOT NULL,
  document_type_id uuid,
  service_document_type_id uuid,
  effective_from date,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  entered_by text,
  entered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bn_cpp_link_country_type
  ON public.bn_country_participant_proof_link(country_code, participant_type_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_country_participant_proof_link TO authenticated;
GRANT ALL ON public.bn_country_participant_proof_link TO service_role;
