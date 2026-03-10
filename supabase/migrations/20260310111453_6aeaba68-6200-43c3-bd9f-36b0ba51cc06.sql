
-- Likelihood configuration
CREATE TABLE public.ia_risk_likelihood_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  score INTEGER NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Impact configuration
CREATE TABLE public.ia_risk_impact_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  score INTEGER NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Control effectiveness configuration
CREATE TABLE public.ia_control_effectiveness_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  reduction_percentage INTEGER NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Risk classification thresholds
CREATE TABLE public.ia_risk_classification_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  min_score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL,
  color TEXT DEFAULT '#gray',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT
);

-- Add function_id to ia_rcm_processes
ALTER TABLE public.ia_rcm_processes ADD COLUMN IF NOT EXISTS function_id UUID REFERENCES public.ia_department_functions(id);

-- Add residual risk columns to ia_rcm_risks
ALTER TABLE public.ia_rcm_risks ADD COLUMN IF NOT EXISTS inherent_risk_score NUMERIC;
ALTER TABLE public.ia_rcm_risks ADD COLUMN IF NOT EXISTS residual_risk_score NUMERIC;
ALTER TABLE public.ia_rcm_risks ADD COLUMN IF NOT EXISTS risk_level TEXT;

-- Add effectiveness reduction to ia_rcm_controls
ALTER TABLE public.ia_rcm_controls ADD COLUMN IF NOT EXISTS effectiveness_reduction INTEGER DEFAULT 0;
