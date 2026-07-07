
CREATE TABLE IF NOT EXISTS public.core_retention_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL UNIQUE,
  policy_name text NOT NULL,
  policy_description text,
  retention_period_days integer,
  retention_trigger text,
  disposition_action text,
  legal_hold_allowed boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'ACTIVE',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_retention_policy TO authenticated;
GRANT ALL ON public.core_retention_policy TO service_role;

INSERT INTO public.core_table_registry (table_name, module_code, domain_code, table_category, ownership_type, lifecycle_status, description)
VALUES
  ('core_retention_policy','CORE','ORGANIZATION','REFERENCE','PLATFORM','ACTIVE','OM-8 canonical retention policy catalogue used by document templates and business modules.'),
  ('notification_templates','COMMUNICATION','COMMUNICATION','REFERENCE','PLATFORM','ACTIVE','Notification templates surfaced via OM-7 guided assignments (OM-8 verified).'),
  ('core_text_block','COMMUNICATION','COMMUNICATION','REFERENCE','PLATFORM','ACTIVE','Text blocks surfaced via OM-7 guided assignments (OM-8 verified).'),
  ('core_workflow_definition','WORKFLOW','WORKFLOW','CONFIGURATION','PLATFORM','ACTIVE','Approval workflow definitions surfaced via OM-7 (OM-8 verified).')
ON CONFLICT (table_name) DO UPDATE SET lifecycle_status='ACTIVE', updated_at=now();

INSERT INTO public.core_audit_event_type (event_code, event_name, module_code, event_category, default_severity, default_risk_level, description, is_active)
VALUES
  ('NOTIFICATION_TEMPLATE_SETTING_ASSIGNED','Notification Template Setting Assigned','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped notification template assignment created.',true),
  ('NOTIFICATION_TEMPLATE_SETTING_UPDATED','Notification Template Setting Updated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped notification template assignment updated.',true),
  ('NOTIFICATION_TEMPLATE_SETTING_DEACTIVATED','Notification Template Setting Deactivated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped notification template assignment deactivated.',true),
  ('TEXT_BLOCK_SETTING_ASSIGNED','Text Block Setting Assigned','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped text block assignment created.',true),
  ('TEXT_BLOCK_SETTING_UPDATED','Text Block Setting Updated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped text block assignment updated.',true),
  ('TEXT_BLOCK_SETTING_DEACTIVATED','Text Block Setting Deactivated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped text block assignment deactivated.',true),
  ('RETENTION_POLICY_CREATED','Retention Policy Created','CORE','CONFIGURATION','INFO','LOW','OM-8 retention policy row created.',true),
  ('RETENTION_POLICY_UPDATED','Retention Policy Updated','CORE','CONFIGURATION','INFO','LOW','OM-8 retention policy row updated.',true),
  ('RETENTION_POLICY_DEACTIVATED','Retention Policy Deactivated','CORE','CONFIGURATION','INFO','LOW','OM-8 retention policy row deactivated.',true),
  ('RETENTION_POLICY_SETTING_ASSIGNED','Retention Policy Setting Assigned','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped retention policy assignment created.',true),
  ('RETENTION_POLICY_SETTING_UPDATED','Retention Policy Setting Updated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped retention policy assignment updated.',true),
  ('RETENTION_POLICY_SETTING_DEACTIVATED','Retention Policy Setting Deactivated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped retention policy assignment deactivated.',true),
  ('APPROVAL_WORKFLOW_SETTING_ASSIGNED','Approval Workflow Setting Assigned','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped approval workflow assignment created.',true),
  ('APPROVAL_WORKFLOW_SETTING_UPDATED','Approval Workflow Setting Updated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped approval workflow assignment updated.',true),
  ('APPROVAL_WORKFLOW_SETTING_DEACTIVATED','Approval Workflow Setting Deactivated','CORE','CONFIGURATION','INFO','LOW','OM-8 scoped approval workflow assignment deactivated.',true),
  ('DMS_FOLDER_SETTING_VALIDATED','DMS Folder Setting Validated','CORE','CONFIGURATION','INFO','LOW','OM-8 DMS folder setting availability validated.',true),
  ('SCOPED_RESOURCE_SETTING_VERIFIED','Scoped Resource Settings Verified','CORE','ATTESTATION','INFO','LOW','OM-8 scoped resource settings infrastructure verified.',true)
ON CONFLICT (event_code) DO UPDATE SET is_active=true, description=EXCLUDED.description;

INSERT INTO public.core_reference_group (group_code, group_name, module_code, description, is_active)
VALUES
  ('RETENTION_POLICY_STATUS','Retention Policy Status','CORE','Lifecycle status values for retention policies (OM-8).',true),
  ('RETENTION_TRIGGER','Retention Trigger','CORE','Trigger events that start a retention period (OM-8).',true),
  ('RETENTION_DISPOSITION_ACTION','Retention Disposition Action','CORE','Actions taken when retention expires (OM-8).',true),
  ('SCOPED_RESOURCE_SETTING_TYPE','Scoped Resource Setting Type','CORE','Setting types resolvable via scoped configuration assignments (OM-8).',true),
  ('SCOPED_RESOURCE_HEALTH_STATUS','Scoped Resource Health Status','CORE','Health outcomes for scoped resource settings (OM-8).',true),
  ('NOTIFICATION_TEMPLATE_SETTING_STATUS','Notification Template Setting Status','COMMUNICATION','Status vocabulary for notification template settings (OM-8).',true),
  ('TEXT_BLOCK_SETTING_STATUS','Text Block Setting Status','COMMUNICATION','Status vocabulary for text block settings (OM-8).',true),
  ('APPROVAL_WORKFLOW_SETTING_STATUS','Approval Workflow Setting Status','WORKFLOW','Status vocabulary for approval workflow settings (OM-8).',true),
  ('DMS_FOLDER_SETTING_STATUS','DMS Folder Setting Status','CORE','Status vocabulary for DMS folder settings — OM-8 keeps DMS_FOLDER as planned.',true)
ON CONFLICT (group_code) DO UPDATE SET is_active=true, description=EXCLUDED.description;

INSERT INTO public.core_audit_log (
  event_code, module_code, action, severity, risk_level, source, outcome,
  entity_type, entity_display_name, metadata
) VALUES (
  'SCOPED_RESOURCE_SETTING_VERIFIED','CORE','EXECUTE','INFO','LOW','SYSTEM','SUCCESS',
  'release_readiness','OM-8 Scoped Resource Settings',
  jsonb_build_object('epic','OM-8','settings',jsonb_build_array('default_notification_template','default_text_block','default_retention_policy','default_approval_workflow','default_dms_folder'),'dms_folder','planned')
);
