
-- ============================================================
-- Eligibility rule engine: typed rule kinds + diagnostics
-- ============================================================

-- 1. Enums --------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.bn_eligibility_rule_kind AS ENUM (
    'LITERAL','FACT_TO_FACT','DATE_DIFFERENCE','DOCUMENT_STATUS',
    'EXISTS','CROSS_PRODUCT','DERIVED_FACT','CONDITIONAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bn_eligibility_rule_severity AS ENUM (
    'BLOCKING','REFER','WARNING','INFO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bn_eligibility_rule_unit AS ENUM (
    'DAYS','WEEKS','MONTHS','YEARS'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Extend bn_eligibility_rule (additive, nullable) -------------------
ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS rule_kind             public.bn_eligibility_rule_kind NOT NULL DEFAULT 'LITERAL',
  ADD COLUMN IF NOT EXISTS start_fact_key        text,
  ADD COLUMN IF NOT EXISTS end_fact_key          text,
  ADD COLUMN IF NOT EXISTS fallback_end_fact_key text,
  ADD COLUMN IF NOT EXISTS compare_fact_key      text,
  ADD COLUMN IF NOT EXISTS document_type_code    text,
  ADD COLUMN IF NOT EXISTS required_status       text,
  ADD COLUMN IF NOT EXISTS existence_check_code  text,
  ADD COLUMN IF NOT EXISTS unit                  public.bn_eligibility_rule_unit,
  ADD COLUMN IF NOT EXISTS severity              public.bn_eligibility_rule_severity NOT NULL DEFAULT 'REFER',
  ADD COLUMN IF NOT EXISTS overrideable          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS override_policy_code  text,
  ADD COLUMN IF NOT EXISTS reason_code_group     text,
  ADD COLUMN IF NOT EXISTS conditional_when      jsonb,
  ADD COLUMN IF NOT EXISTS message_template      text;

-- 3. Diagnostics table -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bn_eligibility_diagnostic (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid NOT NULL,
  rule_id         uuid REFERENCES public.bn_eligibility_rule(id) ON DELETE SET NULL,
  rule_code       text,
  rule_kind       public.bn_eligibility_rule_kind,
  source_fact     text,
  source_resolver text,
  source_table    text,
  actual_value    text,
  expected_value  text,
  operator        text,
  unit            public.bn_eligibility_rule_unit,
  result          text NOT NULL,
  severity        public.bn_eligibility_rule_severity,
  override_status text,
  message         text,
  context_ssn     text,
  context_claim_id uuid,
  notes           jsonb,
  evaluated_at    timestamptz NOT NULL DEFAULT now(),
  created_by      text
);

CREATE INDEX IF NOT EXISTS idx_bn_elig_diag_run    ON public.bn_eligibility_diagnostic(run_id);
CREATE INDEX IF NOT EXISTS idx_bn_elig_diag_rule   ON public.bn_eligibility_diagnostic(rule_id);
CREATE INDEX IF NOT EXISTS idx_bn_elig_diag_claim  ON public.bn_eligibility_diagnostic(context_claim_id);
CREATE INDEX IF NOT EXISTS idx_bn_elig_diag_when   ON public.bn_eligibility_diagnostic(evaluated_at DESC);

-- Grants (RLS disabled per project policy; role-based access only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_eligibility_diagnostic TO authenticated;
GRANT ALL ON public.bn_eligibility_diagnostic TO service_role;
