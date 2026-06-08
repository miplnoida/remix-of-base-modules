
ALTER TABLE public.bn_eligibility_fact
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(30) NOT NULL DEFAULT 'DIRECT_FIELD',
  ADD COLUMN IF NOT EXISTS base_table VARCHAR(160),
  ADD COLUMN IF NOT EXISTS base_date_column VARCHAR(160),
  ADD COLUMN IF NOT EXISTS base_value_columns TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS base_code_columns TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS window_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS window_size INTEGER,
  ADD COLUMN IF NOT EXISTS window_anchor VARCHAR(80),
  ADD COLUMN IF NOT EXISTS count_logic TEXT,
  ADD COLUMN IF NOT EXISTS output_table VARCHAR(160),
  ADD COLUMN IF NOT EXISTS output_column VARCHAR(160),
  ADD COLUMN IF NOT EXISTS output_json_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS snapshot_builder VARCHAR(160);

DO $$ BEGIN
  ALTER TABLE public.bn_eligibility_fact
    ADD CONSTRAINT bn_elig_fact_srctype_chk
    CHECK (source_type IN ('DIRECT_FIELD','DERIVED_AGGREGATE','DOCUMENT_CHECK','EXISTENCE_CHECK','RESOLVER_ONLY'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.bn_eligibility_fact
    ADD CONSTRAINT bn_elig_fact_window_chk
    CHECK (window_type IS NULL OR window_type IN ('WEEKS','MONTHS','YEARS','DAYS'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Backfill existing facts based on category/key heuristics
UPDATE public.bn_eligibility_fact
SET source_type = CASE
  WHEN fact_key LIKE 'document.%' THEN 'DOCUMENT_CHECK'
  WHEN fact_key LIKE 'contribution.%' OR requires_snapshot THEN 'DERIVED_AGGREGATE'
  WHEN fact_key LIKE '%.exists' THEN 'EXISTENCE_CHECK'
  WHEN source_table IS NULL AND resolver_function IS NOT NULL THEN 'RESOLVER_ONLY'
  ELSE 'DIRECT_FIELD'
END
WHERE source_type = 'DIRECT_FIELD';

-- Seed canonical derivation metadata for known contribution-window facts
UPDATE public.bn_eligibility_fact SET
  source_type = 'DERIVED_AGGREGATE',
  base_table = 'ip_wages',
  base_date_column = 'period',
  base_value_columns = ARRAY['wages_paid1','wages_paid2','wages_paid3','wages_paid4','wages_paid5','wages_paid6','wages_paid7'],
  base_code_columns = ARRAY['paid_code1','paid_code2','paid_code3','paid_code4','paid_code5','paid_code6','paid_code7'],
  window_type = 'WEEKS',
  window_size = 13,
  window_anchor = 'claim_date',
  count_logic = 'Count week as paid if any wages_paid1..7 > 0',
  output_table = 'bn_claim_contribution_snapshot',
  output_column = 'contribution_json',
  output_json_key = 'window_13',
  snapshot_builder = 'ensureContributionSnapshot'
WHERE fact_key IN ('contribution.weeks_last_13','contribution.recent_weeks_13');

UPDATE public.bn_eligibility_fact SET
  source_type = 'DERIVED_AGGREGATE',
  base_table = 'ip_wages', base_date_column = 'period',
  base_value_columns = ARRAY['wages_paid1','wages_paid2','wages_paid3','wages_paid4','wages_paid5','wages_paid6','wages_paid7'],
  base_code_columns = ARRAY['paid_code1','paid_code2','paid_code3','paid_code4','paid_code5','paid_code6','paid_code7'],
  window_type = 'WEEKS', window_size = 26, window_anchor = 'claim_date',
  count_logic = 'Count week as paid if any wages_paid1..7 > 0',
  output_table = 'bn_claim_contribution_snapshot', output_column = 'contribution_json', output_json_key = 'window_26',
  snapshot_builder = 'ensureContributionSnapshot'
WHERE fact_key IN ('contribution.weeks_last_26','contribution.recent_weeks_26');

UPDATE public.bn_eligibility_fact SET
  source_type = 'DERIVED_AGGREGATE',
  base_table = 'ip_wages', base_date_column = 'period',
  base_value_columns = ARRAY['wages_paid1','wages_paid2','wages_paid3','wages_paid4','wages_paid5','wages_paid6','wages_paid7'],
  base_code_columns = ARRAY['paid_code1','paid_code2','paid_code3','paid_code4','paid_code5','paid_code6','paid_code7'],
  window_type = 'WEEKS', window_size = 52, window_anchor = 'claim_date',
  count_logic = 'Count week as paid if any wages_paid1..7 > 0',
  output_table = 'bn_claim_contribution_snapshot', output_column = 'contribution_json', output_json_key = 'window_52',
  snapshot_builder = 'ensureContributionSnapshot'
WHERE fact_key IN ('contribution.weeks_last_52','contribution.recent_weeks_52');

UPDATE public.bn_eligibility_fact SET
  source_type = 'DERIVED_AGGREGATE',
  base_table = 'ip_wages', base_date_column = 'period',
  base_value_columns = ARRAY['wages_paid1','wages_paid2','wages_paid3','wages_paid4','wages_paid5','wages_paid6','wages_paid7'],
  base_code_columns = ARRAY['paid_code1','paid_code2','paid_code3','paid_code4','paid_code5','paid_code6','paid_code7'],
  window_type = 'WEEKS', window_size = null, window_anchor = 'claim_date',
  count_logic = 'Count week as paid if any wages_paid1..7 > 0 across all history',
  output_table = 'bn_claim_contribution_snapshot', output_column = 'contribution_json', output_json_key = 'total_weeks',
  snapshot_builder = 'ensureContributionSnapshot'
WHERE fact_key = 'contribution.total_weeks';
