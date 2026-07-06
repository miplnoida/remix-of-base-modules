
-- =====================================================================
-- Enterprise Consumption Registry (additive, no legacy table impact)
-- Per project rule: role-based security only, RLS not enabled.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.enterprise_consumption_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_key TEXT NOT NULL UNIQUE,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'ENTERPRISE_MASTER','SHARED_DOMAIN_ENTITY','POLICY','PROCESS',
    'BUSINESS_MODULE_ENTITY','LEGACY_ENTITY','EXTERNAL_ENTITY'
  )),
  owner_layer TEXT NOT NULL CHECK (owner_layer IN (
    'REFERENCE_FRAMEWORK','ENTERPRISE_MASTER','SHARED_DOMAIN',
    'POLICY','PROCESS','BUSINESS_MODULE','LEGACY','EXTERNAL'
  )),
  owner_domain TEXT,
  canonical_route TEXT,
  canonical_table TEXT,
  canonical_service TEXT,
  canonical_key_column TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'ACTIVE','ADAPTER','LEGACY_READONLY','DEPRECATED','PLANNED'
  )),
  duplicate_risk TEXT NOT NULL DEFAULT 'LOW' CHECK (duplicate_risk IN ('LOW','MEDIUM','HIGH')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_consumption_registry TO authenticated;
GRANT ALL ON public.enterprise_consumption_registry TO service_role;

CREATE TABLE IF NOT EXISTS public.enterprise_consumption_edge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_key TEXT NOT NULL,
  target_entity_key TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN (
    'CONSUMES','OWNS','MAPS_TO','ADAPTS_TO','VALIDATES','BLOCKS','PRODUCES'
  )),
  consumer_domain TEXT,
  consumer_route TEXT,
  consumer_service TEXT,
  enforcement_level TEXT NOT NULL DEFAULT 'RECOMMENDED' CHECK (enforcement_level IN (
    'REQUIRED','RECOMMENDED','INFORMATIONAL'
  )),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PLANNED','LEGACY')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_entity_key, target_entity_key, relationship_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_consumption_edge TO authenticated;
GRANT ALL ON public.enterprise_consumption_edge TO service_role;

CREATE TABLE IF NOT EXISTS public.enterprise_consumption_violation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_key TEXT NOT NULL UNIQUE,
  entity_key TEXT,
  detected_in TEXT,
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'DUPLICATE_OWNER','DIRECT_TABLE_READ','HARDCODED_REFERENCE',
    'LEGACY_BYPASS','UNMAPPED_LEGACY','UNKNOWN_OWNER'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('P0','P1','P2')),
  message TEXT NOT NULL,
  recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DEFERRED','RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_consumption_violation TO authenticated;
GRANT ALL ON public.enterprise_consumption_violation TO service_role;

CREATE INDEX IF NOT EXISTS idx_ecr_owner_layer ON public.enterprise_consumption_registry(owner_layer);
CREATE INDEX IF NOT EXISTS idx_ecr_entity_type ON public.enterprise_consumption_registry(entity_type);
CREATE INDEX IF NOT EXISTS idx_ece_target ON public.enterprise_consumption_edge(target_entity_key);
CREATE INDEX IF NOT EXISTS idx_ece_source ON public.enterprise_consumption_edge(source_entity_key);
CREATE INDEX IF NOT EXISTS idx_ecv_status ON public.enterprise_consumption_violation(status);

-- Reuse standard updated_at trigger if present, otherwise create local one.
CREATE OR REPLACE FUNCTION public.ecr_touch_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_ecr_updated_at ON public.enterprise_consumption_registry;
CREATE TRIGGER trg_ecr_updated_at BEFORE UPDATE ON public.enterprise_consumption_registry
FOR EACH ROW EXECUTE FUNCTION public.ecr_touch_updated_at();

DROP TRIGGER IF EXISTS trg_ece_updated_at ON public.enterprise_consumption_edge;
CREATE TRIGGER trg_ece_updated_at BEFORE UPDATE ON public.enterprise_consumption_edge
FOR EACH ROW EXECUTE FUNCTION public.ecr_touch_updated_at();

-- =====================================================================
-- SEED — ownership map
-- =====================================================================

INSERT INTO public.enterprise_consumption_registry
  (entity_key, entity_name, entity_type, owner_layer, owner_domain, canonical_route, canonical_table, canonical_service, canonical_key_column, status, duplicate_risk, notes)
VALUES
  -- Enterprise Masters
  ('em.country','Country','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/countries','ssp_country_profile',NULL,'country_code','ACTIVE','LOW',NULL),
  ('em.district','District','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/districts',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.postal_district','Postal District','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/postal-districts',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.village','Village','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/villages',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.relation','Relation','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/relations',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.dependent_relation','Dependent Relation','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/dependent-relations',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.marital_status','Marital Status','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/marital-status',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.occupation','Occupation','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/occupations',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.industry','Industry','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/industries',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.sector','Sector','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/sectors',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.activity_type','Activity Type','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/activity-types',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.bank_code','Bank Code','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Financial Reference','/admin/financial-reference','ssp_bank',NULL,'bank_code','ACTIVE','HIGH','Canonical bank source; legacy tb_bank_code is adapter.'),
  ('em.method_of_payment','Method of Payment','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Financial Reference','/admin/financial-reference','ssp_payment_channel',NULL,'channel_code','ACTIVE','HIGH','Canonical payment channel source.'),
  ('em.payment_type','Payment Type','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Financial Reference','/admin/financial-reference',NULL,NULL,'code','ACTIVE','MEDIUM',NULL),
  ('em.payment_source','Payment Source','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Financial Reference','/admin/financial-reference',NULL,NULL,'code','ACTIVE','MEDIUM',NULL),
  ('em.merchant','Merchant','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Financial Reference','/admin/financial-reference',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.payer_type','Payer Type','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Financial Reference','/admin/financial-reference',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.income_category','Income Category','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/income-categories',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.income_code','Income Code','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/income-codes',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.pay_period','Pay Period','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/pay-periods',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.ssc_rate','SSC Rate','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/ssc-rates',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.penalty_rate','Penalty Rate','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/penalty-rates',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.verification_type','Verification Type','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/verification-types',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.invoice_status','Invoice Status','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/invoice-status',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.receipt_status','Receipt Status','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/receipt-status',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('em.legal_status','Legal Status','ENTERPRISE_MASTER','ENTERPRISE_MASTER','Master Data','/admin/master-data/legal-status',NULL,NULL,'code','ACTIVE','LOW',NULL),

  -- Shared Domain / Engine
  ('sd.geo_country_profile','Geography Country/Profile','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Geography Domain','/admin/geography','ssp_country_profile',NULL,'country_code','ACTIVE','LOW',NULL),
  ('sd.geo_admin_level','Geography Admin Level','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Geography Domain','/admin/geography','ssp_admin_level',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.geo_area','Geo Area','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Geography Domain','/admin/geography','ssp_geo_area',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.identity_type','Identity Type','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Identity Domain','/admin/identity','ssp_identity_type',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.identity_validation_pattern','Identity Validation Pattern','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Identity Domain','/admin/identity','ssp_identity_validation_pattern',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.fin_currency','Financial Currency Profile','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Financial Reference','/admin/financial-reference','ssp_currency_profile',NULL,'currency_code','ACTIVE','LOW',NULL),
  ('sd.fin_bank','Financial Bank','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Financial Reference','/admin/financial-reference','ssp_bank',NULL,'bank_code','ACTIVE','HIGH',NULL),
  ('sd.fin_bank_branch','Financial Bank Branch','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Financial Reference','/admin/financial-reference','ssp_bank_branch',NULL,'branch_code','ACTIVE','LOW',NULL),
  ('sd.fin_payment_channel','Financial Payment Channel','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Financial Reference','/admin/financial-reference','ssp_payment_channel',NULL,'channel_code','ACTIVE','HIGH',NULL),
  ('sd.fin_settlement_method','Financial Settlement Method','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Financial Reference','/admin/financial-reference','ssp_settlement_method',NULL,'method_code','ACTIVE','LOW',NULL),
  ('sd.fin_account_type','Financial Account Type','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Financial Reference','/admin/financial-reference','ssp_account_type',NULL,'account_code','ACTIVE','LOW',NULL),
  ('sd.legal_reference','Legal Reference','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Legal Reference','/admin/legal-reference','core_legal_reference',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.document_type','Document Type','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Documents','/admin/core-dms','core_dms_document_type',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.document_profile','Document Profile','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Documents','/admin/core-dms','core_document_profile',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.communication_channel','Communication Channel','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Communication Domain','/admin/communication-domain','ssp_communication_channel',NULL,'code','ACTIVE','MEDIUM','Communication-only; payment channels must NOT be sourced here.'),
  ('sd.notification_template','Notification Template','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Communication Domain','/admin/notification-templates','core_template',NULL,'code','ACTIVE','LOW',NULL),
  ('sd.workflow_definition','Workflow Definition','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Workflow Engine','/admin/workflows','workflow_definitions',NULL,'id','ACTIVE','LOW',NULL),
  ('sd.number_sequence','Number Sequence','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Numbering','/admin/numbering','core_number_sequence',NULL,'module_code','ACTIVE','LOW',NULL),
  ('sd.participant_role','Participant Role','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Participant Domain','/admin/participant',NULL,NULL,'code','ACTIVE','LOW',NULL),
  ('sd.relationship_type','Relationship Type','SHARED_DOMAIN_ENTITY','SHARED_DOMAIN','Participant Domain','/admin/participant',NULL,NULL,'code','ACTIVE','LOW',NULL),

  -- SSB Policies
  ('policy.address','Address Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=address','ssb_address_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.identity','Identity Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=identity','ssb_identity_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.numbering','Numbering Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=numbering','ssb_numbering_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.contribution_calendar','Contribution Calendar Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=contribution-calendar','ssb_contribution_calendar_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.financial','Financial Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=financial','ssb_financial_policy',NULL,NULL,'ACTIVE','MEDIUM',NULL),
  ('policy.legal','Legal Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=legal','ssb_legal_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.document','Document Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=document','ssb_document_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.communication','Communication Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=communication','ssb_communication_policy',NULL,NULL,'ACTIVE','LOW',NULL),
  ('policy.workflow','Workflow Policy','POLICY','POLICY','SSB Setup','/admin/ssb-setup?section=workflow','ssb_workflow_policy',NULL,NULL,'ACTIVE','LOW',NULL),

  -- Business Processes
  ('process.member_registration','Member Registration','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getMemberRegistrationConfiguration',NULL,'ACTIVE','LOW',NULL),
  ('process.employer_registration','Employer Registration','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getEmployerRegistrationConfiguration',NULL,'ACTIVE','LOW',NULL),
  ('process.contribution_collection','Contribution Collection','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getContributionCollectionConfiguration',NULL,'ACTIVE','LOW',NULL),
  ('process.benefit_administration','Benefit Administration','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getBenefitAdministrationConfiguration',NULL,'ACTIVE','LOW',NULL),
  ('process.claims_processing','Claims Processing','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getClaimsProcessingConfiguration',NULL,'ACTIVE','LOW',NULL),
  ('process.payments','Payments','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getPaymentsConfiguration',NULL,'ACTIVE','LOW',NULL),
  ('process.compliance_case','Compliance Case Management','PROCESS','PROCESS','Business Processes',NULL,NULL,'ssbBusinessProcessConfigService.getComplianceCaseConfiguration',NULL,'ACTIVE','LOW',NULL),

  -- Business Module Entities (BN Product Builder scope)
  ('bn.product_builder','BN Product Builder','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder','/bn/product-builder',NULL,NULL,NULL,'ACTIVE','LOW',NULL),
  ('bn.benefit_type','Benefit Type','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder',NULL,'bn_scheme',NULL,NULL,'ACTIVE','LOW',NULL),
  ('bn.benefit_product','Benefit Product','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder',NULL,'bn_product',NULL,'id','ACTIVE','LOW',NULL),
  ('bn.eligibility_rule','Eligibility Rule','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder',NULL,'bn_eligibility_rule',NULL,'id','ACTIVE','LOW',NULL),
  ('bn.formula_rule','Formula Rule','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder',NULL,'bn_formula_template',NULL,'id','ACTIVE','LOW',NULL),
  ('bn.rate_table','Rate Table','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder',NULL,'bn_rate_table',NULL,'id','ACTIVE','LOW',NULL),
  ('bn.product_version','Product Version','BUSINESS_MODULE_ENTITY','BUSINESS_MODULE','BN Product Builder',NULL,'bn_product_version',NULL,'id','ACTIVE','LOW',NULL),

  -- Legacy / Adapter
  ('legacy.tb_bank_code','tb_bank_code (legacy)','LEGACY_ENTITY','LEGACY','Legacy Master Data','/admin/master-data/bank-codes','tb_bank_code',NULL,'bank_code','ADAPTER','HIGH','Adapter to ssp_bank via finance_master_crosswalk.'),
  ('legacy.tb_method_of_payment','tb_method_of_payment (legacy)','LEGACY_ENTITY','LEGACY','Legacy Master Data','/admin/master-data/methods-of-payment','tb_method_of_payment',NULL,'code','ADAPTER','HIGH','Adapter to ssp_payment_channel via finance_master_crosswalk.'),
  ('legacy.bank_code','Legacy bank_code','LEGACY_ENTITY','LEGACY','Legacy Master Data',NULL,'bank_code',NULL,'bank_code','LEGACY_READONLY','MEDIUM',NULL),
  ('legacy.method_of_payment','Legacy method_of_payment','LEGACY_ENTITY','LEGACY','Legacy Master Data',NULL,'method_of_payment',NULL,'code','LEGACY_READONLY','MEDIUM',NULL)
ON CONFLICT (entity_key) DO NOTHING;

-- Edges — consumption relationships
INSERT INTO public.enterprise_consumption_edge
  (source_entity_key, target_entity_key, relationship_type, consumer_domain, consumer_route, consumer_service, enforcement_level, status, notes)
VALUES
  -- Policies consume shared domain
  ('policy.financial','sd.fin_currency','CONSUMES','SSB Setup','/admin/ssb-setup?section=financial',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.financial','sd.fin_bank','CONSUMES','SSB Setup','/admin/ssb-setup?section=financial',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.financial','sd.fin_bank_branch','CONSUMES','SSB Setup','/admin/ssb-setup?section=financial',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.financial','sd.fin_payment_channel','CONSUMES','SSB Setup','/admin/ssb-setup?section=financial',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.financial','sd.fin_settlement_method','CONSUMES','SSB Setup','/admin/ssb-setup?section=financial',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.financial','sd.fin_account_type','CONSUMES','SSB Setup','/admin/ssb-setup?section=financial',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.workflow','sd.workflow_definition','CONSUMES','SSB Setup','/admin/ssb-setup?section=workflow',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.numbering','sd.number_sequence','CONSUMES','SSB Setup','/admin/ssb-setup?section=numbering',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.communication','sd.notification_template','CONSUMES','SSB Setup','/admin/ssb-setup?section=communication',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.communication','sd.communication_channel','CONSUMES','SSB Setup','/admin/ssb-setup?section=communication',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.legal','sd.legal_reference','CONSUMES','SSB Setup','/admin/ssb-setup?section=legal',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.document','sd.document_type','CONSUMES','SSB Setup','/admin/ssb-setup?section=document',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.document','sd.document_profile','CONSUMES','SSB Setup','/admin/ssb-setup?section=document',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.identity','sd.identity_type','CONSUMES','SSB Setup','/admin/ssb-setup?section=identity',NULL,'REQUIRED','ACTIVE',NULL),
  ('policy.address','sd.geo_admin_level','CONSUMES','SSB Setup','/admin/ssb-setup?section=address',NULL,'REQUIRED','ACTIVE',NULL),

  -- Processes consume policies
  ('process.benefit_administration','policy.financial','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.benefit_administration','policy.workflow','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.benefit_administration','policy.numbering','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.benefit_administration','policy.communication','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.benefit_administration','policy.document','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.member_registration','policy.identity','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.member_registration','policy.address','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.member_registration','policy.numbering','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.employer_registration','policy.identity','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.employer_registration','policy.numbering','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.contribution_collection','policy.contribution_calendar','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),
  ('process.payments','policy.financial','CONSUMES','Business Processes',NULL,'ssbBusinessProcessConfigService','REQUIRED','ACTIVE',NULL),

  -- BN Product Builder consumes processes (not policies directly)
  ('bn.product_builder','process.benefit_administration','CONSUMES','BN Product Builder','/bn/product-builder','ssbBusinessProcessConfigService.getBenefitAdministrationConfiguration','REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','process.payments','CONSUMES','BN Product Builder','/bn/product-builder','ssbBusinessProcessConfigService.getPaymentsConfiguration','REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','process.claims_processing','CONSUMES','BN Product Builder','/bn/product-builder','ssbBusinessProcessConfigService.getClaimsProcessingConfiguration','REQUIRED','ACTIVE',NULL),

  -- BN owns its own module entities
  ('bn.product_builder','bn.benefit_type','OWNS','BN Product Builder',NULL,NULL,'REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','bn.benefit_product','OWNS','BN Product Builder',NULL,NULL,'REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','bn.eligibility_rule','OWNS','BN Product Builder',NULL,NULL,'REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','bn.formula_rule','OWNS','BN Product Builder',NULL,NULL,'REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','bn.rate_table','OWNS','BN Product Builder',NULL,NULL,'REQUIRED','ACTIVE',NULL),
  ('bn.product_builder','bn.product_version','OWNS','BN Product Builder',NULL,NULL,'REQUIRED','ACTIVE',NULL),

  -- Legacy adapts to canonical
  ('legacy.tb_bank_code','em.bank_code','ADAPTS_TO','Legacy Master Data','/admin/master-data/bank-codes','finance_master_crosswalk','REQUIRED','LEGACY','Mapped via finance_master_crosswalk.'),
  ('legacy.tb_method_of_payment','em.method_of_payment','ADAPTS_TO','Legacy Master Data','/admin/master-data/methods-of-payment','finance_master_crosswalk','REQUIRED','LEGACY','Mapped via finance_master_crosswalk.'),
  ('legacy.bank_code','em.bank_code','MAPS_TO','Legacy Master Data',NULL,'finance_master_crosswalk','RECOMMENDED','LEGACY',NULL),
  ('legacy.method_of_payment','em.method_of_payment','MAPS_TO','Legacy Master Data',NULL,'finance_master_crosswalk','RECOMMENDED','LEGACY',NULL)
ON CONFLICT (source_entity_key, target_entity_key, relationship_type) DO NOTHING;
