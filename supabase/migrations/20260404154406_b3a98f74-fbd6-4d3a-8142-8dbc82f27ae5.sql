
-- Add missing columns to bn_sim_scenario for the full Scenario Builder form
ALTER TABLE public.bn_sim_scenario
  ADD COLUMN IF NOT EXISTS scenario_code text,
  ADD COLUMN IF NOT EXISTS scheme_id uuid,
  ADD COLUMN IF NOT EXISTS scenario_type text NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS input_payload jsonb,
  ADD COLUMN IF NOT EXISTS base_claim_ref text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Index on scenario_code for lookups
CREATE INDEX IF NOT EXISTS idx_bn_sim_scenario_code ON public.bn_sim_scenario(scenario_code);
-- Index on scheme for filtering
CREATE INDEX IF NOT EXISTS idx_bn_sim_scenario_scheme ON public.bn_sim_scenario(scheme_id);
