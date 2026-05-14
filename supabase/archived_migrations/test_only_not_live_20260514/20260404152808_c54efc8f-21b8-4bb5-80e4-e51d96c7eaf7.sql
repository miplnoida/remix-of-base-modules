
-- ============================================================
-- Benefit Simulation Engine — 7 Isolated Tables
-- Prefix: bn_sim_  |  Zero impact on production tables
-- ============================================================

-- 1. bn_sim_scenario — container grouping simulation runs
CREATE TABLE public.bn_sim_scenario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_name TEXT NOT NULL,
  description TEXT,
  product_id UUID,                        -- soft ref to bn_product
  product_version_id UUID,                -- soft ref to bn_product_version
  country_code TEXT DEFAULT 'KN',
  status TEXT NOT NULL DEFAULT 'DRAFT',   -- DRAFT | RUNNING | COMPLETED | FAILED | ARCHIVED
  tags TEXT[],
  entered_by TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_sim_scenario_product ON public.bn_sim_scenario(product_id);
CREATE INDEX idx_bn_sim_scenario_status ON public.bn_sim_scenario(status);

-- 2. bn_sim_config_snapshot — frozen copy of rules at run time
CREATE TABLE public.bn_sim_config_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.bn_sim_scenario(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL,             -- ELIGIBILITY | CALCULATION | DOCUMENT | INTERACTION | FULL
  product_version_id UUID,                -- soft ref
  config_data JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by TEXT
);

CREATE INDEX idx_bn_sim_config_snap_scenario ON public.bn_sim_config_snapshot(scenario_id);

-- 3. bn_sim_run — individual execution run inside a scenario
CREATE TABLE public.bn_sim_run (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES public.bn_sim_scenario(id) ON DELETE CASCADE,
  run_number INT NOT NULL DEFAULT 1,
  run_mode TEXT NOT NULL DEFAULT 'SIMULATION',  -- SIMULATION | WHAT_IF | COMPARISON
  run_status TEXT NOT NULL DEFAULT 'PENDING',   -- PENDING | RUNNING | COMPLETED | FAILED | CANCELLED
  config_snapshot_id UUID REFERENCES public.bn_sim_config_snapshot(id),
  product_version_id UUID,                      -- soft ref
  country_code TEXT DEFAULT 'KN',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  error_message TEXT,
  warnings JSONB,
  triggered_by TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_sim_run_scenario ON public.bn_sim_run(scenario_id);
CREATE INDEX idx_bn_sim_run_status ON public.bn_sim_run(run_status);

-- 4. bn_sim_run_input — synthetic / test input parameters per run
CREATE TABLE public.bn_sim_run_input (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_run_id UUID NOT NULL REFERENCES public.bn_sim_run(id) ON DELETE CASCADE,
  input_key TEXT NOT NULL,                -- e.g. 'ssn', 'claim_date', 'wages', 'age'
  input_value TEXT,
  input_type TEXT DEFAULT 'STRING',       -- STRING | NUMBER | DATE | JSON
  input_json JSONB,                       -- structured input for complex data
  sort_order INT DEFAULT 0,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_sim_run_input_run ON public.bn_sim_run_input(sim_run_id);

-- 5. bn_sim_run_output — computed results per run
CREATE TABLE public.bn_sim_run_output (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_run_id UUID NOT NULL REFERENCES public.bn_sim_run(id) ON DELETE CASCADE,
  output_key TEXT NOT NULL,               -- e.g. 'weekly_rate', 'lump_sum', 'eligibility_passed'
  output_value TEXT,
  output_numeric NUMERIC,
  output_json JSONB,                      -- complex outputs (payment_schedule, splits)
  output_type TEXT DEFAULT 'NUMBER',      -- NUMBER | TEXT | BOOLEAN | JSON
  sort_order INT DEFAULT 0,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_sim_run_output_run ON public.bn_sim_run_output(sim_run_id);

-- 6. bn_sim_rule_trace — eligibility / validation rule trace per run
CREATE TABLE public.bn_sim_rule_trace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_run_id UUID NOT NULL REFERENCES public.bn_sim_run(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  engine_layer TEXT NOT NULL,             -- ELIGIBILITY | VALIDATION | INTERACTION
  rule_code TEXT,
  rule_label TEXT,
  inputs JSONB,
  passed BOOLEAN,
  message TEXT,
  severity TEXT,                          -- INFO | WARNING | ERROR | BLOCKER
  duration_ms INT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_sim_rule_trace_run ON public.bn_sim_rule_trace(sim_run_id);

-- 7. bn_sim_formula_trace — calculation formula trace per run
CREATE TABLE public.bn_sim_formula_trace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sim_run_id UUID NOT NULL REFERENCES public.bn_sim_run(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  engine_layer TEXT NOT NULL,             -- FORMULA | WAGE_AGG | BENEFICIARY_SPLIT | PAYMENT_SCHEDULE
  step_code TEXT NOT NULL,
  step_label TEXT NOT NULL,
  formula_expression TEXT,
  inputs JSONB,
  output_value NUMERIC,
  output_text TEXT,
  duration_ms INT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bn_sim_formula_trace_run ON public.bn_sim_formula_trace(sim_run_id);
