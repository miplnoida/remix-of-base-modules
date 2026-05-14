
-- 1. Master table for Income Codes
CREATE TABLE public.tb_income_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  description VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100)
);

-- 2. Income Code Policy Default table (per income code, supports all 3 date modes)
CREATE TABLE public.c3_income_code_policy_default (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_code_id UUID NOT NULL REFERENCES public.tb_income_codes(id) ON DELETE CASCADE,
  date_entry_mode VARCHAR(20) NOT NULL DEFAULT 'no_dates',
  -- date_entry_mode: 'dates_mandatory' (Case 1), 'dates_optional' (Case 2), 'no_dates' (Case 3)
  date_from VARCHAR(10) NOT NULL,
  date_to VARCHAR(10),

  -- Holiday-style fields (used for dates_mandatory and dates_optional modes)
  policy_type VARCHAR(20) DEFAULT 'without_dates',
  -- policy_type: 'with_dates' or 'without_dates' (only relevant when date_entry_mode != 'no_dates')
  distribution_enabled BOOLEAN DEFAULT false,

  -- Levy rules
  levy_include BOOLEAN DEFAULT true,
  levy_calculation_method VARCHAR(10) DEFAULT 'merge',
  levy_calc_flat_enabled BOOLEAN DEFAULT false,
  levy_calc_flat_percentage NUMERIC,
  levy_calc_slab_enabled BOOLEAN DEFAULT false,
  levy_distribution JSONB DEFAULT '{"weekly":{"w1":false,"w2":false,"w3":false,"w4":false,"divide":false},"biweekly":{"b1":false,"b2":false,"divide":true},"semimonthly":{"s1":false,"s2":false,"divide":false},"monthly":{"m1":true}}'::jsonb,

  -- SSC rules (for holiday-style)
  ssc_include BOOLEAN DEFAULT true,
  ssc_contrib_employee BOOLEAN DEFAULT true,
  ssc_contrib_employer BOOLEAN DEFAULT true,
  ssc_contrib_eib BOOLEAN DEFAULT false,

  -- Bonus-style contrib fields (for no_dates mode)
  contrib_employee BOOLEAN DEFAULT true,
  contrib_employer BOOLEAN DEFAULT true,
  contrib_eir BOOLEAN DEFAULT false,
  contrib_severance BOOLEAN DEFAULT false,

  -- Common
  include_in_levy BOOLEAN DEFAULT true,
  include_in_severance BOOLEAN DEFAULT false,
  calculation_method VARCHAR(10) DEFAULT 'merge',
  calc_flat_enabled BOOLEAN DEFAULT false,
  calc_flat_percentage NUMERIC,
  calc_slab_enabled BOOLEAN DEFAULT false,
  distribution JSONB DEFAULT '{"weekly":{"w1":false,"w2":false,"w3":false,"w4":false,"divide":false},"biweekly":{"b1":false,"b2":false,"divide":true},"semimonthly":{"s1":false,"s2":false,"divide":false},"monthly":{"m1":true}}'::jsonb,
  min_amount NUMERIC,
  max_amount NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(100),
  created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modified_by VARCHAR(100),
  modified_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Income Code Policy Exceptions table
CREATE TABLE public.c3_income_code_policy_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  income_code_id UUID NOT NULL REFERENCES public.tb_income_codes(id) ON DELETE CASCADE,
  date_entry_mode VARCHAR(20) NOT NULL DEFAULT 'no_dates',
  date_from VARCHAR(10) NOT NULL,
  date_to VARCHAR(10),
  exception_type VARCHAR(10) NOT NULL DEFAULT 'onetime',
  exception_month INTEGER NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER,
  policy_type VARCHAR(20) DEFAULT 'without_dates',
  override_default BOOLEAN DEFAULT false,

  -- Holiday-style overrides
  distribution_enabled BOOLEAN,
  levy_include BOOLEAN,
  levy_calculation_method VARCHAR(10),
  levy_calc_flat_enabled BOOLEAN,
  levy_calc_flat_percentage NUMERIC,
  levy_calc_slab_enabled BOOLEAN,
  levy_distribution JSONB,
  ssc_include BOOLEAN,
  ssc_contrib_employee BOOLEAN,
  ssc_contrib_employer BOOLEAN,
  ssc_contrib_eib BOOLEAN,

  -- Bonus-style overrides
  include_in_levy BOOLEAN,
  include_in_severance BOOLEAN,
  calculation_method VARCHAR(10),
  calc_flat_enabled BOOLEAN,
  calc_flat_percentage NUMERIC,
  calc_slab_enabled BOOLEAN,
  distribution JSONB,
  contrib_employee BOOLEAN,
  contrib_employer BOOLEAN,
  contrib_eir BOOLEAN,
  contrib_severance BOOLEAN,

  min_amount NUMERIC,
  max_amount NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by VARCHAR(100),
  created_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  modified_by VARCHAR(100),
  modified_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_income_codes_active ON public.tb_income_codes(is_active);
CREATE INDEX idx_ic_policy_default_code ON public.c3_income_code_policy_default(income_code_id);
CREATE INDEX idx_ic_policy_exceptions_code ON public.c3_income_code_policy_exceptions(income_code_id);
