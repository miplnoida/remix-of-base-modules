-- ── P1: Audit Session + Configurable Completion Gate ──────────────────

-- 1. Extend ce_inspections with session + execution-mode columns
ALTER TABLE public.ce_inspections
  ADD COLUMN IF NOT EXISTS execution_mode text
    CHECK (execution_mode IN ('ONSITE','DESKTOP_REVIEW','DOCUMENT_REVIEW')),
  ADD COLUMN IF NOT EXISTS gps_unavailable_reason text,
  ADD COLUMN IF NOT EXISTS session_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_gate_overridden_by text,
  ADD COLUMN IF NOT EXISTS completion_gate_override_reason text,
  ADD COLUMN IF NOT EXISTS completion_gate_overridden_at timestamptz;

-- 2. Completion-gate configuration (admin-tunable)
CREATE TABLE IF NOT EXISTS public.ce_completion_gate_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'GLOBAL',
  enforcement_mode text NOT NULL DEFAULT 'STRICT'
    CHECK (enforcement_mode IN ('STRICT','SELF_SERVICE','SOFT_WARNING')),
  require_checklist_complete boolean NOT NULL DEFAULT true,
  require_findings_recorded boolean NOT NULL DEFAULT true,
  require_report_saved boolean NOT NULL DEFAULT true,
  require_followups_for_severity text DEFAULT 'MEDIUM'
    CHECK (require_followups_for_severity IN ('LOW','MEDIUM','HIGH','CRITICAL') OR require_followups_for_severity IS NULL),
  require_evidence_min_count int NOT NULL DEFAULT 0,
  override_requires_role text DEFAULT 'COMPLIANCE_SUPERVISOR',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CONSTRAINT ce_completion_gate_config_scope_unique UNIQUE (scope)
);

-- 3. Seed default GLOBAL row if missing
INSERT INTO public.ce_completion_gate_config (scope, enforcement_mode)
SELECT 'GLOBAL', 'STRICT'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ce_completion_gate_config WHERE scope = 'GLOBAL'
);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_ce_completion_gate_config_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_completion_gate_config_updated_at ON public.ce_completion_gate_config;
CREATE TRIGGER trg_ce_completion_gate_config_updated_at
  BEFORE UPDATE ON public.ce_completion_gate_config
  FOR EACH ROW EXECUTE FUNCTION public.tg_ce_completion_gate_config_updated_at();

-- 5. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ce_inspections_session_started
  ON public.ce_inspections (session_started_at) WHERE session_started_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ce_inspections_execution_mode
  ON public.ce_inspections (execution_mode) WHERE execution_mode IS NOT NULL;