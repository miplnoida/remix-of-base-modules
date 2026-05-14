
-- 1. Restore c3_bonus_policy_exceptions table
CREATE TABLE IF NOT EXISTS public.c3_bonus_policy_exceptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_from text NOT NULL,
  date_to text,
  exception_type text NOT NULL DEFAULT 'onetime',
  exception_month integer NOT NULL DEFAULT 1,
  year_from integer NOT NULL DEFAULT 2025,
  year_to integer,
  override_default boolean NOT NULL DEFAULT false,
  include_in_levy boolean,
  include_in_severance boolean,
  calculation_method text,
  calc_flat_enabled boolean,
  calc_flat_percentage numeric,
  calc_slab_enabled boolean,
  distribution jsonb,
  min_bonus_amount numeric,
  max_bonus_amount numeric,
  contrib_employee boolean,
  contrib_employer boolean,
  contrib_eir boolean,
  contrib_severance boolean,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_by text,
  created_on timestamptz NOT NULL DEFAULT now(),
  modified_by text,
  modified_on timestamptz NOT NULL DEFAULT now()
);

-- 2. Drop the bonus levy exemptions table
DROP TABLE IF EXISTS public.c3_bonus_levy_exemptions CASCADE;

-- 3. Drop the is_bonus_levy_exempt function if it exists
DROP FUNCTION IF EXISTS public.is_bonus_levy_exempt(integer, integer);
