
-- =========================================================
-- 1. bn_product_parameter
-- =========================================================
CREATE TABLE IF NOT EXISTS public.bn_product_parameter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  data_type text NOT NULL DEFAULT 'number',  -- number | percent | money | string | boolean
  unit text,
  default_value numeric,
  string_value text,
  product_id uuid,
  scheme_id uuid,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  status text NOT NULL DEFAULT 'DRAFT',       -- DRAFT | IN_REVIEW | APPROVED | RETIRED
  version int NOT NULL DEFAULT 1,
  previous_version_id uuid REFERENCES public.bn_product_parameter(id) ON DELETE SET NULL,
  notes text,
  seed_tag text,
  created_by varchar(50),
  updated_by varchar(50),
  approved_by varchar(50),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_parameter TO authenticated;
GRANT ALL ON public.bn_product_parameter TO service_role;
GRANT SELECT ON public.bn_product_parameter TO anon;

CREATE INDEX IF NOT EXISTS bn_product_parameter_status_idx ON public.bn_product_parameter(status);
CREATE INDEX IF NOT EXISTS bn_product_parameter_eff_idx ON public.bn_product_parameter(effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.bn_product_parameter_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id uuid NOT NULL REFERENCES public.bn_product_parameter(id) ON DELETE CASCADE,
  event_type text NOT NULL,        -- CREATED | UPDATED | SUBMITTED | APPROVED | RETIRED | RESTORED
  actor_user_code varchar(50),
  payload jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_parameter_event TO authenticated;
GRANT ALL ON public.bn_product_parameter_event TO service_role;
GRANT SELECT ON public.bn_product_parameter_event TO anon;
CREATE INDEX IF NOT EXISTS bn_product_parameter_event_param_idx ON public.bn_product_parameter_event(parameter_id);

-- =========================================================
-- 2. bn_derived_fact
-- =========================================================
CREATE TABLE IF NOT EXISTS public.bn_derived_fact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  data_type text NOT NULL DEFAULT 'number',
  unit text,
  expression text NOT NULL DEFAULT '',
  source_fact_codes text[] NOT NULL DEFAULT '{}',
  source_parameter_codes text[] NOT NULL DEFAULT '{}',
  sample_value numeric,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  status text NOT NULL DEFAULT 'DRAFT',
  version int NOT NULL DEFAULT 1,
  previous_version_id uuid REFERENCES public.bn_derived_fact(id) ON DELETE SET NULL,
  notes text,
  seed_tag text,
  created_by varchar(50),
  updated_by varchar(50),
  approved_by varchar(50),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_derived_fact TO authenticated;
GRANT ALL ON public.bn_derived_fact TO service_role;
GRANT SELECT ON public.bn_derived_fact TO anon;

CREATE INDEX IF NOT EXISTS bn_derived_fact_status_idx ON public.bn_derived_fact(status);
CREATE INDEX IF NOT EXISTS bn_derived_fact_eff_idx ON public.bn_derived_fact(effective_from, effective_to);

CREATE TABLE IF NOT EXISTS public.bn_derived_fact_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  derived_fact_id uuid NOT NULL REFERENCES public.bn_derived_fact(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_user_code varchar(50),
  payload jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_derived_fact_event TO authenticated;
GRANT ALL ON public.bn_derived_fact_event TO service_role;
GRANT SELECT ON public.bn_derived_fact_event TO anon;
CREATE INDEX IF NOT EXISTS bn_derived_fact_event_df_idx ON public.bn_derived_fact_event(derived_fact_id);

-- =========================================================
-- 3. bn_formula_template additions
-- =========================================================
ALTER TABLE public.bn_formula_template
  ADD COLUMN IF NOT EXISTS variable_bindings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS last_validation_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation_errors jsonb NOT NULL DEFAULT '[]'::jsonb;

-- =========================================================
-- 4. updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_bn_product_parameter_uat ON public.bn_product_parameter;
CREATE TRIGGER trg_bn_product_parameter_uat
  BEFORE UPDATE ON public.bn_product_parameter
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bn_derived_fact_uat ON public.bn_derived_fact;
CREATE TRIGGER trg_bn_derived_fact_uat
  BEFORE UPDATE ON public.bn_derived_fact
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. Seed Product Parameters (SEED-)
-- =========================================================
INSERT INTO public.bn_product_parameter
  (code, display_name, data_type, unit, default_value, status, seed_tag, created_by, approved_by, approved_at, description)
VALUES
  ('contribution_rate_employer',     'Employer contribution rate',       'percent','%',   5.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Employer C3 contribution rate (SKN)'),
  ('contribution_rate_employee',     'Employee contribution rate',       'percent','%',   5.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Employee C3 contribution rate (SKN)'),
  ('contribution_rate_self_employed','Self-employed contribution rate',  'percent','%',  10.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Self-employed contribution rate (SKN)'),
  ('pension_base_rate_pct',          'Base pension rate',                'percent','%',  30.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Base age pension rate after qualifying years'),
  ('pension_increment_rate_pct',     'Pension increment rate per year',  'percent','%',   1.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Increment per extra qualifying year'),
  ('pension_qualifying_years',       'Pension qualifying years',         'number', 'yrs', 10.0,  'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Years required to qualify for age pension'),
  ('survivor_widow_share_pct',       'Widow/widower share',              'percent','%',  50.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Survivor benefit share for widow/widower'),
  ('survivor_child_share_pct',       'Child survivor share',             'percent','%',  25.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Survivor benefit share per child'),
  ('survivor_family_cap_pct',        'Survivor family cap',              'percent','%', 100.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Maximum aggregate survivor benefit as % of base'),
  ('funeral_grant_amount',           'Funeral grant amount',             'money',  'XCD',2500.0, 'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Flat funeral grant'),
  ('ncp_flat_weekly_rate',           'NCP flat weekly rate',             'money',  'XCD', 250.0, 'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Non-contributory pension flat weekly rate'),
  ('ei_disablement_min_pct',         'EI disablement minimum %',         'percent','%',  30.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Minimum assessed disablement % for EI award'),
  ('maternity_replacement_rate',     'Maternity replacement rate',       'percent','%',  65.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'% of average weekly wage paid for maternity'),
  ('sickness_replacement_rate',      'Sickness replacement rate',        'percent','%',  65.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'% of average weekly wage paid for sickness'),
  ('sickness_waiting_days',          'Sickness waiting days',            'number', 'd',   3.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Waiting days before sickness benefit starts'),
  ('maternity_max_weeks',            'Maternity max weeks',              'number', 'wk', 13.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Maximum payable maternity weeks'),
  ('sickness_max_weeks',             'Sickness max weeks',               'number', 'wk', 26.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Maximum payable sickness weeks'),
  ('injury_replacement_rate',        'Injury benefit replacement rate',  'percent','%',  75.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'% of avg weekly wage paid for injury benefit'),
  ('injury_max_weeks',               'Injury benefit max weeks',         'number', 'wk', 26.0,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Maximum payable injury benefit weeks')
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- 6. Seed Derived Facts (SEED-)
-- =========================================================
INSERT INTO public.bn_derived_fact
  (code, display_name, data_type, unit, expression, source_fact_codes, source_parameter_codes, sample_value, status, seed_tag, created_by, approved_by, approved_at, description)
VALUES
  ('avg_weekly_wage',         'Average weekly wage',             'money',  'XCD', 'sum(wages_in_window) / paid_weeks',                ARRAY['wages_in_window','paid_weeks']::text[],        '{}'::text[],                                                       850,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Average insurable weekly wage over relevant window'),
  ('avg_annual_wage',         'Average annual wage',             'money',  'XCD', 'avg_weekly_wage * 52',                              ARRAY['avg_weekly_wage']::text[],                     '{}'::text[],                                                       44200,  'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Average annual insurable wage'),
  ('paid_weeks',              'Paid weeks',                      'number', 'wk',  'count(ip_wages weeks with any paid_code)',         ARRAY['ip_wages_window']::text[],                     '{}'::text[],                                                       500,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Count of paid contribution weeks'),
  ('credited_weeks',          'Credited weeks',                  'number', 'wk',  'count(credit weeks in window)',                     ARRAY['ip_wages_credit_window']::text[],              '{}'::text[],                                                       20,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Count of credited (non-paid) contribution weeks'),
  ('total_weeks',             'Total weeks (paid + credited)',   'number', 'wk',  'paid_weeks + credited_weeks',                       ARRAY[]::text[],                                      '{}'::text[],                                                       520,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Sum of paid and credited weeks'),
  ('extra_qualifying_years',  'Extra qualifying years',          'number', 'yrs', 'max(0, floor(paid_weeks/52) - pension_qualifying_years)', ARRAY[]::text[],                              ARRAY['pension_qualifying_years']::text[],                          10,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Extra years beyond pension qualifying threshold'),
  ('disablement_degree_pct',  'Disablement degree %',            'percent','%',   'medical_assessment.degree',                         ARRAY['medical_disablement_assessment']::text[],      '{}'::text[],                                                       35,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Assessed disablement degree from medical assessment'),
  ('base_pension',            'Base pension amount',             'money',  'XCD', 'avg_weekly_wage * (pension_base_rate_pct/100)',     ARRAY['avg_weekly_wage']::text[],                     ARRAY['pension_base_rate_pct']::text[],                             1200,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Weekly base pension before increments'),
  ('beneficiary_share_pct',   'Beneficiary share %',             'percent','%',   'survivor_widow_share_pct',                          ARRAY[]::text[],                                      ARRAY['survivor_widow_share_pct','survivor_child_share_pct']::text[], 50,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Beneficiary share for survivor benefit splits'),
  ('family_cap_pct',          'Family cap %',                    'percent','%',   'survivor_family_cap_pct',                           ARRAY[]::text[],                                      ARRAY['survivor_family_cap_pct']::text[],                           100,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Family aggregate survivor cap'),
  ('deceased_paid_weeks_156', 'Deceased contributor paid weeks (156wk)', 'number','wk', 'count(paid weeks in deceased 156-wk window)', ARRAY['deceased_ip_wages_window_156']::text[],       '{}'::text[],                                                       150,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Paid weeks in deceased contributor 156-week window'),
  ('deceased_avg_weekly_wage','Deceased average weekly wage',    'money',  'XCD', 'sum(deceased wages) / deceased_paid_weeks_156',     ARRAY['deceased_ip_wages_window_156']::text[],        '{}'::text[],                                                       820,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Average weekly wage of deceased contributor'),
  ('ncp_flat_amount',         'NCP flat amount',                 'money',  'XCD', 'ncp_flat_weekly_rate',                              ARRAY[]::text[],                                      ARRAY['ncp_flat_weekly_rate']::text[],                              250,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Non-contributory pension payable amount'),
  ('rate_pct',                'Replacement rate %',              'percent','%',   'product-specific replacement rate',                 ARRAY[]::text[],                                      ARRAY['sickness_replacement_rate','maternity_replacement_rate','injury_replacement_rate']::text[], 65, 'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Generic replacement rate variable resolved per product'),
  ('rate',                    'Rate (legacy alias)',             'percent','%',   'alias for rate_pct',                                ARRAY[]::text[],                                      ARRAY['sickness_replacement_rate','maternity_replacement_rate','injury_replacement_rate']::text[], 65, 'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Legacy alias for rate_pct'),
  ('base_rate_pct',           'Base rate %',                     'percent','%',   'pension_base_rate_pct',                             ARRAY[]::text[],                                      ARRAY['pension_base_rate_pct']::text[],                             30,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Base rate alias used by pension formulas'),
  ('base_rate',               'Base rate (alias)',               'percent','%',   'pension_base_rate_pct',                             ARRAY[]::text[],                                      ARRAY['pension_base_rate_pct']::text[],                             30,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for base_rate_pct'),
  ('increment_rate_pct',      'Increment rate %',                'percent','%',   'pension_increment_rate_pct',                        ARRAY[]::text[],                                      ARRAY['pension_increment_rate_pct']::text[],                        1,      'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Pension increment per qualifying year'),
  ('increment_rate',          'Increment rate (alias)',          'percent','%',   'pension_increment_rate_pct',                        ARRAY[]::text[],                                      ARRAY['pension_increment_rate_pct']::text[],                        1,      'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for increment_rate_pct'),
  ('extra_years',             'Extra years (alias)',             'number', 'yrs', 'extra_qualifying_years',                            ARRAY['extra_qualifying_years']::text[],              '{}'::text[],                                                       10,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for extra_qualifying_years'),
  ('share_pct',               'Share %',                         'percent','%',   'beneficiary_share_pct',                             ARRAY['beneficiary_share_pct']::text[],               '{}'::text[],                                                       50,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for beneficiary_share_pct'),
  ('degree',                  'Disablement degree (alias)',      'percent','%',   'disablement_degree_pct',                            ARRAY['disablement_degree_pct']::text[],              '{}'::text[],                                                       35,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for disablement_degree_pct'),
  ('disablement_pct',         'Disablement % (alias)',           'percent','%',   'disablement_degree_pct',                            ARRAY['disablement_degree_pct']::text[],              '{}'::text[],                                                       35,     'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for disablement_degree_pct'),
  ('flat_weekly_rate',        'Flat weekly rate (alias)',        'money',  'XCD', 'ncp_flat_weekly_rate',                              ARRAY[]::text[],                                      ARRAY['ncp_flat_weekly_rate']::text[],                              250,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for ncp_flat_weekly_rate'),
  ('flat_amount',             'Flat amount (alias)',             'money',  'XCD', 'ncp_flat_weekly_rate',                              ARRAY[]::text[],                                      ARRAY['ncp_flat_weekly_rate']::text[],                              250,    'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for flat payable amount'),
  ('monthly_rate',            'Monthly rate',                    'money',  'XCD', 'base_pension * 52 / 12',                            ARRAY['base_pension']::text[],                        '{}'::text[],                                                       1200,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Monthly equivalent of base pension'),
  ('grant_amount',            'Grant amount (alias)',            'money',  'XCD', 'funeral_grant_amount',                              ARRAY[]::text[],                                      ARRAY['funeral_grant_amount']::text[],                              2500,   'APPROVED','SEED-','SYSTEM','SYSTEM',now(),'Alias for funeral_grant_amount')
ON CONFLICT (code) DO NOTHING;
