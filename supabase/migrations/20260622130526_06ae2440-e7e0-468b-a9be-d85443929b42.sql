
-- Legal Admin: regroup into 5 functional groups
-- 1) Insert group nodes (no route, parent = lg_admin)
INSERT INTO app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('1e9a1000-0000-0000-0000-000000000200','lg_admin_grp_setup','Setup & Identity','Department, routing and team configuration','Building2',NULL,'1e9a1000-0000-0000-0000-000000000120',200,true,true),
  ('1e9a1000-0000-0000-0000-000000000210','lg_admin_grp_reference','Reference & Rules','Codes, references and workflow rules','BookOpen',NULL,'1e9a1000-0000-0000-0000-000000000120',210,true,true),
  ('1e9a1000-0000-0000-0000-000000000220','lg_admin_grp_templates','Templates & Documents','Templates, document types and stage rules','FileText',NULL,'1e9a1000-0000-0000-0000-000000000120',220,true,true),
  ('1e9a1000-0000-0000-0000-000000000230','lg_admin_grp_fees','Fees & Waivers','Fees, bundles and waiver policies','DollarSign',NULL,'1e9a1000-0000-0000-0000-000000000120',230,true,true),
  ('1e9a1000-0000-0000-0000-000000000240','lg_admin_grp_governance','Governance','Permissions, audit and validation','ShieldCheck',NULL,'1e9a1000-0000-0000-0000-000000000120',240,true,true)
ON CONFLICT (id) DO NOTHING;

-- 2) Insert new leaf modules (stub pages)
INSERT INTO app_modules (id, name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
VALUES
  ('1e9a1000-0000-0000-0000-000000000201','lg_admin_profile','Department Profile','Legal department identity and contact','Building2','/legal/admin/profile','1e9a1000-0000-0000-0000-000000000200',1,true,true),
  ('1e9a1000-0000-0000-0000-000000000202','lg_admin_routing','Routing & Assignment','Case routing and assignment strategy','Workflow','/legal/admin/routing','1e9a1000-0000-0000-0000-000000000200',2,true,true),
  ('1e9a1000-0000-0000-0000-000000000221','lg_admin_doc_types','Document Types','Legal document type catalog','FolderOpen','/legal/admin/document-types','1e9a1000-0000-0000-0000-000000000220',2,true,true),
  ('1e9a1000-0000-0000-0000-000000000231','lg_admin_fee_bundles','Fee Bundles','Pre-defined fee bundles','DollarSign','/legal/admin/fee-bundles','1e9a1000-0000-0000-0000-000000000230',2,true,true),
  ('1e9a1000-0000-0000-0000-000000000241','lg_admin_permissions','Permissions','Legal role-permission matrix','ShieldCheck','/legal/admin/permissions','1e9a1000-0000-0000-0000-000000000240',1,true,true),
  ('1e9a1000-0000-0000-0000-000000000242','lg_admin_audit_log','Audit Log','Legal configuration audit log','Search','/legal/admin/audit','1e9a1000-0000-0000-0000-000000000240',2,true,true),
  ('1e9a1000-0000-0000-0000-000000000243','lg_admin_validation_report','Validation Report','Legal configuration validation','AlertTriangle','/legal/admin/validation','1e9a1000-0000-0000-0000-000000000240',3,true,true)
ON CONFLICT (id) DO NOTHING;

-- 3) Re-parent existing leaves into groups with new sort order
-- Setup & Identity group: profile(1), routing(2), teams(3)
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000200', sort_order=3
  WHERE id='1e9a1000-0000-0000-0000-000000000127'; -- teams
-- Reference & Rules: codesets(1), legal-refs(2), workflow/policy(3)
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000210', sort_order=1
  WHERE id='1e9a1000-0000-0000-0000-000000000123'; -- codesets
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000210', sort_order=2
  WHERE id='1e9a1000-0000-0000-0000-000000000125'; -- legal-refs
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000210', sort_order=3, display_name='Workflow & Stage Rules'
  WHERE id='1e9a1000-0000-0000-0000-000000000122'; -- policy
-- Templates & Documents: templates(1), doc-types(2-already), stage-doc-rules(3)
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000220', sort_order=1
  WHERE id='1e9a1000-0000-0000-0000-000000000124'; -- templates
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000220', sort_order=3
  WHERE id='1e9a1000-0000-0000-0000-000000000132'; -- stage-doc-rules
-- Hide redundant stage mapping items from menu (still routable)
UPDATE app_modules SET show_in_menu=false
  WHERE id IN ('1e9a1000-0000-0000-0000-000000000130','1e9a1000-0000-0000-0000-000000000131');
-- Fees & Waivers: fees(1), bundles(2-already), waivers(3)
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000230', sort_order=1
  WHERE id='1e9a1000-0000-0000-0000-000000000121'; -- fees
UPDATE app_modules SET parent_id='1e9a1000-0000-0000-0000-000000000230', sort_order=3
  WHERE id='1e9a1000-0000-0000-0000-000000000003';  -- waiver-policies
-- Move Complainant Settings out of the menu (route preserved) — replaced by Routing & Assignment
UPDATE app_modules SET show_in_menu=false
  WHERE id='1e9a1000-0000-0000-0000-000000000126';

-- 4) Module actions for new leaves
INSERT INTO module_actions (module_id, action_name, display_name, is_enabled)
SELECT m.id, a.action_name, a.display_name, true
FROM (VALUES
  ('1e9a1000-0000-0000-0000-000000000201'::uuid),
  ('1e9a1000-0000-0000-0000-000000000202'::uuid),
  ('1e9a1000-0000-0000-0000-000000000221'::uuid),
  ('1e9a1000-0000-0000-0000-000000000231'::uuid),
  ('1e9a1000-0000-0000-0000-000000000241'::uuid),
  ('1e9a1000-0000-0000-0000-000000000242'::uuid),
  ('1e9a1000-0000-0000-0000-000000000243'::uuid)
) m(id)
CROSS JOIN (VALUES
  ('view','View'),('create','Create'),('edit','Edit'),('delete','Delete')
) a(action_name, display_name)
WHERE NOT EXISTS (
  SELECT 1 FROM module_actions ma WHERE ma.module_id=m.id AND ma.action_name=a.action_name
);

-- 5) Role permissions: Admin + LEGAL_ADMIN full access on every Legal Admin leaf
WITH leaves AS (
  SELECT id FROM app_modules
  WHERE parent_id IN (
    '1e9a1000-0000-0000-0000-000000000200',
    '1e9a1000-0000-0000-0000-000000000210',
    '1e9a1000-0000-0000-0000-000000000220',
    '1e9a1000-0000-0000-0000-000000000230',
    '1e9a1000-0000-0000-0000-000000000240'
  )
), targets AS (
  SELECT r.id AS role_id, ma.module_id, ma.id AS action_id
  FROM roles r
  CROSS JOIN module_actions ma
  WHERE r.role_name IN ('Admin','LEGAL_ADMIN')
    AND ma.module_id IN (SELECT id FROM leaves)
)
INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
SELECT role_id, module_id, action_id, true FROM targets
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id=targets.role_id AND rp.module_id=targets.module_id AND rp.action_id=targets.action_id
);

-- LEGAL_MANAGER view-only on every Legal Admin leaf
WITH leaves AS (
  SELECT id FROM app_modules
  WHERE parent_id IN (
    '1e9a1000-0000-0000-0000-000000000200',
    '1e9a1000-0000-0000-0000-000000000210',
    '1e9a1000-0000-0000-0000-000000000220',
    '1e9a1000-0000-0000-0000-000000000230',
    '1e9a1000-0000-0000-0000-000000000240'
  )
), targets AS (
  SELECT r.id AS role_id, ma.module_id, ma.id AS action_id
  FROM roles r
  CROSS JOIN module_actions ma
  WHERE r.role_name='LEGAL_MANAGER'
    AND ma.action_name='view'
    AND ma.module_id IN (SELECT id FROM leaves)
)
INSERT INTO role_permissions (role_id, module_id, action_id, is_granted)
SELECT role_id, module_id, action_id, true FROM targets
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id=targets.role_id AND rp.module_id=targets.module_id AND rp.action_id=targets.action_id
);

-- 6) Route security entries for new routes
INSERT INTO route_security_config (route_pattern, module_name, screen_name, requires_auth, admin_only, is_settings_route, severity_on_violation, is_active, description)
VALUES
  ('/legal/admin','lg_admin','Legal Admin Home',true,true,true,'high',true,'Legal admin landing — redirects to first allowed child'),
  ('/legal/admin/profile','lg_admin_profile','Department Profile',true,true,true,'high',true,'Legal department identity & contact'),
  ('/legal/admin/routing','lg_admin_routing','Routing & Assignment',true,true,true,'high',true,'Case routing strategy'),
  ('/legal/admin/code-sets','lg_admin_codesets','Code Sets',true,true,true,'high',true,'Legal code sets (alias)'),
  ('/legal/admin/workflow','lg_admin_policy_config','Workflow & Stage Rules',true,true,true,'high',true,'Workflow rules (alias of /policy)'),
  ('/legal/admin/document-types','lg_admin_doc_types','Document Types',true,true,true,'high',true,'Legal document type catalog'),
  ('/legal/admin/fee-bundles','lg_admin_fee_bundles','Fee Bundles',true,true,true,'high',true,'Pre-defined fee bundles'),
  ('/legal/admin/permissions','lg_admin_permissions','Permissions',true,true,true,'high',true,'Legal role-permission matrix'),
  ('/legal/admin/audit','lg_admin_audit_log','Audit Log',true,true,true,'high',true,'Legal configuration audit log'),
  ('/legal/admin/validation','lg_admin_validation_report','Validation Report',true,true,true,'high',true,'Legal configuration validation')
ON CONFLICT DO NOTHING;
