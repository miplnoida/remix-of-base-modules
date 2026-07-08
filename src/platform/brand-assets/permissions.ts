/**
 * Epic OM-9.7.5 — Brand Asset Governance permission keys.
 * Registered in core.permissions.ts under `admin.templateManagement`.
 */
export const BRAND_ASSET_PERMISSIONS = {
  view:                    'core.admin.template_management.view',
  manageAssets:            'core.admin.template_management.manage_assets',
  approveAssets:           'core.admin.template_management.approve_assets',
  archiveAssets:           'core.admin.template_management.archive_assets',
  manageAssetCategories:   'core.admin.template_management.manage_asset_categories',
  manageLetterheads:       'core.admin.template_management.manage_letterheads',
  managePortalBranding:    'core.admin.template_management.manage_portal_branding',
  manageEmailBranding:     'core.admin.template_management.manage_email_branding',
  manageAssignments:       'core.admin.template_management.manage_assignments',
  viewAssetHealth:         'core.admin.template_management.view_asset_health',
  exportAssetUsage:        'core.admin.template_management.export_asset_usage',
  useUnapprovedAsset:      'core.admin.template_management.use_unapproved_asset',
} as const;

export type BrandAssetPermissionKey = (typeof BRAND_ASSET_PERMISSIONS)[keyof typeof BRAND_ASSET_PERMISSIONS];
