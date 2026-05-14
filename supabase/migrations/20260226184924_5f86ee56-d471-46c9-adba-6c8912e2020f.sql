
-- Table for Default Bonus Policy configuration
CREATE TABLE public.c3_bonus_policy_default (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  include_in_levy BOOLEAN NOT NULL DEFAULT true,
  include_in_severance BOOLEAN NOT NULL DEFAULT false,
  calculation_method TEXT NOT NULL DEFAULT 'merge' CHECK (calculation_method IN ('merge', 'separate')),
  calc_flat_enabled BOOLEAN NOT NULL DEFAULT false,
  calc_flat_percentage NUMERIC(5,2) DEFAULT NULL,
  calc_slab_enabled BOOLEAN NOT NULL DEFAULT true,
  distribution JSONB NOT NULL DEFAULT '{
    "weekly": { "w1": false, "w2": false, "w3": false, "w4": false, "divide": false },
    "biweekly": { "b1": false, "b2": false, "divide": true },
    "semimonthly": { "s1": false, "s2": false, "divide": false },
    "monthly": { "m1": true }
  }'::jsonb,
  min_bonus_amount NUMERIC(12,2) DEFAULT 1000,
  max_bonus_amount NUMERIC(12,2) DEFAULT 75000,
  contrib_employee BOOLEAN NOT NULL DEFAULT true,
  contrib_employer BOOLEAN NOT NULL DEFAULT true,
  contrib_eir BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for Bonus Policy Exceptions
CREATE TABLE public.c3_bonus_policy_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exception_type TEXT NOT NULL DEFAULT 'onetime' CHECK (exception_type IN ('onetime', 'recurring')),
  exception_month INTEGER NOT NULL CHECK (exception_month BETWEEN 1 AND 12),
  year_from INTEGER NOT NULL,
  year_to INTEGER,
  override_default BOOLEAN NOT NULL DEFAULT false,
  include_in_levy BOOLEAN DEFAULT true,
  include_in_severance BOOLEAN DEFAULT false,
  calculation_method TEXT DEFAULT 'merge' CHECK (calculation_method IN ('merge', 'separate')),
  calc_flat_enabled BOOLEAN DEFAULT false,
  calc_flat_percentage NUMERIC(5,2),
  calc_slab_enabled BOOLEAN DEFAULT true,
  distribution JSONB DEFAULT '{}'::jsonb,
  min_bonus_amount NUMERIC(12,2),
  max_bonus_amount NUMERIC(12,2),
  contrib_employee BOOLEAN DEFAULT true,
  contrib_employer BOOLEAN DEFAULT true,
  contrib_eir BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert a default row
INSERT INTO public.c3_bonus_policy_default (
  include_in_levy, include_in_severance, calculation_method,
  calc_flat_enabled, calc_slab_enabled,
  min_bonus_amount, max_bonus_amount,
  contrib_employee, contrib_employer, contrib_eir
) VALUES (
  true, false, 'merge',
  false, true,
  1000, 75000,
  true, true, false
);
