
-- Generic configuration assignment engine (Phase 1).
-- One row per (domain, business_event, scope, resource) — serves communication,
-- workflow, numbering, branding, reporting, AI, and future domains.
-- Follows project NO-RLS policy: no RLS on public; access enforced at app layer.

CREATE TABLE IF NOT EXISTS public.core_configuration_assignment (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain            TEXT NOT NULL,
  business_event    TEXT,                -- NULL = wildcard for this domain
  scope_level       TEXT NOT NULL CHECK (scope_level IN (
                      'GLOBAL','ORG','MODULE','DEPARTMENT','LOCATION',
                      'WORKFLOW','WORKFLOW_STAGE','USER'
                    )),
  scope_ref         JSONB NOT NULL DEFAULT '{}'::jsonb,
  resource_type     TEXT NOT NULL,
  resource_ref      JSONB NOT NULL DEFAULT '{}'::jsonb,
  rule_set          JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority          INTEGER NOT NULL DEFAULT 0,
  effective_from    TIMESTAMPTZ,
  effective_to      TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_by        VARCHAR(50),
  updated_by        VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_configuration_assignment TO authenticated;
GRANT ALL ON public.core_configuration_assignment TO service_role;

CREATE INDEX IF NOT EXISTS idx_cca_lookup
  ON public.core_configuration_assignment (domain, business_event, resource_type, is_active);

CREATE INDEX IF NOT EXISTS idx_cca_scope
  ON public.core_configuration_assignment (scope_level, is_active);

CREATE INDEX IF NOT EXISTS idx_cca_scope_ref_gin
  ON public.core_configuration_assignment USING GIN (scope_ref);

CREATE INDEX IF NOT EXISTS idx_cca_resource_ref_gin
  ON public.core_configuration_assignment USING GIN (resource_ref);

-- updated_at trigger (reuse standard project helper if present, else create local)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column' AND pronamespace = 'public'::regnamespace) THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $fn$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_cca_updated_at ON public.core_configuration_assignment;
CREATE TRIGGER trg_cca_updated_at
  BEFORE UPDATE ON public.core_configuration_assignment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.core_configuration_assignment IS
  'Generic configuration assignment engine. See docs/architecture/configuration-assignment-engine.md and docs/architecture/scope-precedence.md.';
