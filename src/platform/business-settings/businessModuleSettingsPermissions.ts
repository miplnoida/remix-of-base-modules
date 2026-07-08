/**
 * Epic BM-SET-1 — Permission constants for the Business Module Settings
 * consumption layer. No admin UI ships in this epic; these constants live in
 * source so downstream admin work can seed them into `core_permission_registry`.
 */
export const BUSINESS_MODULE_SETTINGS_PERMISSIONS = {
  view: 'core.admin.business_settings.view',
  manageRequirements: 'core.admin.business_settings.manage_requirements',
  runReadiness: 'core.admin.business_settings.run_readiness',
  export: 'core.admin.business_settings.export',
} as const;

export type BusinessModuleSettingsPermission =
  (typeof BUSINESS_MODULE_SETTINGS_PERMISSIONS)[keyof typeof BUSINESS_MODULE_SETTINGS_PERMISSIONS];
