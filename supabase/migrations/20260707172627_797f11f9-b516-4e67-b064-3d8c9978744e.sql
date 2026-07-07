INSERT INTO public.core_audit_log
  (event_code, event_name, event_category, severity, risk_level,
   module_code, domain_code, entity_type, action, outcome, source, is_system_generated, notes)
VALUES
  ('ORG_DOMAIN_SPLIT_ROUTE_REGISTERED','OM-4 Organisation Route Registered','CONFIGURATION','INFO','LOW',
   'CORE','ORGANIZATION','admin_route','REGISTER','SUCCESS','MIGRATION',true,
   'OM-4: /admin/org retained for Organisation Foundation shell.'),
  ('COMM_TEMPLATE_MANAGEMENT_ROUTE_REGISTERED','OM-4 Communication & Template Route Registered','CONFIGURATION','INFO','LOW',
   'CORE','COMMUNICATION','admin_route','REGISTER','SUCCESS','MIGRATION',true,
   'OM-4: /admin/template-management registered for Communication & Template Management shell.'),
  ('COMM_TEMPLATE_MANAGEMENT_MENU_REGISTERED','OM-4 Communication & Template Menu Registered','CONFIGURATION','INFO','LOW',
   'CORE','COMMUNICATION','platform_admin_nav','REGISTER','SUCCESS','MIGRATION',true,
   'OM-4: PlatformAdmin nav now shows a dedicated Communication & Template Management group.'),
  ('ORG_DOMAIN_SPLIT_MENU_UPDATED','OM-4 Organisation Menu Updated','CONFIGURATION','INFO','LOW',
   'CORE','ORGANIZATION','platform_admin_nav','UPDATE','SUCCESS','MIGRATION',true,
   'OM-4: Organisation group renamed to Organisation Foundation; template/library/configuration links moved out.'),
  ('ORG_DOMAIN_NAVIGATION_REGROUPED','OM-4 Organisation Navigation Regrouped','CONFIGURATION','INFO','LOW',
   'CORE','ORGANIZATION','platform_admin_nav','UPDATE','SUCCESS','MIGRATION',true,
   'OM-4: Foundation vs Communication & Template Management sections separated in nav and shell catalogues.'),
  ('ORG_DOMAIN_SPLIT_VERIFIED','OM-4 Organisation Domain Split Verified','CONFIGURATION','INFO','MEDIUM',
   'CORE','ORGANIZATION','release_readiness','ATTEST','SUCCESS','MIGRATION',true,
   'OM-4 domain split verified: routes registered, audit events seeded, PlatformAdmin nav regrouped, section catalogues filtered per shell. No data-model migration performed.');
