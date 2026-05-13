
-- Add violation_type_id FK to ce_calculation_rules
ALTER TABLE public.ce_calculation_rules
  ADD COLUMN IF NOT EXISTS violation_type_id UUID REFERENCES public.ce_violation_types(id);

-- Add violation_type_id FK to ce_escalation_rules  
ALTER TABLE public.ce_escalation_rules
  ADD COLUMN IF NOT EXISTS violation_type_id UUID REFERENCES public.ce_violation_types(id);

-- Index for join performance
CREATE INDEX IF NOT EXISTS idx_ce_calc_rules_vt ON public.ce_calculation_rules(violation_type_id);
CREATE INDEX IF NOT EXISTS idx_ce_esc_rules_vt ON public.ce_escalation_rules(violation_type_id);
