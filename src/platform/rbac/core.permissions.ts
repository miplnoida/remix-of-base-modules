import type { PermissionSourceDefinition } from './permissionTypes';

/**
 * Canonical core admin permission keys. Business modules should publish
 * their own equivalent files (bn.permissions.ts, er.permissions.ts, ...)
 * and register them through PERMISSION_REGISTRY in permissionRegistry.ts.
 */
export const CORE_PERMISSIONS = {
  admin: {
    platform: {
      view: 'core.admin.platform.view',
    },
    configuration: {
      view: 'core.admin.configuration.view',
    },
    routeRegistry: {
      view: 'core.admin.route_registry.view',
      manage: 'core.admin.route_registry.manage',
    },
    tableRegistry: {
      view: 'core.admin.table_registry.view',
      manage: 'core.admin.table_registry.manage',
    },
    legacyMapping: {
      view: 'core.admin.legacy_mapping.view',
      manage: 'core.admin.legacy_mapping.manage',
      approve: 'core.admin.legacy_mapping.approve',
    },
    referenceGovernance: {
      view: 'core.admin.reference_governance.view',
      manage: 'core.admin.reference_governance.manage',
      approve: 'core.admin.reference_governance.approve',
    },
    permissionRegistry: {
      view: 'core.admin.permission_registry.view',
      manage: 'core.admin.permission_registry.manage',
      sync: 'core.admin.permission_registry.sync',
    },
    users: {
      view: 'core.admin.users.view',
      create: 'core.admin.users.create',
      update: 'core.admin.users.update',
      disable: 'core.admin.users.disable',
      manageRoles: 'core.admin.users.manage_roles',
      manageAssignments: 'core.admin.users.manage_assignments',
      manageSecurity: 'core.admin.users.manage_security',
      manageDelegations: 'core.admin.users.manage_delegations',
    },
    staffProfiles: {
      view: 'core.admin.staff_profiles.view',
      manage: 'core.admin.staff_profiles.manage',
    },
    identity: {
      view: 'core.admin.identity.view',
      manage: 'core.admin.identity.manage',
    },
    roles: {
      view: 'core.admin.roles.view',
      create: 'core.admin.roles.create',
      update: 'core.admin.roles.update',
      assignPermissions: 'core.admin.roles.assign_permissions',
    },
    organization: {
      view: 'core.admin.organization.view',
      manage: 'core.admin.organization.manage',
    },
    organizationProfile: {
      view: 'core.admin.organization_profile.view',
      manage: 'core.admin.organization_profile.manage',
    },
    offices: {
      view: 'core.admin.offices.view',
      manage: 'core.admin.offices.manage',
    },
    departments: {
      view: 'core.admin.departments.view',
      manage: 'core.admin.departments.manage',
    },
    designations: {
      view: 'core.admin.designations.view',
      manage: 'core.admin.designations.manage',
    },
    locations: {
      view: 'core.admin.locations.view',
      manage: 'core.admin.locations.manage',
    },
    calendar: {
      view: 'core.admin.calendar.view',
      manage: 'core.admin.calendar.manage',
    },

    // ===== Epic OM-2: Organisation Management Governance Guardrails =====
    org: {
      view: 'core.admin.org.view',
      manage: 'core.admin.org.manage',
      export: 'core.admin.org.export',
      profile: { view: 'core.admin.org.profile.view', manage: 'core.admin.org.profile.manage' },
      locations: { view: 'core.admin.org.locations.view', manage: 'core.admin.org.locations.manage' },
      departments: { view: 'core.admin.org.departments.view', manage: 'core.admin.org.departments.manage' },
      modules: { view: 'core.admin.org.modules.view', manage: 'core.admin.org.modules.manage' },
      designationHierarchy: { view: 'core.admin.org.designation_hierarchy.view', manage: 'core.admin.org.designation_hierarchy.manage' },
      assets: { view: 'core.admin.org.assets.view', manage: 'core.admin.org.assets.manage' },
      media: { view: 'core.admin.org.media.view', manage: 'core.admin.org.media.manage' },
      letterheads: { view: 'core.admin.org.letterheads.view', manage: 'core.admin.org.letterheads.manage' },
      signatures: { view: 'core.admin.org.signatures.view', manage: 'core.admin.org.signatures.manage' },
      headersFooters: { view: 'core.admin.org.headers_footers.view', manage: 'core.admin.org.headers_footers.manage' },
      disclaimers: { view: 'core.admin.org.disclaimers.view', manage: 'core.admin.org.disclaimers.manage' },
      portalBranding: { view: 'core.admin.org.portal_branding.view', manage: 'core.admin.org.portal_branding.manage' },
      documentAssets: { view: 'core.admin.org.document_assets.view', manage: 'core.admin.org.document_assets.manage' },
      assetCategories: { view: 'core.admin.org.asset_categories.view', manage: 'core.admin.org.asset_categories.manage' },
      templates: { view: 'core.admin.org.templates.view', manage: 'core.admin.org.templates.manage' },
      notificationTemplates: { view: 'core.admin.org.notification_templates.view', manage: 'core.admin.org.notification_templates.manage' },
      textBlocks: { view: 'core.admin.org.text_blocks.view', manage: 'core.admin.org.text_blocks.manage' },
      tokens: { view: 'core.admin.org.tokens.view', manage: 'core.admin.org.tokens.manage' },
      channels: { view: 'core.admin.org.channels.view', manage: 'core.admin.org.channels.manage' },
      languages: { view: 'core.admin.org.languages.view', manage: 'core.admin.org.languages.manage' },
      configuration: { view: 'core.admin.org.configuration.view', manage: 'core.admin.org.configuration.manage' },
      validation: { view: 'core.admin.org.validation.view', run: 'core.admin.org.validation.run' },
      impact: { view: 'core.admin.org.impact.view' },
      brokenReferences: { view: 'core.admin.org.broken_references.view' },
    },

    // Epic OM-9.7.5 — Brand Asset Governance & Template Consumption
    templateManagement: {
      view:                  'core.admin.template_management.view',
      manageAssets:          'core.admin.template_management.manage_assets',
      approveAssets:         'core.admin.template_management.approve_assets',
      archiveAssets:         'core.admin.template_management.archive_assets',
      manageAssetCategories: 'core.admin.template_management.manage_asset_categories',
      manageLetterheads:     'core.admin.template_management.manage_letterheads',
      managePortalBranding:  'core.admin.template_management.manage_portal_branding',
      manageEmailBranding:   'core.admin.template_management.manage_email_branding',
      manageAssignments:     'core.admin.template_management.manage_assignments',
      viewAssetHealth:       'core.admin.template_management.view_asset_health',
      exportAssetUsage:      'core.admin.template_management.export_asset_usage',
      useUnapprovedAsset:    'core.admin.template_management.use_unapproved_asset',
      // OM-9.7.6 — Communication Template Governance
      manageTemplates:              'core.admin.template_management.manage_templates',
      manageNotificationTemplates:  'core.admin.template_management.manage_notification_templates',
      manageTextBlocks:             'core.admin.template_management.manage_text_blocks',
      manageTokens:                 'core.admin.template_management.manage_tokens',
      viewRenderHealth:             'core.admin.template_management.view_render_health',
      runRenderHealth:              'core.admin.template_management.run_render_health',
      exportRenderHealth:           'core.admin.template_management.export_render_health',
      seedSystemTemplates:          'core.admin.template_management.seed_system_templates',
    },


    masterData: {
      view: 'core.admin.master_data.view',
      manage: 'core.admin.master_data.manage',
    },
    audit: {
      view: 'core.admin.audit.view',
      manageEventTypes: 'core.admin.audit.manage_event_types',
      managePolicies: 'core.admin.audit.manage_policies',
      export: 'core.admin.audit.export',
      viewSensitive: 'core.admin.audit.view_sensitive',
    },
    systemLogs: {
      view: 'core.admin.system_logs.view',
    },
    platformServices: {
      view: 'core.admin.platform_services.view',
      manage: 'core.admin.platform_services.manage',
      manageContracts: 'core.admin.platform_services.manage_contracts',
      manageConsumers: 'core.admin.platform_services.manage_consumers',
      manageChecklists: 'core.admin.platform_services.manage_checklists',
      assessModules: 'core.admin.platform_services.assess_modules',
      waiveChecklist: 'core.admin.platform_services.waive_checklist',
      export: 'core.admin.platform_services.export',
    },
    releaseReadiness: {
      view: 'core.admin.release_readiness.view',
      runChecks: 'core.admin.release_readiness.run_checks',
      attest: 'core.admin.release_readiness.attest',
      override: 'core.admin.release_readiness.override',
      export: 'core.admin.release_readiness.export',
      manage: 'core.admin.release_readiness.manage',
    },
  },
} as const;

const SF = 'src/platform/rbac/core.permissions.ts';

export const CORE_PERMISSION_DEFINITIONS: PermissionSourceDefinition[] = [
  { permission_key: 'core.admin.platform.view', permission_name: 'View Platform Admin', module_code: 'CORE', domain_code: 'ADMINISTRATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.configuration.view', permission_name: 'View Configuration Centre', module_code: 'CORE', domain_code: 'ADMINISTRATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },

  { permission_key: 'core.admin.route_registry.view', permission_name: 'View Admin Route Registry', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.route_registry.manage', permission_name: 'Manage Admin Route Registry', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'HIGH', source_file: SF },

  { permission_key: 'core.admin.table_registry.view', permission_name: 'View Table Registry', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.table_registry.manage', permission_name: 'Manage Table Registry', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'HIGH', source_file: SF },

  { permission_key: 'core.admin.legacy_mapping.view', permission_name: 'View Legacy Mapping', module_code: 'CORE', domain_code: 'MIGRATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.legacy_mapping.manage', permission_name: 'Manage Legacy Mapping', module_code: 'CORE', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.legacy_mapping.approve', permission_name: 'Approve Legacy Mapping', module_code: 'CORE', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'approve', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: SF },

  { permission_key: 'core.admin.reference_governance.view', permission_name: 'View Reference Governance', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.reference_governance.manage', permission_name: 'Manage Reference Governance', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.reference_governance.approve', permission_name: 'Approve Reference Governance Changes', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'approve', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: SF },

  { permission_key: 'core.admin.permission_registry.view', permission_name: 'View Permission Registry', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: 'src/platform/rbac/rbacPermissions.ts' },
  { permission_key: 'core.admin.permission_registry.manage', permission_name: 'Manage Permission Registry', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/rbac/rbacPermissions.ts' },
  { permission_key: 'core.admin.permission_registry.sync', permission_name: 'Sync Permission Registry', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'sync', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/rbac/rbacPermissions.ts' },

  { permission_key: 'core.admin.users.view', permission_name: 'View Users', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.users.create', permission_name: 'Create Users', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ACTION', action_code: 'create', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.users.update', permission_name: 'Update Users', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ACTION', action_code: 'update', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.users.disable', permission_name: 'Disable Users', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ACTION', action_code: 'disable', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.users.manage_roles', permission_name: 'Manage User Roles', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage_roles', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.users.manage_assignments', permission_name: 'Manage User Assignments', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage_assignments', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.users.manage_security', permission_name: 'Manage User Security State', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage_security', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: SF },
  { permission_key: 'core.admin.users.manage_delegations', permission_name: 'Manage User Delegations', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage_delegations', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },

  { permission_key: 'core.admin.staff_profiles.view', permission_name: 'View Staff Profiles', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.staff_profiles.manage', permission_name: 'Manage Staff Profiles', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },

  { permission_key: 'core.admin.identity.view', permission_name: 'View Identity Framework', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.identity.manage', permission_name: 'Manage Identity Framework', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: SF },

  { permission_key: 'core.admin.roles.view', permission_name: 'View Roles', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.roles.create', permission_name: 'Create Roles', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ACTION', action_code: 'create', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.roles.update', permission_name: 'Update Roles', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ACTION', action_code: 'update', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.roles.assign_permissions', permission_name: 'Assign Role Permissions', module_code: 'CORE', domain_code: 'SECURITY', permission_scope: 'ADMIN', action_code: 'assign_permissions', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: SF },

  { permission_key: 'core.admin.offices.view', permission_name: 'View Offices', module_code: 'CORE', domain_code: 'ORGANIZATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.offices.manage', permission_name: 'Manage Offices', module_code: 'CORE', domain_code: 'ORGANIZATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.departments.view', permission_name: 'View Departments', module_code: 'CORE', domain_code: 'ORGANIZATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.departments.manage', permission_name: 'Manage Departments', module_code: 'CORE', domain_code: 'ORGANIZATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.designations.view', permission_name: 'View Designations', module_code: 'CORE', domain_code: 'ORGANIZATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.designations.manage', permission_name: 'Manage Designations', module_code: 'CORE', domain_code: 'ORGANIZATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },

  { permission_key: 'core.admin.organization.view', permission_name: 'View Organization', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.organization.manage', permission_name: 'Manage Organization', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.organization_profile.view', permission_name: 'View Organization Profile', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.organization_profile.manage', permission_name: 'Manage Organization Profile', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.locations.view', permission_name: 'View Office Locations', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.locations.manage', permission_name: 'Manage Office Locations', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.calendar.view', permission_name: 'View Calendar & Holidays', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.calendar.manage', permission_name: 'Manage Calendar & Holidays', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },


  { permission_key: 'core.admin.master_data.view', permission_name: 'View Master Data', module_code: 'CORE', domain_code: 'REFERENCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.master_data.manage', permission_name: 'Manage Master Data', module_code: 'CORE', domain_code: 'REFERENCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'HIGH', source_file: SF },

  { permission_key: 'core.admin.audit.view', permission_name: 'View Audit Log', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/audit/auditPermissions.ts' },
  { permission_key: 'core.admin.audit.manage_event_types', permission_name: 'Manage Audit Event Types', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'HIGH', source_file: 'src/platform/audit/auditPermissions.ts' },
  { permission_key: 'core.admin.audit.manage_policies', permission_name: 'Manage Audit Policies', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/audit/auditPermissions.ts' },
  { permission_key: 'core.admin.audit.export', permission_name: 'Export Audit Log', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ACTION', action_code: 'export', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/audit/auditPermissions.ts' },
  { permission_key: 'core.admin.audit.view_sensitive', permission_name: 'View Sensitive Audit Details', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ACTION', action_code: 'view', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/audit/auditPermissions.ts' },
  { permission_key: 'core.admin.system_logs.view', permission_name: 'View System Logs', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },

  // ===== Epic 9: Workflow Core Engine =====
  { permission_key: 'core.admin.workflow.view', permission_name: 'View Workflows', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.admin.workflow.manage_definitions', permission_name: 'Manage Workflow Definitions', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.admin.workflow.manage_steps', permission_name: 'Manage Workflow Steps', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.admin.workflow.manage_transitions', permission_name: 'Manage Workflow Transitions', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.admin.workflow.manage_rules', permission_name: 'Manage Workflow Rules', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.admin.workflow.activate', permission_name: 'Activate Workflow', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ADMIN', action_code: 'activate', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.admin.workflow.retire', permission_name: 'Retire Workflow', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ADMIN', action_code: 'retire', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.inbox.view', permission_name: 'View Workflow Inbox', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, risk_level: 'LOW', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.claim', permission_name: 'Claim Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'claim', is_platform_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.complete', permission_name: 'Complete Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'complete', is_platform_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.approve', permission_name: 'Approve Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'approve', is_platform_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.reject', permission_name: 'Reject Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'reject', is_platform_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.return', permission_name: 'Return Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'return', is_platform_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.reassign', permission_name: 'Reassign Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'reassign', is_platform_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.delegate', permission_name: 'Delegate Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'delegate', is_platform_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.escalate', permission_name: 'Escalate Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'escalate', is_platform_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.withdraw', permission_name: 'Withdraw Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'withdraw', is_platform_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.task.cancel', permission_name: 'Cancel Workflow Task', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'ACTION', action_code: 'cancel', is_platform_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/workflow/workflowPermissions.ts' },
  { permission_key: 'core.workflow.audit.view', permission_name: 'View Workflow Audit History', module_code: 'CORE', domain_code: 'OPERATIONS', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/workflow/workflowPermissions.ts' },

  // ===== Epic 10: PowerBuilder Migration Control Centre =====
  { permission_key: 'core.admin.migration.view', permission_name: 'View Migration Control Centre', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_plans', permission_name: 'Manage Migration Plans', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_batches', permission_name: 'Manage Migration Batches', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_runs', permission_name: 'Manage Migration Runs', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_validation_rules', permission_name: 'Manage Validation Rules', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_reconciliation', permission_name: 'Manage Reconciliation', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_issues', permission_name: 'Manage Migration Issues', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.manage_cutover', permission_name: 'Manage Cutover Readiness', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.approve', permission_name: 'Approve Migration Actions', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ADMIN', action_code: 'approve', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.export', permission_name: 'Export Migration Data', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ACTION', action_code: 'export', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/migration/migrationPermissions.ts' },
  { permission_key: 'core.admin.migration.view_sensitive', permission_name: 'View Sensitive Migration Data', module_code: 'MIG', domain_code: 'MIGRATION', permission_scope: 'ACTION', action_code: 'view', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/migration/migrationPermissions.ts' },

  // ===== Epic 11: Platform Service Catalogue =====
  { permission_key: 'core.admin.platform_services.view', permission_name: 'View Platform Service Catalogue', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.manage', permission_name: 'Manage Platform Services', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.manage_contracts', permission_name: 'Manage Service Contracts', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.manage_consumers', permission_name: 'Manage Service Consumers', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.manage_checklists', permission_name: 'Manage Module Checklists', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.assess_modules', permission_name: 'Assess Modules', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'assess', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.waive_checklist', permission_name: 'Waive Checklist Items', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'waive', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/platform-services/permissions.ts' },
  { permission_key: 'core.admin.platform_services.export', permission_name: 'Export Platform Services', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ACTION', action_code: 'export', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/platform-services/permissions.ts' },

  // ===== Epic 12: Release Readiness Dashboard =====
  { permission_key: 'core.admin.release_readiness.view', permission_name: 'View Release Readiness Dashboard', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: 'src/platform/release-readiness/permissions.ts' },
  { permission_key: 'core.admin.release_readiness.run_checks', permission_name: 'Run Release Readiness Checks', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ACTION', action_code: 'execute', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/release-readiness/permissions.ts' },
  { permission_key: 'core.admin.release_readiness.attest', permission_name: 'Attest Release Readiness Check', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ACTION', action_code: 'attest', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/release-readiness/permissions.ts' },
  { permission_key: 'core.admin.release_readiness.override', permission_name: 'Override Release Readiness Check', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'override', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/release-readiness/permissions.ts' },
  { permission_key: 'core.admin.release_readiness.export', permission_name: 'Export Release Readiness Report', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ACTION', action_code: 'export', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: 'src/platform/release-readiness/permissions.ts' },
  { permission_key: 'core.admin.release_readiness.manage', permission_name: 'Manage Release Readiness Configuration', module_code: 'CORE', domain_code: 'GOVERNANCE', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/release-readiness/permissions.ts' },

  // ===== Business Module Foundation — Employer Registry (Pilot) =====
  { permission_key: 'er.admin.employer_registry.view', permission_name: 'View Employer Registry', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'PAGE', action_code: 'view', is_admin_permission: true, risk_level: 'LOW', source_file: 'src/platform/employer-registry/permissions.ts' },
  { permission_key: 'er.admin.employer_registry.create', permission_name: 'Create Employer (Registry)', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'ACTION', action_code: 'create', is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/employer-registry/permissions.ts' },
  { permission_key: 'er.admin.employer_registry.update', permission_name: 'Update Employer (Registry)', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'ACTION', action_code: 'update', is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/employer-registry/permissions.ts' },
  { permission_key: 'er.admin.employer_registry.deactivate', permission_name: 'Deactivate Employer (Registry)', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'ACTION', action_code: 'deactivate', is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/employer-registry/permissions.ts' },
  { permission_key: 'er.admin.employer_registry.manage_status', permission_name: 'Manage Employer Status (Registry)', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'ACTION', action_code: 'manage_status', is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: 'src/platform/employer-registry/permissions.ts' },
  { permission_key: 'er.admin.employer_registry.view_sensitive', permission_name: 'View Sensitive Employer Data (Registry)', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'ACTION', action_code: 'view', is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: 'src/platform/employer-registry/permissions.ts' },
  { permission_key: 'er.admin.employer_registry.pilot_access', permission_name: 'Employer Registry Pilot Access', module_code: 'ER', domain_code: 'EMPLOYER', permission_scope: 'PAGE', action_code: 'view', is_admin_permission: true, risk_level: 'LOW', source_file: 'src/platform/employer-registry/permissions.ts' },

  // ===== Epic OM-2: Organisation Management Governance Guardrails =====
  { permission_key: 'core.admin.org.view', permission_name: 'View Organisation Management', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.manage', permission_name: 'Manage Organisation Management', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.export', permission_name: 'Export Org Data', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ACTION', action_code: 'export', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.profile.view', permission_name: 'View Organisation Profile', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.profile.manage', permission_name: 'Manage Organisation Profile', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.locations.view', permission_name: 'View Office Locations', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.locations.manage', permission_name: 'Manage Office Locations', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.departments.view', permission_name: 'View Department Profiles', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.departments.manage', permission_name: 'Manage Department Profiles', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.modules.view', permission_name: 'View Module Profiles', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.modules.manage', permission_name: 'Manage Module Profiles', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.designation_hierarchy.view', permission_name: 'View Designation Hierarchy', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.designation_hierarchy.manage', permission_name: 'Manage Designation Hierarchy', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.assets.view', permission_name: 'View Communication Assets', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.assets.manage', permission_name: 'Manage Communication Assets', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.media.view', permission_name: 'View Media Library', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.media.manage', permission_name: 'Manage Media Library', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.letterheads.view', permission_name: 'View Letterheads', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.letterheads.manage', permission_name: 'Manage Letterheads', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.signatures.view', permission_name: 'View Signatures', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.signatures.manage', permission_name: 'Manage Signatures', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.headers_footers.view', permission_name: 'View Headers & Footers', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.headers_footers.manage', permission_name: 'Manage Headers & Footers', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.disclaimers.view', permission_name: 'View Disclaimers', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.disclaimers.manage', permission_name: 'Manage Disclaimers', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.portal_branding.view', permission_name: 'View Portal Branding', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.portal_branding.manage', permission_name: 'Manage Portal Branding', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.document_assets.view', permission_name: 'View Document Assets', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.document_assets.manage', permission_name: 'Manage Document Assets', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.asset_categories.view', permission_name: 'View Asset Categories', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.asset_categories.manage', permission_name: 'Manage Asset Categories', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.templates.view', permission_name: 'View Templates', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.templates.manage', permission_name: 'Manage Templates', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.notification_templates.view', permission_name: 'View Notification Templates', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.notification_templates.manage', permission_name: 'Manage Notification Templates', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.text_blocks.view', permission_name: 'View Text Blocks', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.text_blocks.manage', permission_name: 'Manage Text Blocks', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.tokens.view', permission_name: 'View Template Tokens', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.tokens.manage', permission_name: 'Manage Template Tokens', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.org.channels.view', permission_name: 'View Template Channels', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.channels.manage', permission_name: 'Manage Template Channels', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.languages.view', permission_name: 'View Languages', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.languages.manage', permission_name: 'Manage Languages', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.configuration.view', permission_name: 'View Configuration Center', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.configuration.manage', permission_name: 'Manage Configuration Center', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ADMIN', action_code: 'manage', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'CRITICAL', source_file: SF },
  { permission_key: 'core.admin.org.validation.view', permission_name: 'View Org Validation', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.validation.run', permission_name: 'Run Org Validation', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'ACTION', action_code: 'execute', is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.org.impact.view', permission_name: 'View Impact Analysis', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
  { permission_key: 'core.admin.org.broken_references.view', permission_name: 'View Broken References', module_code: 'CORE', domain_code: 'ORGANISATION', permission_scope: 'PAGE', action_code: 'view', is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW', source_file: SF },
];

// Epic OM-9.7.5 — Brand Asset Governance permissions.
CORE_PERMISSION_DEFINITIONS.push(
  { permission_key: 'core.admin.template_management.view',                    permission_name: 'View Template Management',           module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'PAGE',  action_code: 'view',    is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW',    source_file: SF },
  { permission_key: 'core.admin.template_management.manage_assets',           permission_name: 'Manage Brand Assets',                 module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.template_management.approve_assets',          permission_name: 'Approve Brand Assets',                module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'approve', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.template_management.archive_assets',          permission_name: 'Archive Brand Assets',                module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'archive', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.template_management.manage_asset_categories', permission_name: 'Manage Asset Categories',            module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.manage_letterheads',      permission_name: 'Manage Letterheads',                  module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.template_management.manage_portal_branding',  permission_name: 'Manage Portal Branding',              module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.manage_email_branding',   permission_name: 'Manage Email Branding',               module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.manage_assignments',      permission_name: 'Manage Brand Asset Assignments',      module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
  { permission_key: 'core.admin.template_management.view_asset_health',       permission_name: 'View Brand Asset Health',             module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'PAGE',  action_code: 'view',    is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW',    source_file: SF },
  { permission_key: 'core.admin.template_management.export_asset_usage',      permission_name: 'Export Brand Asset Usage',            module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'export',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.use_unapproved_asset',    permission_name: 'Use Unapproved Brand Asset (override)', module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'override', is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH', source_file: SF },
);

// Epic OM-9.7.6 — Communication Template Governance permissions.
CORE_PERMISSION_DEFINITIONS.push(
  { permission_key: 'core.admin.template_management.manage_templates',              permission_name: 'Manage Document Templates',           module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH',   source_file: SF },
  { permission_key: 'core.admin.template_management.manage_notification_templates', permission_name: 'Manage Notification Templates',       module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH',   source_file: SF },
  { permission_key: 'core.admin.template_management.manage_text_blocks',            permission_name: 'Manage Text Blocks',                  module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.manage_tokens',                 permission_name: 'Manage Communication Tokens',         module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'manage',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.view_render_health',            permission_name: 'View Communication Template Health',  module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'PAGE',  action_code: 'view',    is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW',    source_file: SF },
  { permission_key: 'core.admin.template_management.run_render_health',             permission_name: 'Run Communication Template Health',   module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'run',     is_platform_permission: true, is_admin_permission: true, risk_level: 'LOW',    source_file: SF },
  { permission_key: 'core.admin.template_management.export_render_health',          permission_name: 'Export Communication Template Health',module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'export',  is_platform_permission: true, is_admin_permission: true, risk_level: 'MEDIUM', source_file: SF },
  { permission_key: 'core.admin.template_management.seed_system_templates',         permission_name: 'Seed System Communication Templates', module_code: 'CORE', domain_code: 'COMMUNICATION', permission_scope: 'ADMIN', action_code: 'seed',    is_platform_permission: true, is_admin_permission: true, is_sensitive_permission: true, risk_level: 'HIGH',   source_file: SF },
);


