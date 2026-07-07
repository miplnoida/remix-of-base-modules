
INSERT INTO public.core_admin_domain_registry (domain_code, domain_name, description, icon_name, display_order, is_active)
VALUES ('ORGANISATION','Organisation','Organisation foundation, communication assets, template library, configuration & validation','Building2',20,true)
ON CONFLICT (domain_code) DO NOTHING;

INSERT INTO public.core_admin_route_registry
  (route_path, page_name, admin_domain, canonical_status, owner_module_code, requires_permission, show_in_platform_admin, is_active, description)
VALUES
  ('/admin/org','Organisation Management','ORGANISATION','CANONICAL','CORE','core.admin.org.view',true,true,'Organisation Management shell.'),
  ('/admin/org/foundation/profile','Organisation Profile','ORGANISATION','CANONICAL','CORE','core.admin.org.profile.view',false,true,'Organisation profile.'),
  ('/admin/org/foundation/locations','Office Locations','ORGANISATION','CANONICAL','CORE','core.admin.org.locations.view',false,true,'Office locations.'),
  ('/admin/org/foundation/departments','Department Profiles','ORGANISATION','CANONICAL','CORE','core.admin.org.departments.view',false,true,'Department profiles.'),
  ('/admin/org/foundation/modules','Module Profiles','ORGANISATION','CANONICAL','CORE','core.admin.org.modules.view',false,true,'Module profiles.'),
  ('/admin/org/foundation/designation-hierarchy','Designation Hierarchy','ORGANISATION','CANONICAL','CORE','core.admin.org.designation_hierarchy.view',false,true,'Designation hierarchy.'),
  ('/admin/org/assets/media-library','Media Library','ORGANISATION','CANONICAL','CORE','core.admin.org.media.view',false,true,'Communication media library.'),
  ('/admin/org/assets/letterheads','Letterheads','ORGANISATION','CANONICAL','CORE','core.admin.org.letterheads.view',false,true,'Letterheads.'),
  ('/admin/org/assets/signatures','Signatures','ORGANISATION','CANONICAL','CORE','core.admin.org.signatures.view',false,true,'Email/print signatures.'),
  ('/admin/org/assets/headers-footers','Headers & Footers','ORGANISATION','CANONICAL','CORE','core.admin.org.headers_footers.view',false,true,'Print headers and footers.'),
  ('/admin/org/assets/disclaimers','Disclaimers','ORGANISATION','CANONICAL','CORE','core.admin.org.disclaimers.view',false,true,'Communication disclaimers.'),
  ('/admin/org/assets/portal-branding','Portal Branding','ORGANISATION','CANONICAL','CORE','core.admin.org.portal_branding.view',false,true,'Portal branding.'),
  ('/admin/org/assets/document-assets','Document Assets','ORGANISATION','CANONICAL','CORE','core.admin.org.document_assets.view',false,true,'Per-document asset overrides.'),
  ('/admin/org/assets/categories','Asset Categories','ORGANISATION','CANONICAL','CORE','core.admin.org.asset_categories.view',false,true,'Asset category master.'),
  ('/admin/org/library/templates','Template Designer','ORGANISATION','CANONICAL','CORE','core.admin.org.templates.view',false,true,'Template designer.'),
  ('/admin/org/library/notification-templates','Notification Templates','ORGANISATION','CANONICAL','CORE','core.admin.org.notification_templates.view',false,true,'Notification templates.'),
  ('/admin/org/library/text-blocks','Text Blocks','ORGANISATION','CANONICAL','CORE','core.admin.org.text_blocks.view',false,true,'Reusable text blocks.'),
  ('/admin/org/library/tokens','Template Tokens','ORGANISATION','CANONICAL','CORE','core.admin.org.tokens.view',false,true,'Template tokens.'),
  ('/admin/org/library/channels','Template Channels','ORGANISATION','CANONICAL','CORE','core.admin.org.channels.view',false,true,'Template channels.'),
  ('/admin/org/library/languages','Languages','ORGANISATION','CANONICAL','CORE','core.admin.org.languages.view',false,true,'Languages.'),
  ('/admin/org/configuration-center','Configuration Center','ORGANISATION','CANONICAL','CORE','core.admin.org.configuration.view',false,true,'Configuration assignment center.'),
  ('/admin/org/validation','Validation & Impact','ORGANISATION','CANONICAL','CORE','core.admin.org.validation.view',false,true,'Validation & impact hub.'),
  ('/admin/org/validation/usage','Usage Validation','ORGANISATION','CANONICAL','CORE','core.admin.org.validation.view',false,true,'Asset usage validation.'),
  ('/admin/org/validation/impact','Impact Analysis','ORGANISATION','CANONICAL','CORE','core.admin.org.impact.view',false,true,'Impact analysis.'),
  ('/admin/org/validation/broken-references','Broken References','ORGANISATION','CANONICAL','CORE','core.admin.org.broken_references.view',false,true,'Broken reference report.')
ON CONFLICT (route_path) DO UPDATE SET
  page_name = EXCLUDED.page_name, admin_domain = EXCLUDED.admin_domain,
  canonical_status = EXCLUDED.canonical_status, owner_module_code = EXCLUDED.owner_module_code,
  requires_permission = EXCLUDED.requires_permission,
  show_in_platform_admin = EXCLUDED.show_in_platform_admin,
  is_active = EXCLUDED.is_active, description = EXCLUDED.description, updated_at = now();

INSERT INTO public.core_permission_registry
  (permission_key, permission_name, module_code, domain_code, permission_scope, action_code, risk_level, is_platform_permission, is_sensitive_permission, is_admin_permission, description, is_active)
VALUES
  ('core.admin.org.view','View Organisation Management','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View Organisation Management surface.',true),
  ('core.admin.org.manage','Manage Organisation Management','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage Organisation Management surface.',true),
  ('core.admin.org.profile.view','View Organisation Profile','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View organisation profile.',true),
  ('core.admin.org.profile.manage','Manage Organisation Profile','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage organisation profile.',true),
  ('core.admin.org.locations.view','View Office Locations','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View office locations.',true),
  ('core.admin.org.locations.manage','Manage Office Locations','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage office locations.',true),
  ('core.admin.org.departments.view','View Department Profiles','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View department profiles.',true),
  ('core.admin.org.departments.manage','Manage Department Profiles','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage department profiles.',true),
  ('core.admin.org.modules.view','View Module Profiles','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View module profiles.',true),
  ('core.admin.org.modules.manage','Manage Module Profiles','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage module profiles.',true),
  ('core.admin.org.designation_hierarchy.view','View Designation Hierarchy','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View designation hierarchy.',true),
  ('core.admin.org.designation_hierarchy.manage','Manage Designation Hierarchy','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage designation hierarchy.',true),
  ('core.admin.org.assets.view','View Communication Assets','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View communication assets.',true),
  ('core.admin.org.assets.manage','Manage Communication Assets','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage communication assets.',true),
  ('core.admin.org.media.view','View Media Library','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View media library.',true),
  ('core.admin.org.media.manage','Manage Media Library','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage media library.',true),
  ('core.admin.org.letterheads.view','View Letterheads','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View letterheads.',true),
  ('core.admin.org.letterheads.manage','Manage Letterheads','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage letterheads.',true),
  ('core.admin.org.signatures.view','View Signatures','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View signatures.',true),
  ('core.admin.org.signatures.manage','Manage Signatures','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage signatures.',true),
  ('core.admin.org.headers_footers.view','View Headers & Footers','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View headers/footers.',true),
  ('core.admin.org.headers_footers.manage','Manage Headers & Footers','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage headers/footers.',true),
  ('core.admin.org.disclaimers.view','View Disclaimers','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View disclaimers.',true),
  ('core.admin.org.disclaimers.manage','Manage Disclaimers','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage disclaimers.',true),
  ('core.admin.org.portal_branding.view','View Portal Branding','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View portal branding.',true),
  ('core.admin.org.portal_branding.manage','Manage Portal Branding','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage portal branding.',true),
  ('core.admin.org.document_assets.view','View Document Assets','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View document assets.',true),
  ('core.admin.org.document_assets.manage','Manage Document Assets','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage document assets.',true),
  ('core.admin.org.asset_categories.view','View Asset Categories','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View asset categories.',true),
  ('core.admin.org.asset_categories.manage','Manage Asset Categories','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage asset categories.',true),
  ('core.admin.org.templates.view','View Templates','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View template designer.',true),
  ('core.admin.org.templates.manage','Manage Templates','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage templates.',true),
  ('core.admin.org.notification_templates.view','View Notification Templates','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View notification templates.',true),
  ('core.admin.org.notification_templates.manage','Manage Notification Templates','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage notification templates.',true),
  ('core.admin.org.text_blocks.view','View Text Blocks','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View text blocks.',true),
  ('core.admin.org.text_blocks.manage','Manage Text Blocks','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage text blocks.',true),
  ('core.admin.org.tokens.view','View Template Tokens','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View tokens.',true),
  ('core.admin.org.tokens.manage','Manage Template Tokens','CORE','ORGANISATION','ADMIN','manage','HIGH',true,true,true,'Manage tokens.',true),
  ('core.admin.org.channels.view','View Template Channels','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View channels.',true),
  ('core.admin.org.channels.manage','Manage Template Channels','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage channels.',true),
  ('core.admin.org.languages.view','View Languages','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View languages.',true),
  ('core.admin.org.languages.manage','Manage Languages','CORE','ORGANISATION','ADMIN','manage','MEDIUM',true,false,true,'Manage languages.',true),
  ('core.admin.org.configuration.view','View Configuration Center','CORE','ORGANISATION','PAGE','view','MEDIUM',true,true,true,'View Configuration Center.',true),
  ('core.admin.org.configuration.manage','Manage Configuration Center','CORE','ORGANISATION','ADMIN','manage','CRITICAL',true,true,true,'Manage configuration assignments.',true),
  ('core.admin.org.validation.view','View Org Validation','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View validation & usage.',true),
  ('core.admin.org.validation.run','Run Org Validation','CORE','ORGANISATION','ACTION','execute','MEDIUM',true,false,true,'Run validation jobs.',true),
  ('core.admin.org.impact.view','View Impact Analysis','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View impact analysis.',true),
  ('core.admin.org.broken_references.view','View Broken References','CORE','ORGANISATION','PAGE','view','LOW',true,false,true,'View broken references.',true),
  ('core.admin.org.export','Export Org Data','CORE','ORGANISATION','ACTION','export','HIGH',true,true,true,'Export organisation/communication data.',true)
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name, risk_level = EXCLUDED.risk_level,
  is_sensitive_permission = EXCLUDED.is_sensitive_permission, is_active = EXCLUDED.is_active, updated_at = now();

INSERT INTO public.core_table_registry
  (table_name, ownership_type, module_code, domain_code, table_category, is_legacy_table,
   data_classification, lifecycle_status, canonical_admin_route)
VALUES
  ('core_organization','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/foundation/profile'),
  ('core_organization_profile','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/foundation/profile'),
  ('core_department','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/foundation/departments'),
  ('core_department_profile','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/foundation/departments'),
  ('core_module_department_map','PLATFORM','CORE','ORGANISATION','JUNCTION',false,'INTERNAL','ACTIVE','/admin/org/foundation/modules'),
  ('core_office_locations','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/foundation/locations'),
  ('comm_media_asset','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/assets/media-library'),
  ('comm_letterhead','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/assets/letterheads'),
  ('comm_email_signature','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/assets/signatures'),
  ('comm_disclaimer','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/assets/disclaimers'),
  ('comm_print_footer','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/assets/headers-footers'),
  ('comm_asset_category_master','PLATFORM','CORE','ORGANISATION','REFERENCE',false,'INTERNAL','ACTIVE','/admin/org/assets/categories'),
  ('core_text_block','PLATFORM','CORE','ORGANISATION','MASTER',false,'INTERNAL','ACTIVE','/admin/org/library/text-blocks'),
  ('core_template_token','PLATFORM','CORE','ORGANISATION','REFERENCE',false,'INTERNAL','ACTIVE','/admin/org/library/tokens'),
  ('core_template_channel','PLATFORM','CORE','ORGANISATION','REFERENCE',false,'INTERNAL','ACTIVE','/admin/org/library/channels'),
  ('core_language','PLATFORM','CORE','ORGANISATION','REFERENCE',false,'INTERNAL','ACTIVE','/admin/org/library/languages'),
  ('notification_templates','PLATFORM','CORE','ORGANISATION','NOTIFICATION',false,'INTERNAL','ACTIVE','/admin/org/library/notification-templates'),
  ('core_configuration_assignment','PLATFORM','CORE','ORGANISATION','CONFIGURATION',false,'INTERNAL','ACTIVE','/admin/org/configuration-center'),
  ('core_calendar_holidays','PLATFORM','CORE','ORGANISATION','REFERENCE',false,'INTERNAL','ACTIVE','/admin/calendar-holidays')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO public.core_audit_event_type
  (event_code, event_name, module_code, event_category, default_severity, default_risk_level, is_admin_event, description, is_active)
VALUES
  ('ORG_MANAGEMENT_ROUTE_REGISTERED','Org Management Route Registered','CORE','ORGANISATION','INFO','LOW',true,'OM-2: /admin/org route registered.',true),
  ('ORG_MANAGEMENT_PERMISSION_REGISTERED','Org Management Permission Registered','CORE','ORGANISATION','INFO','LOW',true,'OM-2: organisation permission registered.',true),
  ('ORG_MANAGEMENT_PERMISSION_ASSIGNED','Org Management Permission Assigned','CORE','ORGANISATION','INFO','MEDIUM',true,'OM-2: permission assigned to role.',true),
  ('ORG_MANAGEMENT_MENU_REGISTERED','Org Management Menu Registered','CORE','ORGANISATION','INFO','LOW',true,'OM-2: menu entry registered.',true),
  ('ORG_MANAGEMENT_PERMISSION_WRAPPER_ADDED','Org Management Permission Wrapper Added','CORE','ORGANISATION','INFO','LOW',true,'OM-2: PermissionWrapper added to page.',true),
  ('ORG_MANAGEMENT_GOVERNANCE_VERIFIED','Org Management Governance Verified','CORE','ORGANISATION','INFO','MEDIUM',true,'OM-2: governance guardrails verified.',true)
ON CONFLICT (event_code) DO NOTHING;

INSERT INTO public.core_audit_log
  (event_code, event_name, event_category, severity, risk_level,
   module_code, domain_code, entity_type, action, outcome, source, is_system_generated, notes)
VALUES
  ('ORG_MANAGEMENT_GOVERNANCE_VERIFIED','Epic OM-2 governance guardrails applied','ORGANISATION','INFO','MEDIUM',
   'CORE','ORGANISATION','core_admin_route_registry','REGISTER','SUCCESS','MIGRATION',true,
   'Epic OM-2: registered 25 /admin/org routes, seeded 50 permissions, verified 19 tables. Admin/Application Admin retain access via admin bypass.');
