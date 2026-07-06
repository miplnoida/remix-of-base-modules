
-- Extend SSB Contribution Calendar Policy with rule-based due-date fields.
-- Additive only. No BN/BEMA/IA/legacy tables touched.

ALTER TABLE public.ssb_contribution_calendar_policy
  ADD COLUMN IF NOT EXISTS due_date_rule_type    text,
  ADD COLUMN IF NOT EXISTS due_day                int,
  ADD COLUMN IF NOT EXISTS days_after_period_end  int,
  ADD COLUMN IF NOT EXISTS nth_working_day        int,
  ADD COLUMN IF NOT EXISTS working_day_adjustment text,
  ADD COLUMN IF NOT EXISTS grace_period_days      int,
  ADD COLUMN IF NOT EXISTS interest_start_basis   text,
  ADD COLUMN IF NOT EXISTS penalty_start_basis    text,
  ADD COLUMN IF NOT EXISTS calendar_source_code   text,
  ADD COLUMN IF NOT EXISTS weekend_days           jsonb,
  ADD COLUMN IF NOT EXISTS leap_year_handling     text,
  ADD COLUMN IF NOT EXISTS custom_formula_text    text;

-- Constraints on enum-like columns (add only if not already present).
DO $$ BEGIN
  ALTER TABLE public.ssb_contribution_calendar_policy
    ADD CONSTRAINT ssb_ccp_due_rule_chk CHECK (
      due_date_rule_type IS NULL OR due_date_rule_type IN (
        'fixed_day_of_current_month',
        'fixed_day_of_next_month',
        'end_of_month',
        'last_working_day_of_month',
        'nth_working_day_after_period_end',
        'days_after_period_end',
        'custom_formula_text'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ssb_contribution_calendar_policy
    ADD CONSTRAINT ssb_ccp_wda_chk CHECK (
      working_day_adjustment IS NULL OR working_day_adjustment IN (
        'none','next_working_day','previous_working_day','nearest_working_day'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ssb_contribution_calendar_policy
    ADD CONSTRAINT ssb_ccp_interest_chk CHECK (
      interest_start_basis IS NULL OR interest_start_basis IN (
        'none','day_after_due','day_after_grace_end','custom'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ssb_contribution_calendar_policy
    ADD CONSTRAINT ssb_ccp_penalty_chk CHECK (
      penalty_start_basis IS NULL OR penalty_start_basis IN (
        'none','day_after_due','day_after_grace_end','custom'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.ssb_contribution_calendar_policy
    ADD CONSTRAINT ssb_ccp_leap_chk CHECK (
      leap_year_handling IS NULL OR leap_year_handling IN (
        'natural','fixed_to_28','extend_to_29'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill existing rows into the new rule model without touching lifecycle.
UPDATE public.ssb_contribution_calendar_policy
   SET due_date_rule_type    = COALESCE(due_date_rule_type,    'fixed_day_of_current_month'),
       due_day                = COALESCE(due_day, payment_due_day, filing_due_day),
       working_day_adjustment = COALESCE(working_day_adjustment,'next_working_day'),
       grace_period_days      = COALESCE(grace_period_days,     0),
       interest_start_basis   = COALESCE(interest_start_basis,  'day_after_grace_end'),
       penalty_start_basis    = COALESCE(penalty_start_basis,   'day_after_grace_end'),
       weekend_days           = COALESCE(weekend_days,          '[0,6]'::jsonb),
       leap_year_handling     = COALESCE(leap_year_handling,    'natural'),
       calendar_source_code   = COALESCE(calendar_source_code,  'KN-NATIONAL');
