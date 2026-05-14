
-- ============================================================
-- Holiday Pay Policy Default Table
-- Mirrors c3_bonus_policy_default but with separate Levy & SSC rules
-- and with_dates / without_dates policy type
-- ============================================================
CREATE TABLE public.c3_holiday_pay_policy_default (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_from DATE NOT NULL DEFAULT CURRENT_DATE,
  date_to DATE,
  policy_type TEXT NOT NULL DEFAULT 'without_dates',  -- 'with_dates' | 'without_dates'
  distribution_enabled BOOLEAN NOT NULL DEFAULT true, -- only relevant for with_dates

  -- Levy rules (independent)
  levy_include BOOLEAN NOT NULL DEFAULT true,
  levy_calculation_method TEXT NOT NULL DEFAULT 'merge',  -- 'merge' | 'separate'
  levy_calc_flat_enabled BOOLEAN NOT NULL DEFAULT false,
  levy_calc_flat_percentage NUMERIC,
  levy_calc_slab_enabled BOOLEAN NOT NULL DEFAULT false,
  levy_distribution JSONB NOT NULL DEFAULT '{"weekly":{"w1":false,"w2":false,"w3":false,"w4":false,"divide":false},"biweekly":{"b1":false,"b2":false,"divide":true},"semimonthly":{"s1":false,"s2":false,"divide":false},"monthly":{"m1":true}}'::jsonb,

  -- Social Security Contribution rules (independent)
  ssc_include BOOLEAN NOT NULL DEFAULT true,
  ssc_contrib_employee BOOLEAN NOT NULL DEFAULT true,
  ssc_contrib_employer BOOLEAN NOT NULL DEFAULT true,
  ssc_contrib_eib BOOLEAN NOT NULL DEFAULT false,

  -- Common
  include_in_severance BOOLEAN NOT NULL DEFAULT false,
  min_holiday_amount NUMERIC,
  max_holiday_amount NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger: date_to >= date_from
CREATE OR REPLACE FUNCTION public.validate_holiday_pay_policy_default_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_to IS NOT NULL AND NEW.date_to < NEW.date_from THEN
    RAISE EXCEPTION 'date_to cannot be earlier than date_from';
  END IF;
  IF NEW.policy_type NOT IN ('with_dates', 'without_dates') THEN
    RAISE EXCEPTION 'policy_type must be with_dates or without_dates';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_holiday_pay_policy_default_dates
  BEFORE INSERT OR UPDATE ON public.c3_holiday_pay_policy_default
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_holiday_pay_policy_default_dates();

-- ============================================================
-- Holiday Pay Policy Exceptions Table
-- ============================================================
CREATE TABLE public.c3_holiday_pay_policy_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_from DATE NOT NULL,
  date_to DATE,
  exception_type TEXT NOT NULL DEFAULT 'onetime',  -- 'onetime' | 'recurring'
  exception_month INTEGER NOT NULL,
  year_from INTEGER NOT NULL,
  year_to INTEGER,
  policy_type TEXT NOT NULL DEFAULT 'without_dates',  -- 'with_dates' | 'without_dates'
  override_default BOOLEAN NOT NULL DEFAULT false,

  -- Levy rules (nullable for non-override)
  levy_include BOOLEAN DEFAULT true,
  levy_calculation_method TEXT,
  levy_calc_flat_enabled BOOLEAN,
  levy_calc_flat_percentage NUMERIC,
  levy_calc_slab_enabled BOOLEAN,
  levy_distribution JSONB,

  -- SSC rules (nullable for non-override)
  ssc_include BOOLEAN,
  ssc_contrib_employee BOOLEAN,
  ssc_contrib_employer BOOLEAN,
  ssc_contrib_eib BOOLEAN,

  -- Common
  distribution_enabled BOOLEAN,
  include_in_severance BOOLEAN,
  min_holiday_amount NUMERIC,
  max_holiday_amount NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for exceptions
CREATE OR REPLACE FUNCTION public.validate_holiday_pay_policy_exception()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.exception_month < 1 OR NEW.exception_month > 12 THEN
    RAISE EXCEPTION 'exception_month must be between 1 and 12';
  END IF;
  IF NEW.exception_type NOT IN ('onetime', 'recurring') THEN
    RAISE EXCEPTION 'exception_type must be onetime or recurring';
  END IF;
  IF NEW.policy_type NOT IN ('with_dates', 'without_dates') THEN
    RAISE EXCEPTION 'policy_type must be with_dates or without_dates';
  END IF;
  IF NEW.year_to IS NOT NULL AND NEW.year_to < NEW.year_from THEN
    RAISE EXCEPTION 'year_to cannot be earlier than year_from';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_holiday_pay_policy_exception
  BEFORE INSERT OR UPDATE ON public.c3_holiday_pay_policy_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_holiday_pay_policy_exception();

-- ============================================================
-- Pending Holiday Pay Table (for date-based distribution to future periods)
-- ============================================================
CREATE TABLE public.c3_pending_holiday_pay (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_c3_id UUID,
  ssn TEXT NOT NULL,
  target_period TEXT NOT NULL,  -- 'YYYY-MM' format
  amount NUMERIC NOT NULL DEFAULT 0,
  holiday_date_from DATE,
  holiday_date_to DATE,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'applied'
  applied_c3_id UUID,
  applied_at TIMESTAMPTZ,
  created_by TEXT,
  created_on TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by TEXT,
  modified_on TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by SSN + period
CREATE INDEX idx_pending_holiday_pay_ssn_period ON public.c3_pending_holiday_pay (ssn, target_period);
CREATE INDEX idx_pending_holiday_pay_status ON public.c3_pending_holiday_pay (status) WHERE status = 'pending';
