
-- Add violation_type_id to ce_calculation_rules (optional FK)
ALTER TABLE public.ce_calculation_rules
ADD COLUMN IF NOT EXISTS violation_type_id UUID REFERENCES public.ce_violation_types(id) ON DELETE SET NULL;

-- Add violation_type_id to ce_escalation_rules (optional FK)
ALTER TABLE public.ce_escalation_rules
ADD COLUMN IF NOT EXISTS violation_type_id UUID REFERENCES public.ce_violation_types(id) ON DELETE SET NULL;

-- Add violation_id to ce_penalty_calculations (optional FK)
ALTER TABLE public.ce_penalty_calculations
ADD COLUMN IF NOT EXISTS violation_id UUID REFERENCES public.ce_violations(id) ON DELETE SET NULL;

-- Indexes for the new FK columns
CREATE INDEX IF NOT EXISTS idx_ce_calculation_rules_violation_type_id ON public.ce_calculation_rules(violation_type_id);
CREATE INDEX IF NOT EXISTS idx_ce_escalation_rules_violation_type_id ON public.ce_escalation_rules(violation_type_id);
CREATE INDEX IF NOT EXISTS idx_ce_penalty_calculations_violation_id ON public.ce_penalty_calculations(violation_id);
