
-- ============================================================
-- SSB Policy Lifecycle: add versioning + effective-dating fields
-- ============================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'ssb_address_policy',
    'ssb_communication_policy',
    'ssb_contribution_calendar_policy',
    'ssb_document_policy',
    'ssb_financial_policy',
    'ssb_identity_policy',
    'ssb_legal_policy',
    'ssb_numbering_policy',
    'ssb_workflow_policy'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT ''DRAFT'',
      ADD COLUMN IF NOT EXISTS effective_from date,
      ADD COLUMN IF NOT EXISTS effective_to date,
      ADD COLUMN IF NOT EXISTS version_no integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS supersedes_policy_id uuid,
      ADD COLUMN IF NOT EXISTS approved_by text,
      ADD COLUMN IF NOT EXISTS approved_at timestamptz,
      ADD COLUMN IF NOT EXISTS retired_by text,
      ADD COLUMN IF NOT EXISTS retired_at timestamptz,
      ADD COLUMN IF NOT EXISTS retirement_reason text', t);

    -- Backfill: pre-existing rows become the current ACTIVE v1
    EXECUTE format('UPDATE public.%I
      SET status = ''ACTIVE'',
          is_current = true,
          effective_from = COALESCE(effective_from, created_at::date)
      WHERE status = ''DRAFT'' AND is_current = false', t);

    -- Add status check
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      t, t || '_status_chk');
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I
      CHECK (status IN (''DRAFT'',''SCHEDULED'',''ACTIVE'',''RETIRED'',''SUPERSEDED''))',
      t, t || '_status_chk');
  END LOOP;
END $$;

-- Partial unique indexes: at most one CURRENT policy per scope
CREATE UNIQUE INDEX IF NOT EXISTS ssb_address_policy_current_uidx
  ON public.ssb_address_policy (profile_id, country_code) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_communication_policy_current_uidx
  ON public.ssb_communication_policy (profile_id, template_code, channel) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_contribution_calendar_policy_current_uidx
  ON public.ssb_contribution_calendar_policy (profile_id) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_document_policy_current_uidx
  ON public.ssb_document_policy (profile_id, document_type_code, applies_to) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_financial_policy_current_uidx
  ON public.ssb_financial_policy (profile_id, binding_kind, reference_code) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_identity_policy_current_uidx
  ON public.ssb_identity_policy (profile_id, identity_type_code) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_legal_policy_current_uidx
  ON public.ssb_legal_policy (profile_id, legal_reference_code, applies_to) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_numbering_policy_current_uidx
  ON public.ssb_numbering_policy (profile_id, entity_code) WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ssb_workflow_policy_current_uidx
  ON public.ssb_workflow_policy (profile_id, workflow_code, applies_to) WHERE is_current;

-- Effective-window lookup indexes
CREATE INDEX IF NOT EXISTS ssb_address_policy_eff_idx
  ON public.ssb_address_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_identity_policy_eff_idx
  ON public.ssb_identity_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_numbering_policy_eff_idx
  ON public.ssb_numbering_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_financial_policy_eff_idx
  ON public.ssb_financial_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_legal_policy_eff_idx
  ON public.ssb_legal_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_document_policy_eff_idx
  ON public.ssb_document_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_workflow_policy_eff_idx
  ON public.ssb_workflow_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_communication_policy_eff_idx
  ON public.ssb_communication_policy (profile_id, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS ssb_contribution_calendar_policy_eff_idx
  ON public.ssb_contribution_calendar_policy (profile_id, effective_from, effective_to);

-- ============================================================
-- Audit log for policy lifecycle events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ssb_policy_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_table text NOT NULL,
  policy_id uuid NOT NULL,
  profile_id uuid,
  action text NOT NULL CHECK (action IN (
    'CREATE_DRAFT','UPDATE_DRAFT','APPROVE','SCHEDULE','ACTIVATE',
    'RETIRE','SUPERSEDE','CANCEL'
  )),
  actor text,
  reason text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_policy_audit TO authenticated;
GRANT ALL ON public.ssb_policy_audit TO service_role;

CREATE INDEX IF NOT EXISTS ssb_policy_audit_lookup_idx
  ON public.ssb_policy_audit (policy_table, policy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ssb_policy_audit_profile_idx
  ON public.ssb_policy_audit (profile_id, created_at DESC);
