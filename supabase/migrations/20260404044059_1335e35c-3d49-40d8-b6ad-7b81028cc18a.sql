
-- ============================================================
-- Calculation Engine Tables
-- ============================================================

-- 1. Calculation Run (one row per full engine execution)
CREATE TABLE public.bn_calc_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  product_version_id UUID,
  run_mode TEXT NOT NULL DEFAULT 'LIVE' CHECK (run_mode IN ('LIVE','SIMULATION','COMPARISON')),
  run_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (run_status IN ('PENDING','RUNNING','COMPLETED','FAILED','OVERRIDDEN')),
  triggered_by TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  -- Eligibility summary
  eligibility_passed BOOLEAN,
  eligibility_results JSONB DEFAULT '[]'::jsonb,
  -- Contribution window
  contribution_window JSONB DEFAULT '{}'::jsonb,
  -- Wage aggregation
  wage_summary JSONB DEFAULT '{}'::jsonb,
  -- Calculated amounts
  weekly_rate NUMERIC(12,2),
  monthly_rate NUMERIC(12,2),
  lump_sum NUMERIC(12,2),
  annual_amount NUMERIC(12,2),
  -- Beneficiary allocation
  beneficiary_splits JSONB DEFAULT '[]'::jsonb,
  -- Payment schedule
  payment_schedule JSONB DEFAULT '[]'::jsonb,
  payment_frequency TEXT,
  payment_start_date DATE,
  payment_end_date DATE,
  -- Variables snapshot
  variables_snapshot JSONB DEFAULT '{}'::jsonb,
  -- Validation
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  -- Override
  override_applied BOOLEAN DEFAULT false,
  override_by TEXT,
  override_reason TEXT,
  override_approved_by TEXT,
  override_approved_at TIMESTAMPTZ,
  -- Legacy comparison
  legacy_result JSONB,
  comparison_diff JSONB,
  comparison_match BOOLEAN,
  -- Metadata
  country_code TEXT DEFAULT 'KN',
  entered_by TEXT,
  entered_at TIMESTAMPTZ DEFAULT now(),
  modified_by TEXT,
  modified_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bn_calc_run_claim ON public.bn_calc_run(claim_id);
CREATE INDEX idx_bn_calc_run_mode ON public.bn_calc_run(run_mode);

-- 2. Calculation Trace (step-by-step audit trail for each run)
CREATE TABLE public.bn_calc_trace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calc_run_id UUID NOT NULL REFERENCES public.bn_calc_run(id) ON DELETE CASCADE,
  engine_layer TEXT NOT NULL,
  step_number INT NOT NULL,
  step_code TEXT NOT NULL,
  step_label TEXT NOT NULL,
  rule_code TEXT,
  formula_expression TEXT,
  inputs JSONB DEFAULT '{}'::jsonb,
  output_value NUMERIC(14,4),
  output_text TEXT,
  passed BOOLEAN,
  severity TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO','WARN','ERROR','FATAL')),
  message TEXT,
  duration_ms INT,
  entered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bn_calc_trace_run ON public.bn_calc_trace(calc_run_id);

-- 3. Calculation Override requests
CREATE TABLE public.bn_calc_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calc_run_id UUID NOT NULL REFERENCES public.bn_calc_run(id) ON DELETE CASCADE,
  override_target TEXT NOT NULL,
  field_path TEXT NOT NULL,
  original_value TEXT,
  override_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX idx_bn_calc_override_run ON public.bn_calc_override(calc_run_id);

-- 4. Legacy comparison snapshots
CREATE TABLE public.bn_calc_legacy_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  legacy_system TEXT DEFAULT 'LEGACY_V1',
  legacy_claim_ref TEXT,
  legacy_weekly_rate NUMERIC(12,2),
  legacy_monthly_rate NUMERIC(12,2),
  legacy_lump_sum NUMERIC(12,2),
  legacy_raw_output JSONB DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ DEFAULT now(),
  captured_by TEXT,
  notes TEXT
);

CREATE INDEX idx_bn_calc_legacy_claim ON public.bn_calc_legacy_snapshot(claim_id);

-- 5. Simulation presets
CREATE TABLE public.bn_calc_simulation_preset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_name TEXT NOT NULL,
  description TEXT,
  product_id UUID,
  product_version_id UUID,
  input_parameters JSONB DEFAULT '{}'::jsonb,
  expected_output JSONB DEFAULT '{}'::jsonb,
  country_code TEXT DEFAULT 'KN',
  is_active BOOLEAN DEFAULT true,
  entered_by TEXT,
  entered_at TIMESTAMPTZ DEFAULT now(),
  modified_by TEXT,
  modified_at TIMESTAMPTZ DEFAULT now()
);
