
WITH new_groups(group_code, group_name, description, group_category) AS (VALUES
  ('COMM_TEMPLATE_TYPE','Communication Template Type','Kind of template','COMMUNICATION'),
  ('COMM_TEMPLATE_STATUS','Communication Template Status','Lifecycle status','COMMUNICATION'),
  ('COMM_TEMPLATE_CATEGORY','Communication Template Category','Business category','COMMUNICATION'),
  ('COMM_BUSINESS_EVENT','Communication Business Event','Business events','COMMUNICATION'),
  ('COMM_RECIPIENT_TYPE','Communication Recipient Type','Recipient type','COMMUNICATION'),
  ('COMM_OUTPUT_CHANNEL','Communication Output Channel','Delivery channels','COMMUNICATION'),
  ('COMM_LANGUAGE','Communication Language','Supported languages','COMMUNICATION'),
  ('COMM_TOKEN_CATEGORY','Communication Token Category','Token grouping','COMMUNICATION'),
  ('COMM_TEMPLATE_HEALTH_STATUS','Template Health Status','Health severities','COMMUNICATION'),
  ('COMM_TEMPLATE_APPROVAL_POLICY','Template Approval Policy','Approval requirement','COMMUNICATION'),
  ('COMM_TEMPLATE_RENDER_CONTEXT','Template Render Context','Render context','COMMUNICATION'),
  ('COMM_MESSAGE_PRIORITY','Message Priority','Message priority','COMMUNICATION'),
  ('COMM_DELIVERY_PURPOSE','Delivery Purpose','Delivery purpose','COMMUNICATION'),
  ('COMM_RENDER_WARNING_TYPE','Render Warning Type','Warning types','COMMUNICATION'),
  ('COMM_TEMPLATE_ASSIGNMENT_SCOPE','Template Assignment Scope','Assignment scopes','COMMUNICATION'))
INSERT INTO public.core_reference_group (group_code, group_name, description, group_category, module_code, is_system, is_system_group, is_platform_owned, is_active, lifecycle_status, sort_order)
SELECT ng.group_code, ng.group_name, ng.description, ng.group_category, 'CORE', TRUE, TRUE, TRUE, TRUE, 'ACTIVE', 100
FROM new_groups ng
WHERE NOT EXISTS (SELECT 1 FROM public.core_reference_group g WHERE g.group_code = ng.group_code);

WITH v(group_code, value_code, value_label, sort_order) AS (VALUES
  ('COMM_TEMPLATE_TYPE','DOCUMENT','Document',10),('COMM_TEMPLATE_TYPE','EMAIL','Email',20),
  ('COMM_TEMPLATE_TYPE','SMS','SMS',30),('COMM_TEMPLATE_TYPE','IN_APP','In-App',40),
  ('COMM_TEMPLATE_TYPE','PORTAL_MESSAGE','Portal Message',50),
  ('COMM_TEMPLATE_TYPE','WORKFLOW_NOTIFICATION','Workflow Notification',60),
  ('COMM_TEMPLATE_TYPE','REPORT_COVER','Report Cover',70),
  ('COMM_TEMPLATE_TYPE','CERTIFICATE','Certificate',80),
  ('COMM_TEMPLATE_TYPE','RECEIPT','Receipt',90),
  ('COMM_TEMPLATE_TYPE','STATEMENT','Statement',100),
  ('COMM_TEMPLATE_TYPE','LEGAL_NOTICE','Legal Notice',110),
  ('COMM_TEMPLATE_STATUS','DRAFT','Draft',10),('COMM_TEMPLATE_STATUS','ACTIVE','Active',20),
  ('COMM_TEMPLATE_STATUS','PUBLISHED','Published',30),('COMM_TEMPLATE_STATUS','ARCHIVED','Archived',40),
  ('COMM_TEMPLATE_STATUS','DEPRECATED','Deprecated',50),('COMM_TEMPLATE_STATUS','COMPATIBILITY','Compatibility',60),
  ('COMM_TEMPLATE_CATEGORY','GENERAL_LETTER','General Letter',10),
  ('COMM_TEMPLATE_CATEGORY','COMPLIANCE_NOTICE','Compliance Notice',20),
  ('COMM_TEMPLATE_CATEGORY','LEGAL_NOTICE','Legal Notice',30),
  ('COMM_TEMPLATE_CATEGORY','PAYMENT_RECEIPT','Payment Receipt',40),
  ('COMM_TEMPLATE_CATEGORY','TRANSACTIONAL_EMAIL','Transactional Email',50),
  ('COMM_TEMPLATE_CATEGORY','TRANSACTIONAL_SMS','Transactional SMS',60),
  ('COMM_TEMPLATE_CATEGORY','IN_APP_MESSAGE','In-App Message',70),
  ('COMM_RECIPIENT_TYPE','EMPLOYER','Employer',10),('COMM_RECIPIENT_TYPE','INSURED_PERSON','Insured Person',20),
  ('COMM_RECIPIENT_TYPE','CLAIMANT','Claimant',30),('COMM_RECIPIENT_TYPE','BENEFICIARY','Beneficiary',40),
  ('COMM_RECIPIENT_TYPE','DEPENDANT','Dependant',50),('COMM_RECIPIENT_TYPE','STAFF','Staff',60),
  ('COMM_RECIPIENT_TYPE','APPROVER','Approver',70),('COMM_RECIPIENT_TYPE','INSPECTOR','Inspector',80),
  ('COMM_RECIPIENT_TYPE','LEGAL_OFFICER','Legal Officer',90),('COMM_RECIPIENT_TYPE','FINANCE_OFFICER','Finance Officer',100),
  ('COMM_RECIPIENT_TYPE','ADMIN_USER','Admin User',110),('COMM_RECIPIENT_TYPE','PUBLIC_USER','Public User',120),
  ('COMM_RECIPIENT_TYPE','SYSTEM_USER','System User',130),
  ('COMM_OUTPUT_CHANNEL','DOCUMENT','Document',10),('COMM_OUTPUT_CHANNEL','EMAIL','Email',20),
  ('COMM_OUTPUT_CHANNEL','SMS','SMS',30),('COMM_OUTPUT_CHANNEL','IN_APP','In-App',40),
  ('COMM_OUTPUT_CHANNEL','PORTAL','Portal',50),('COMM_OUTPUT_CHANNEL','PDF','PDF',60),
  ('COMM_OUTPUT_CHANNEL','PRINT','Print',70),
  ('COMM_LANGUAGE','en','English',10),
  ('COMM_TOKEN_CATEGORY','ORGANIZATION','Organization',10),('COMM_TOKEN_CATEGORY','DEPARTMENT','Department',20),
  ('COMM_TOKEN_CATEGORY','OFFICE','Office',30),('COMM_TOKEN_CATEGORY','RECIPIENT','Recipient',40),
  ('COMM_TOKEN_CATEGORY','EMPLOYER','Employer',50),('COMM_TOKEN_CATEGORY','INSURED_PERSON','Insured Person',60),
  ('COMM_TOKEN_CATEGORY','CONTRIBUTION','Contribution',70),('COMM_TOKEN_CATEGORY','BENEFIT','Benefit',80),
  ('COMM_TOKEN_CATEGORY','PAYMENT','Payment',90),('COMM_TOKEN_CATEGORY','CASE_LEGAL','Case/Legal',100),
  ('COMM_TOKEN_CATEGORY','WORKFLOW','Workflow',110),('COMM_TOKEN_CATEGORY','SYSTEM','System',120),
  ('COMM_TEMPLATE_HEALTH_STATUS','OK','OK',10),('COMM_TEMPLATE_HEALTH_STATUS','INFO','Info',20),
  ('COMM_TEMPLATE_HEALTH_STATUS','WARNING','Warning',30),('COMM_TEMPLATE_HEALTH_STATUS','BLOCKER','Blocker',40),
  ('COMM_TEMPLATE_APPROVAL_POLICY','NONE','None',10),('COMM_TEMPLATE_APPROVAL_POLICY','ADMIN_APPROVAL','Admin Approval',20),
  ('COMM_TEMPLATE_APPROVAL_POLICY','LEGAL_APPROVAL','Legal Approval',30),
  ('COMM_TEMPLATE_RENDER_CONTEXT','BUSINESS_EVENT','Business Event',10),
  ('COMM_TEMPLATE_RENDER_CONTEXT','WORKFLOW','Workflow',20),
  ('COMM_TEMPLATE_RENDER_CONTEXT','ADMIN_PREVIEW','Admin Preview',30),
  ('COMM_MESSAGE_PRIORITY','LOW','Low',10),('COMM_MESSAGE_PRIORITY','NORMAL','Normal',20),
  ('COMM_MESSAGE_PRIORITY','HIGH','High',30),('COMM_MESSAGE_PRIORITY','URGENT','Urgent',40),
  ('COMM_DELIVERY_PURPOSE','NOTIFICATION','Notification',10),('COMM_DELIVERY_PURPOSE','LEGAL_NOTICE','Legal Notice',20),
  ('COMM_DELIVERY_PURPOSE','MARKETING','Marketing',30),('COMM_DELIVERY_PURPOSE','TRANSACTIONAL','Transactional',40),
  ('COMM_RENDER_WARNING_TYPE','UNKNOWN_TOKEN','Unknown Token',10),
  ('COMM_RENDER_WARNING_TYPE','MISSING_LETTERHEAD','Missing Letterhead',20),
  ('COMM_RENDER_WARNING_TYPE','MISSING_SIGNATURE','Missing Signature',30),
  ('COMM_RENDER_WARNING_TYPE','MISSING_DISCLAIMER','Missing Disclaimer',40),
  ('COMM_RENDER_WARNING_TYPE','UNAPPROVED_ASSET','Unapproved Asset',50),
  ('COMM_TEMPLATE_ASSIGNMENT_SCOPE','ORG','Organization',10),
  ('COMM_TEMPLATE_ASSIGNMENT_SCOPE','MODULE','Module',20),
  ('COMM_TEMPLATE_ASSIGNMENT_SCOPE','DEPARTMENT','Department',30),
  ('COMM_TEMPLATE_ASSIGNMENT_SCOPE','LOCATION','Location',40),
  ('COMM_TEMPLATE_ASSIGNMENT_SCOPE','USER','User',50))
INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active)
SELECT g.id, v.value_code, v.value_label, v.sort_order, TRUE, TRUE
FROM v JOIN public.core_reference_group g ON g.group_code = v.group_code
WHERE NOT EXISTS (SELECT 1 FROM public.core_reference_value rv WHERE rv.group_id = g.id AND rv.value_code = v.value_code);

INSERT INTO public.core_audit_event_type (event_code, event_name, description, module_code, domain_code, event_category, default_severity, is_admin_event, is_active)
SELECT x.event_code, x.event_name, x.description, 'CORE', 'COMMUNICATION', 'GOVERNANCE', 'INFO', TRUE, TRUE
FROM (VALUES
  ('COMM_TEMPLATE_SEED_CATALOGUE_CREATED','Template seed catalogue created','OM-9.7.6 seed catalogue applied'),
  ('COMM_TEMPLATE_VERSION_CREATED','Template version created','New template version created'),
  ('COMM_TEMPLATE_TOKEN_VALIDATION_RUN','Template token validation run','Token validation executed'),
  ('COMM_TEMPLATE_RENDER_PREVIEWED','Template render previewed','Preview render invoked'),
  ('COMM_TEMPLATE_OUTPUT_GENERATED','Template output generated','A template rendered to output'),
  ('COMM_TEMPLATE_RENDER_BLOCKED','Template render blocked','Render blocked due to governance'),
  ('COMM_RENDER_CONTEXT_RESOLVED','Render context resolved','Business render context resolved'),
  ('COMM_RENDER_CONTEXT_HEALTH_CHECK_RUN','Render context health check run','Template health scan run'),
  ('COMM_RENDER_CONTEXT_EXPORT_CREATED','Render context export created','Health export produced'),
  ('COMM_BUSINESS_EVENT_TEMPLATE_ASSIGNED','Business event template assigned','Template assignment created'),
  ('COMM_BUSINESS_EVENT_TEMPLATE_UNASSIGNED','Business event template unassigned','Template assignment removed'),
  ('COMM_TEMPLATE_GOVERNANCE_VERIFIED','Template governance verified','OM-9.7.6 attestation recorded'),
  ('COMM_DIRECT_READ_WAIVER_BURNDOWN_UPDATED','Direct-read waiver burndown updated','Waiver classification refreshed')
) AS x(event_code, event_name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.core_audit_event_type e WHERE e.event_code = x.event_code);

INSERT INTO public.core_permission_registry (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, is_platform_permission, is_admin_permission, is_sensitive_permission, risk_level, source_file, is_active)
SELECT x.pk, x.pn, 'CORE', 'COMMUNICATION', x.sc, x.ac, TRUE, TRUE, x.sens, x.rl, 'src/platform/rbac/core.permissions.ts', TRUE
FROM (VALUES
  ('core.admin.template_management.manage_templates',              'Manage Document Templates',           'ADMIN','manage',TRUE,'HIGH'),
  ('core.admin.template_management.manage_notification_templates', 'Manage Notification Templates',       'ADMIN','manage',TRUE,'HIGH'),
  ('core.admin.template_management.manage_text_blocks',            'Manage Text Blocks',                  'ADMIN','manage',FALSE,'MEDIUM'),
  ('core.admin.template_management.manage_tokens',                 'Manage Communication Tokens',         'ADMIN','manage',FALSE,'MEDIUM'),
  ('core.admin.template_management.view_render_health',            'View Communication Template Health',  'PAGE', 'view',  FALSE,'LOW'),
  ('core.admin.template_management.run_render_health',             'Run Communication Template Health',   'ADMIN','run',   FALSE,'LOW'),
  ('core.admin.template_management.export_render_health',          'Export Communication Template Health','ADMIN','export',FALSE,'MEDIUM'),
  ('core.admin.template_management.seed_system_templates',         'Seed System Communication Templates', 'ADMIN','seed',  TRUE, 'HIGH')
) AS x(pk, pn, sc, ac, sens, rl)
WHERE NOT EXISTS (SELECT 1 FROM public.core_permission_registry p WHERE p.permission_key = x.pk);

INSERT INTO public.core_table_registry (table_name, module_code, domain_code, description, ownership_type, lifecycle_status, is_active)
SELECT t, 'CORE', 'COMMUNICATION', 'Communication/template governance table (OM-9.7.6).', 'PLATFORM', 'ACTIVE', TRUE
FROM UNNEST(ARRAY[
  'comm_media_asset','comm_asset_category_master','comm_asset_assignment',
  'comm_letterhead','core_template','core_template_version','core_template_layout',
  'notification_templates','comm_email_signature','comm_disclaimer','comm_print_footer',
  'core_text_block','core_configuration_assignment'
]) AS t
WHERE NOT EXISTS (SELECT 1 FROM public.core_table_registry r WHERE r.table_name = t);

INSERT INTO public.core_release_readiness_attestation (release_tag, check_code, attested_status, attested_by, attested_at, notes, is_active)
SELECT 'OM-9.7.6', 'COMMUNICATION_TEMPLATE_GOVERNANCE', 'ATTESTED', NULL, now(),
  'OM-9.7.6 Communication Template Governance seeds & catalogue applied.', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_release_readiness_attestation
  WHERE check_code = 'COMMUNICATION_TEMPLATE_GOVERNANCE' AND is_active = TRUE
);
