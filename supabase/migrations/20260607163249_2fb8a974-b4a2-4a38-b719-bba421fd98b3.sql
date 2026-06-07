ALTER TABLE public.bn_eligibility_rule
  ADD COLUMN IF NOT EXISTS group_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS severity VARCHAR(10) NOT NULL DEFAULT 'BLOCK',
  ADD COLUMN IF NOT EXISTS overrideable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_policy_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fact_key VARCHAR(80);

COMMENT ON COLUMN public.bn_eligibility_rule.group_code IS 'Fixed eligibility group code (CORE_IDENTITY, CONTRIBUTION, EMPLOYMENT, EVENT, EVIDENCE, EXISTING_BENEFIT, SPECIAL)';
COMMENT ON COLUMN public.bn_eligibility_rule.severity IS 'BLOCK = hard fail, WARN = soft warning';
COMMENT ON COLUMN public.bn_eligibility_rule.overrideable IS 'Whether a supervisor can override the rule failure';
COMMENT ON COLUMN public.bn_eligibility_rule.override_policy_code IS 'Policy code controlling who/when overrides apply';
COMMENT ON COLUMN public.bn_eligibility_rule.fact_key IS 'Promoted fact_key from rule_definition for indexing/lookup';

CREATE INDEX IF NOT EXISTS idx_bn_eligibility_rule_group_code ON public.bn_eligibility_rule(group_code);
CREATE INDEX IF NOT EXISTS idx_bn_eligibility_rule_fact_key ON public.bn_eligibility_rule(fact_key);