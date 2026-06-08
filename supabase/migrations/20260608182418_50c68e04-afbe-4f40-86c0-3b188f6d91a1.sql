
-- ============================================================
-- bn_data_source_registry — allowed source tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_data_source_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system varchar(20) NOT NULL CHECK (source_system IN ('BEMA','BN','SHARED')),
  table_name    varchar(100) NOT NULL UNIQUE,
  display_name  varchar(200) NOT NULL,
  description   text,
  active        boolean NOT NULL DEFAULT true,
  seed_tag      varchar(20),
  created_by    varchar(50),
  updated_by    varchar(50),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_data_source_registry TO authenticated;
GRANT ALL ON public.bn_data_source_registry TO service_role;

CREATE INDEX IF NOT EXISTS ix_bn_dsr_active ON public.bn_data_source_registry(active);
CREATE INDEX IF NOT EXISTS ix_bn_dsr_system ON public.bn_data_source_registry(source_system);

-- ============================================================
-- bn_data_field_registry — allowed columns for those tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_data_field_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    varchar(100) NOT NULL REFERENCES public.bn_data_source_registry(table_name) ON UPDATE CASCADE,
  column_name   varchar(100) NOT NULL,
  display_name  varchar(200) NOT NULL,
  data_type     varchar(30)  NOT NULL,
  is_date       boolean NOT NULL DEFAULT false,
  is_amount     boolean NOT NULL DEFAULT false,
  is_code       boolean NOT NULL DEFAULT false,
  active        boolean NOT NULL DEFAULT true,
  seed_tag      varchar(20),
  created_by    varchar(50),
  updated_by    varchar(50),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_name, column_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_data_field_registry TO authenticated;
GRANT ALL ON public.bn_data_field_registry TO service_role;

CREATE INDEX IF NOT EXISTS ix_bn_dfr_table   ON public.bn_data_field_registry(table_name);
CREATE INDEX IF NOT EXISTS ix_bn_dfr_active  ON public.bn_data_field_registry(active);
CREATE INDEX IF NOT EXISTS ix_bn_dfr_flags   ON public.bn_data_field_registry(is_date, is_amount, is_code);

-- updated_at triggers (reuse the standard helper if it exists)
CREATE OR REPLACE FUNCTION public.bn_data_registry_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bn_dsr_touch ON public.bn_data_source_registry;
CREATE TRIGGER trg_bn_dsr_touch BEFORE UPDATE ON public.bn_data_source_registry
  FOR EACH ROW EXECUTE FUNCTION public.bn_data_registry_touch_updated_at();

DROP TRIGGER IF EXISTS trg_bn_dfr_touch ON public.bn_data_field_registry;
CREATE TRIGGER trg_bn_dfr_touch BEFORE UPDATE ON public.bn_data_field_registry
  FOR EACH ROW EXECUTE FUNCTION public.bn_data_registry_touch_updated_at();

-- ============================================================
-- SEED — known data sources currently used by resolvers
-- ============================================================
INSERT INTO public.bn_data_source_registry (source_system, table_name, display_name, description, seed_tag) VALUES
  ('BEMA','ip_master',                       'Insured Person Master',                'Core IP demographic + identity record',                           'SEED-'),
  ('BEMA','ip_wages',                        'IP Weekly Wages',                      'Monthly row carrying weekly wages_paid1..7 and paid_code1..7',    'SEED-'),
  ('BEMA','er_master',                       'Employer Master',                      'Employer registration and status',                                'SEED-'),
  ('BN',  'bn_claim',                        'Claim Header',                         'BN claim master record',                                          'SEED-'),
  ('BN',  'bn_claim_document',               'Claim Document',                       'Documents attached to a claim',                                   'SEED-'),
  ('BN',  'bn_claim_contribution_snapshot',  'Claim Contribution Snapshot',          'Per-claim derived contribution aggregations (JSON windows)',      'SEED-'),
  ('BN',  'bn_award',                        'Award',                                'Long-term benefit award record',                                  'SEED-'),
  ('BN',  'bn_award_beneficiary',            'Award Beneficiary',                    'Beneficiaries linked to an award',                                'SEED-'),
  ('BN',  'bn_medical_recommendation',       'Medical Recommendation',               'Medical board recommendations',                                   'SEED-')
ON CONFLICT (table_name) DO NOTHING;

-- ============================================================
-- SEED — fields for those tables (only the ones resolvers care about)
-- ============================================================

-- ip_master
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('ip_master','ssn',          'SSN',                'varchar', false,false,true,  'SEED-'),
  ('ip_master','dob',          'Date of Birth',      'date',    true, false,false, 'SEED-'),
  ('ip_master','gender',       'Gender',             'varchar', false,false,true,  'SEED-'),
  ('ip_master','status',       'Status',             'varchar', false,false,true,  'SEED-'),
  ('ip_master','date_of_death','Date of Death',      'date',    true, false,false, 'SEED-'),
  ('ip_master','first_name',   'First Name',         'varchar', false,false,false, 'SEED-'),
  ('ip_master','last_name',    'Last Name',          'varchar', false,false,false, 'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- ip_wages (weekly wages + paid codes)
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('ip_wages','ssn',          'SSN',                  'varchar', false,false,true,  'SEED-'),
  ('ip_wages','period',       'Wage Period (YYYYMM)', 'varchar', true, false,false, 'SEED-'),
  ('ip_wages','employer_regno','Employer Reg No',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','wages_paid1',  'Wages Week 1',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','wages_paid2',  'Wages Week 2',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','wages_paid3',  'Wages Week 3',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','wages_paid4',  'Wages Week 4',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','wages_paid5',  'Wages Week 5',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','wages_paid6',  'Wages Week 6',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','wages_paid7',  'Wages Week 7',         'numeric', false,true, false, 'SEED-'),
  ('ip_wages','paid_code1',   'Paid Code Week 1',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','paid_code2',   'Paid Code Week 2',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','paid_code3',   'Paid Code Week 3',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','paid_code4',   'Paid Code Week 4',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','paid_code5',   'Paid Code Week 5',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','paid_code6',   'Paid Code Week 6',     'varchar', false,false,true,  'SEED-'),
  ('ip_wages','paid_code7',   'Paid Code Week 7',     'varchar', false,false,true,  'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- er_master
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('er_master','employer_regno','Employer Reg No',   'varchar', false,false,true,  'SEED-'),
  ('er_master','status',        'Employer Status',   'varchar', false,false,true,  'SEED-'),
  ('er_master','date_commence', 'Date Commenced',    'date',    true, false,false, 'SEED-'),
  ('er_master','date_ceased',   'Date Ceased',       'date',    true, false,false, 'SEED-'),
  ('er_master','trade_name',    'Trade Name',        'varchar', false,false,false, 'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- bn_claim
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('bn_claim','id',                  'Claim ID',          'uuid',    false,false,false,'SEED-'),
  ('bn_claim','ssn',                 'SSN',               'varchar', false,false,true, 'SEED-'),
  ('bn_claim','claim_date',          'Claim Date',        'date',    true, false,false,'SEED-'),
  ('bn_claim','submission_date',     'Submission Date',   'timestamptz', true,false,false,'SEED-'),
  ('bn_claim','product_id',          'Product',           'uuid',    false,false,true, 'SEED-'),
  ('bn_claim','product_version_id',  'Product Version',   'uuid',    false,false,true, 'SEED-'),
  ('bn_claim','employer_regno',      'Employer Reg No',   'varchar', false,false,true, 'SEED-'),
  ('bn_claim','status',              'Claim Status',      'varchar', false,false,true, 'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- bn_claim_document
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('bn_claim_document','id',          'Document ID',     'uuid',    false,false,false,'SEED-'),
  ('bn_claim_document','claim_id',    'Claim',           'uuid',    false,false,true, 'SEED-'),
  ('bn_claim_document','doc_type',    'Document Type',   'varchar', false,false,true, 'SEED-'),
  ('bn_claim_document','status',      'Status',          'varchar', false,false,true, 'SEED-'),
  ('bn_claim_document','uploaded_at', 'Uploaded At',     'timestamptz', true,false,false,'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- bn_claim_contribution_snapshot
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('bn_claim_contribution_snapshot','id',                'Snapshot ID',         'uuid',     false,false,false,'SEED-'),
  ('bn_claim_contribution_snapshot','claim_id',          'Claim',               'uuid',     false,false,true, 'SEED-'),
  ('bn_claim_contribution_snapshot','ssn',               'SSN',                 'varchar',  false,false,true, 'SEED-'),
  ('bn_claim_contribution_snapshot','anchor_date',       'Anchor Date',         'date',     true, false,false,'SEED-'),
  ('bn_claim_contribution_snapshot','contribution_json', 'Contribution JSON',   'jsonb',    false,false,false,'SEED-'),
  ('bn_claim_contribution_snapshot','total_weeks',       'Total Paid Weeks',    'integer',  false,true, false,'SEED-'),
  ('bn_claim_contribution_snapshot','last_refreshed_at', 'Last Refreshed At',   'timestamptz', true,false,false,'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- bn_award
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('bn_award','id',          'Award ID',     'uuid',    false,false,false,'SEED-'),
  ('bn_award','ssn',         'SSN',          'varchar', false,false,true, 'SEED-'),
  ('bn_award','product_id',  'Product',      'uuid',    false,false,true, 'SEED-'),
  ('bn_award','status',      'Status',       'varchar', false,false,true, 'SEED-'),
  ('bn_award','start_date',  'Start Date',   'date',    true, false,false,'SEED-'),
  ('bn_award','end_date',    'End Date',     'date',    true, false,false,'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- bn_award_beneficiary
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('bn_award_beneficiary','id',                  'Beneficiary ID',     'uuid',    false,false,false,'SEED-'),
  ('bn_award_beneficiary','award_id',            'Award',              'uuid',    false,false,true, 'SEED-'),
  ('bn_award_beneficiary','relation_code',       'Relation',           'varchar', false,false,true, 'SEED-'),
  ('bn_award_beneficiary','status',              'Status',             'varchar', false,false,true, 'SEED-'),
  ('bn_award_beneficiary','effective_from',      'Effective From',     'date',    true, false,false,'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;

-- bn_medical_recommendation
INSERT INTO public.bn_data_field_registry (table_name, column_name, display_name, data_type, is_date, is_amount, is_code, seed_tag) VALUES
  ('bn_medical_recommendation','id',              'Recommendation ID',  'uuid',    false,false,false,'SEED-'),
  ('bn_medical_recommendation','claim_id',        'Claim',              'uuid',    false,false,true, 'SEED-'),
  ('bn_medical_recommendation','status',          'Status',             'varchar', false,false,true, 'SEED-'),
  ('bn_medical_recommendation','recommended_date','Recommended Date',   'date',    true, false,false,'SEED-')
ON CONFLICT (table_name, column_name) DO NOTHING;
