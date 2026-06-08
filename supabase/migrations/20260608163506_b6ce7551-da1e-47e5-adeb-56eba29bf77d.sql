
INSERT INTO public.bn_eligibility_fact
  (fact_key, label, category, description, source_table, source_column, resolver_function, data_type, allowed_operators, applicable_products, example_value, implementation_status, requires_snapshot, requires_claim_context, requires_ssn, requires_deceased_ssn)
VALUES
  ('contribution.credited_weeks','Credited contribution weeks','CONTRIBUTION','Credited (non-paid) weeks from contribution snapshot.','bn_claim_contribution_snapshot','credited_weeks','resolveContribCreditedWeeks','number',ARRAY['>=','<=','=','!=','between'],ARRAY['*'],'20','IMPLEMENTED',true,true,true,false),
  ('contribution.weeks_last_13','Contribution weeks in last 13','CONTRIBUTION','Paid weeks in the 13 weeks preceding the claim date.','bn_claim_contribution_snapshot / ip_wages','window_13','resolveContribWeeksLast13','number',ARRAY['>=','<=','=','!=','between'],ARRAY['*'],'8','IMPLEMENTED',true,true,true,false),
  ('contribution.weeks_last_26','Contribution weeks in last 26','CONTRIBUTION','Paid weeks in the 26 weeks preceding the claim date.','bn_claim_contribution_snapshot / ip_wages','window_26','resolveContribWeeksLast26','number',ARRAY['>=','<=','=','!=','between'],ARRAY['*'],'13','IMPLEMENTED',true,true,true,false),
  ('contribution.weeks_last_39','Contribution weeks in last 39','CONTRIBUTION','Paid weeks in the 39 weeks preceding the claim date.','bn_claim_contribution_snapshot / ip_wages','window_39','resolveContribWeeksLast39','number',ARRAY['>=','<=','=','!=','between'],ARRAY['*'],'20','IMPLEMENTED',true,true,true,false),
  ('contribution.weeks_last_52','Contribution weeks in last 52','CONTRIBUTION','Paid weeks in the 52 weeks preceding the claim date.','bn_claim_contribution_snapshot / ip_wages','window_52','resolveContribWeeksLast52','number',ARRAY['>=','<=','=','!=','between'],ARRAY['*'],'40','IMPLEMENTED',true,true,true,false),
  ('contribution.weeks_last_12_months','Contribution weeks in last 12 months','CONTRIBUTION','Paid weeks in the 12 months preceding the claim date.','bn_claim_contribution_snapshot / ip_wages','window_12m','resolveContribWeeksLast12Months','number',ARRAY['>=','<=','=','!=','between'],ARRAY['*'],'40','IMPLEMENTED',true,true,true,false),
  ('deceased.contribution.total_weeks','Deceased: total contribution weeks','CONTRIBUTION','Total contribution weeks for the deceased contributor (Funeral / Survivors).','bn_claim_contribution_snapshot / ip_wages','total_weeks','resolveDeceasedContribTotalWeeks','number',ARRAY['>=','<=','=','!=','between'],ARRAY['SKN-FUN','SKN-SURV'],'150','IMPLEMENTED',true,true,false,true),
  ('deceased.contribution.paid_weeks','Deceased: paid contribution weeks','CONTRIBUTION','Paid contribution weeks for the deceased.','bn_claim_contribution_snapshot / ip_wages','paid_weeks','resolveDeceasedContribPaidWeeks','number',ARRAY['>=','<=','=','!=','between'],ARRAY['SKN-FUN','SKN-SURV'],'120','IMPLEMENTED',true,true,false,true),
  ('deceased.contribution.recent_weeks','Deceased: recent contribution weeks','CONTRIBUTION','Recent paid weeks for the deceased (most recent qualifying window).','bn_claim_contribution_snapshot / ip_wages','recent_weeks','resolveDeceasedContribRecentWeeks','number',ARRAY['>=','<=','=','!=','between'],ARRAY['SKN-FUN','SKN-SURV'],'8','IMPLEMENTED',true,true,false,true),
  ('deceased.contribution.weeks_last_12_months','Deceased: contribution weeks in last 12 months','CONTRIBUTION','Paid weeks in the 12 months preceding death.','bn_claim_contribution_snapshot / ip_wages','window_12m','resolveDeceasedContribWeeksLast12Months','number',ARRAY['>=','<=','=','!=','between'],ARRAY['SKN-FUN','SKN-SURV'],'40','IMPLEMENTED',true,true,false,true)
ON CONFLICT (fact_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  source_table = EXCLUDED.source_table,
  source_column = EXCLUDED.source_column,
  resolver_function = EXCLUDED.resolver_function,
  allowed_operators = EXCLUDED.allowed_operators,
  applicable_products = EXCLUDED.applicable_products,
  implementation_status = EXCLUDED.implementation_status,
  requires_snapshot = EXCLUDED.requires_snapshot,
  requires_claim_context = EXCLUDED.requires_claim_context,
  requires_ssn = EXCLUDED.requires_ssn,
  requires_deceased_ssn = EXCLUDED.requires_deceased_ssn,
  is_active = true,
  updated_at = now();
