-- ── Compliance Rule Simulator: persistent run history ──
CREATE TABLE IF NOT EXISTS public.ce_rule_simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NULL,
  rule_code TEXT NULL,
  rule_type TEXT NULL CHECK (rule_type IS NULL OR rule_type IN ('detection','calculation','escalation','all')),
  employer_regno TEXT NULL,
  period TEXT NULL,
  simulation_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','partial','failed','draft')),
  notes TEXT NULL,
  executed_by VARCHAR(50) NULL,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_rule_sim_runs_rule_id ON public.ce_rule_simulation_runs(rule_id);
CREATE INDEX IF NOT EXISTS idx_ce_rule_sim_runs_employer ON public.ce_rule_simulation_runs(employer_regno);
CREATE INDEX IF NOT EXISTS idx_ce_rule_sim_runs_executed_at ON public.ce_rule_simulation_runs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_rule_sim_runs_executed_by ON public.ce_rule_simulation_runs(executed_by);

COMMENT ON TABLE public.ce_rule_simulation_runs IS 'Audit history of Compliance Rule Simulator dry-runs. Never produces live violations; storage-only for review/export.';