
CREATE TABLE IF NOT EXISTS public.ia_risk_config_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_name TEXT NOT NULL DEFAULT 'Default Risk Configuration',
  description TEXT,
  formula_type TEXT NOT NULL DEFAULT 'likelihood_x_impact',
  formula_display TEXT NOT NULL DEFAULT 'Likelihood × Impact',
  dept_risk_method TEXT NOT NULL DEFAULT 'maximum',
  scale_min INTEGER NOT NULL DEFAULT 1,
  scale_max INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'SYSTEM',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT DEFAULT 'SYSTEM'
);

-- Seed with a default active configuration
INSERT INTO public.ia_risk_config_master (config_name, description, formula_type, formula_display, dept_risk_method, scale_min, scale_max, is_active, version, created_by, updated_by)
VALUES ('Default Risk Configuration', 'Default risk scoring configuration for Internal Audit', 'likelihood_x_impact', 'Likelihood × Impact', 'maximum', 1, 5, true, 1, 'SYSTEM', 'SYSTEM');
