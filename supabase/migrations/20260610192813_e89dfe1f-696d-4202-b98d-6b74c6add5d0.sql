
ALTER TABLE public.bn_formula_template
  ADD COLUMN IF NOT EXISTS required_parameters jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.bn_product_parameter
  (code, display_name, description, data_type, unit, default_value, status, seed_tag, approved_at, approved_by)
VALUES
  ('contribution_unit_size','Contribution unit size (weeks)','Weeks per contribution unit','number','weeks',50,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('base_weeks','Base qualifying weeks','Baseline weeks before tiered increment','number','weeks',500,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('increment_unit_size','Increment unit size (weeks)','Weeks per increment tier','number','weeks',50,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('payable_days_per_week','Payable days per week','Working days used to convert weeks/days','number','days',6,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('rate','Generic rate','Generic percentage rate','percent','%',0.65,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('replacement_rate','Replacement rate','Wage replacement rate','percent','%',0.65,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('base_rate','Base pension rate','Base pension percentage','percent','%',0.30,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('increment_rate','Increment rate','Tiered pension increment percentage','percent','%',0.01,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('unit_rate','Unit rate amount','Amount paid per contribution unit','money','XCD',300,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('flat_weekly_rate','Flat weekly rate','Flat weekly benefit amount','money','XCD',250,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('flat_amount','Flat amount','Generic flat grant amount','money','XCD',600,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('grant_amount','Grant amount','Fixed grant amount','money','XCD',2500,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('grant_rate','Grant rate per unit','Amount per contribution unit','money','XCD',150,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('pension_rate','Pension rate','Pension percentage of insurable wage','percent','%',0.30,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('disablement_rate','Disablement rate','Disablement percentage multiplier','percent','%',1.00,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('reimbursement_rate','Reimbursement rate','Medical reimbursement percentage','percent','%',0.80,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('reimbursement_limit','Reimbursement limit','Maximum reimbursable amount','money','XCD',5000,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('waiting_days','Waiting days','Days excluded from benefit','number','days',3,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('minimum_amount','Minimum amount','Lower cap on benefit','money','XCD',0,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('maximum_amount','Maximum amount','Upper cap on benefit','money','XCD',999999,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('maximum_survivor_cap','Maximum survivor cap','Aggregate cap across survivors','money','XCD',999999,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('child_share_percent','Child share %','Child survivor share','percent','%',0.166,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('spouse_share_percent','Spouse share %','Spouse survivor share','percent','%',0.50,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('share_pct','Beneficiary share %','Generic beneficiary share','percent','%',0.50,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('beneficiary_share_percent','Beneficiary share %','Beneficiary share of base pension','percent','%',0.50,'APPROVED','SEED-FORMULA',now(),'SEED')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.bn_eligibility_fact
  (fact_key, label, category, description, data_type, source_type, is_active, sample_values, implementation_status, required_context)
VALUES
  ('average_weekly_wage','Average weekly wage','contribution','Average weekly wage','number','RESOLVER_ONLY',true,'[850]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('avg_weekly_wage','Average weekly wage (alias)','contribution','Alias','number','RESOLVER_ONLY',true,'[850]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('average_insurable_wage','Average insurable wage','contribution','Average insurable wage','number','RESOLVER_ONLY',true,'[4000]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('disablement_percentage','Disablement %','medical','Disablement percentage','number','RESOLVER_ONLY',true,'[0.35]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('degree','Disablement degree %','medical','Alias','number','RESOLVER_ONLY',true,'[35]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('total_weeks','Total contribution weeks','contribution','Paid + credited weeks','number','RESOLVER_ONLY',true,'[520]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('extra_years','Extra qualifying years','contribution','Years above tiered threshold','number','RESOLVER_ONLY',true,'[10]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('approved_days','Approved days','claim','Approved benefit days','number','RESOLVER_ONLY',true,'[30]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('payable_days','Payable days','claim','Days payable','number','RESOLVER_ONLY',true,'[20]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('total_period_days','Total period days','claim','Total days in period','number','RESOLVER_ONLY',true,'[30]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('approved_expense_amount','Approved expense','medical','Approved medical expense','number','RESOLVER_ONLY',true,'[1200]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('weekly_amount','Weekly amount','derived','Working weekly amount','number','RESOLVER_ONLY',true,'[300]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('monthly_amount','Monthly amount','derived','Working monthly amount','number','RESOLVER_ONLY',true,'[1300]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('daily_rate','Daily rate','derived','Per-day rate','number','RESOLVER_ONLY',true,'[60]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('period_amount','Period amount','derived','Amount for period','number','RESOLVER_ONLY',true,'[1200]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('calculated_amount','Calculated amount','derived','Upstream calc result','number','RESOLVER_ONLY',true,'[1200]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('total_survivor_amount','Total survivor amount','derived','Sum of survivor allocations','number','RESOLVER_ONLY',true,'[1800]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('retroactive_months','Retroactive months','claim','Retroactive months','number','RESOLVER_ONLY',true,'[3]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('periodic_amount','Periodic amount','derived','Periodic amount for arrears','number','RESOLVER_ONLY',true,'[400]'::jsonb,'IMPLEMENTED','CLAIM'),
  ('number_of_periods_due','Periods due','claim','Periods due','number','RESOLVER_ONLY',true,'[6]'::jsonb,'IMPLEMENTED','CLAIM')
ON CONFLICT DO NOTHING;

INSERT INTO public.bn_derived_fact
  (code, display_name, description, data_type, unit, expression, source_fact_codes, source_parameter_codes, sample_value, status, seed_tag, approved_at, approved_by)
VALUES
  ('contribution_units','Contribution units','Weeks / unit size','number','units',
    'floor(total_weeks / contribution_unit_size)',
    ARRAY['total_weeks'], ARRAY['contribution_unit_size'], 10,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('additional_contribution_units','Additional contribution units','Tiered increment units','number','units',
    'max(floor((total_weeks - base_weeks) / increment_unit_size), 0)',
    ARRAY['total_weeks'], ARRAY['base_weeks','increment_unit_size'], 0,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('payable_weeks','Payable weeks','Approved days / payable days per week','number','weeks',
    'approved_days / payable_days_per_week',
    ARRAY['approved_days'], ARRAY['payable_days_per_week'], 5,'APPROVED','SEED-FORMULA',now(),'SEED'),
  ('survivor_total_share','Survivor total share','Sum of beneficiary shares','percent','%',
    'sum(beneficiary_share_percent)',
    ARRAY['beneficiary_share_percent'], ARRAY[]::text[], 1.0,'APPROVED','SEED-FORMULA',now(),'SEED')
ON CONFLICT (code) DO NOTHING;

UPDATE public.bn_formula_template SET
  formula_expression='contribution_units * unit_rate',
  required_parameters='["contribution_unit_size","unit_rate"]'::jsonb,
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code='AGE_GRANT';

UPDATE public.bn_formula_template SET
  formula_expression='average_weekly_wage * replacement_rate',
  required_parameters='["replacement_rate"]'::jsonb,
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code IN ('PCT-AVG-WAGE','PCT_AVG_WEEKLY_WAGE');

UPDATE public.bn_formula_template SET
  formula_expression='base_rate + (increment_rate * additional_contribution_units)',
  required_parameters='["base_rate","base_weeks","increment_rate","increment_unit_size"]'::jsonb,
  output_variable='base_pension',
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code='TIERED-PENSION';

UPDATE public.bn_formula_template SET
  formula_expression='base_pension * beneficiary_share_percent',
  required_parameters='[]'::jsonb,
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code='SURVIVOR-SPLIT';

UPDATE public.bn_formula_template SET
  formula_expression='flat_weekly_rate',
  required_parameters='["flat_weekly_rate"]'::jsonb,
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code='NCP-FLAT-RATE';

UPDATE public.bn_formula_template SET
  formula_expression='grant_amount',
  required_parameters='["grant_amount"]'::jsonb,
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code='FUNERAL-GRANT';

UPDATE public.bn_formula_template SET
  formula_expression='average_weekly_wage * disablement_percentage * replacement_rate',
  required_parameters='["replacement_rate"]'::jsonb,
  validation_status='UNKNOWN', last_validation_at=NULL, validation_errors='[]'::jsonb
WHERE template_code='EI-DISABLEMENT';
