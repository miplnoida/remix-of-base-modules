-- Epic OM-5: register canonical document-template tables in the table registry.
INSERT INTO public.core_table_registry
  (table_name, modern_alias, ownership_type, module_code, domain_code, table_category,
   is_legacy_table, data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('core_template',          'DocumentTemplate',        'PLATFORM','CORE','COMMUNICATION','MASTER',      false,'INTERNAL','ACTIVE','/admin/template-management/library/templates'),
  ('core_template_version',  'DocumentTemplateVersion', 'PLATFORM','CORE','COMMUNICATION','TRANSACTION', false,'INTERNAL','ACTIVE','/admin/template-management/library/templates'),
  ('core_template_layout',   'DocumentTemplateLayout',  'PLATFORM','CORE','COMMUNICATION','MASTER',      false,'INTERNAL','ACTIVE','/admin/template-management/library/templates'),
  ('core_template_category', 'DocumentTemplateCategory','PLATFORM','CORE','COMMUNICATION','REFERENCE',   false,'INTERNAL','ACTIVE','/admin/template-management/library/templates')
ON CONFLICT (table_name) DO UPDATE SET
  modern_alias = EXCLUDED.modern_alias,
  ownership_type = EXCLUDED.ownership_type,
  module_code = EXCLUDED.module_code,
  domain_code = EXCLUDED.domain_code,
  table_category = EXCLUDED.table_category,
  is_legacy_table = EXCLUDED.is_legacy_table,
  data_classification = EXCLUDED.data_classification,
  lifecycle_status = EXCLUDED.lifecycle_status,
  canonical_admin_route = EXCLUDED.canonical_admin_route,
  updated_at = now();

INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, domain_code, event_category,
   default_severity, default_risk_level,
   is_admin_event, is_security_event, is_migration_event,
   is_pii_event, is_financial_event, requires_before_after)
VALUES
  ('DOCUMENT_TEMPLATE_CREATED',                     'Document Template Created',                     'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,true),
  ('DOCUMENT_TEMPLATE_UPDATED',                     'Document Template Updated',                     'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,true),
  ('DOCUMENT_TEMPLATE_DEACTIVATED',                 'Document Template Deactivated',                 'CORE','COMMUNICATION','CONFIGURATION','WARNING','MEDIUM',true,false,false,false,false,false),
  ('DOCUMENT_TEMPLATE_REACTIVATED',                 'Document Template Reactivated',                 'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false),
  ('DOCUMENT_TEMPLATE_PUBLISHED',                   'Document Template Published',                   'CORE','COMMUNICATION','CONFIGURATION','INFO','HIGH',   true,false,false,false,false,true),
  ('DOCUMENT_TEMPLATE_UNPUBLISHED',                 'Document Template Unpublished',                 'CORE','COMMUNICATION','CONFIGURATION','WARNING','HIGH',true,false,false,false,false,true),
  ('DOCUMENT_TEMPLATE_CLONED',                      'Document Template Cloned',                      'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false),
  ('DOCUMENT_TEMPLATE_LETTERHEAD_LINKED',           'Document Template Letterhead Linked',           'CORE','COMMUNICATION','CONFIGURATION','INFO','MEDIUM', true,false,false,false,false,true),
  ('DOCUMENT_TEMPLATE_TOKEN_VALIDATED',             'Document Template Token Validated',             'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false),
  ('DOCUMENT_TEMPLATE_PREVIEWED',                   'Document Template Previewed',                   'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false),
  ('DOCUMENT_TEMPLATE_COMPATIBILITY_LOADED',        'Document Template Compatibility Loaded',        'CORE','COMMUNICATION','CONFIGURATION','INFO','LOW',    true,false,false,false,false,false),
  ('LEGACY_LETTERHEAD_TEMPLATE_COMPATIBILITY_MARKED','Legacy Letterhead Template Compatibility Marked','CORE','COMMUNICATION','CONFIGURATION','INFO','MEDIUM', true,false,true, false,false,false),
  ('DOCUMENT_TEMPLATE_COMPATIBILITY_COPIED',        'Document Template Compatibility Copied',        'CORE','COMMUNICATION','CONFIGURATION','INFO','MEDIUM', true,false,true, false,false,true),
  ('TEMPLATE_MODEL_SEPARATION_VERIFIED',            'OM-5 Template Model Separation Verified',       'CORE','COMMUNICATION','CONFIGURATION','INFO','MEDIUM', true,false,false,false,false,false)
ON CONFLICT (event_code) DO UPDATE
SET event_name = EXCLUDED.event_name,
    is_active = true;

INSERT INTO public.core_reference_group
  (group_code, group_name, module_code, group_category, description,
   is_system, is_system_group, is_active, ownership_module_code, is_platform_owned, lifecycle_status)
VALUES
  ('DOCUMENT_TEMPLATE_TYPE',                 'Document Template Type',                 'CORE','TEMPLATE','Canonical types for document templates (LETTER, NOTICE, EMAIL, SMS, PDF, FORM…).', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_CATEGORY',             'Document Template Category',             'CORE','TEMPLATE','Business category grouping for document templates.', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_STATUS',               'Document Template Status',               'CORE','TEMPLATE','Lifecycle statuses (DRAFT, ACTIVE, PUBLISHED, ARCHIVED, DEPRECATED, COMPATIBILITY).', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_RECIPIENT_TYPE',       'Document Template Recipient Type',       'CORE','TEMPLATE','Recipient types (EMPLOYER, INSURED, DEPENDANT, INTERNAL, EXTERNAL…).', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_OUTPUT_CHANNEL',       'Document Template Output Channel',       'CORE','TEMPLATE','Output channels (EMAIL, SMS, PRINT_LETTER, PDF, PORTAL_MSG, WHATSAPP).', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_LANGUAGE',             'Document Template Language',             'CORE','TEMPLATE','Language codes supported by document templates.', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_BUSINESS_EVENT',       'Document Template Business Event',       'CORE','TEMPLATE','Business event codes that trigger document templates.', true, true, true, 'CORE', true, 'ACTIVE'),
  ('DOCUMENT_TEMPLATE_COMPATIBILITY_STATUS', 'Document Template Compatibility Status', 'CORE','TEMPLATE','Compatibility state of legacy template rows still stored in comm_letterhead.', true, true, true, 'CORE', true, 'ACTIVE')
ON CONFLICT (group_code) DO UPDATE
SET group_name = EXCLUDED.group_name,
    description = EXCLUDED.description,
    is_active = true,
    lifecycle_status = 'ACTIVE',
    updated_at = now();
