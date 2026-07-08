/**
 * Epic OM-9.7.5 — Brand Asset Governance
 *
 * Canonical list of "official" media asset categories. Assets uploaded into
 * one of these categories represent the organisation's visual identity and
 * must be approved before being consumed by letterheads, templates, portal
 * branding, emails, notifications, or business-module output.
 */
export const OFFICIAL_ASSET_CATEGORIES = [
  'logo',
  'logo_small',
  'favicon',
  'letterhead_header',
  'letterhead_footer',
  'signature',
  'stamp',
  'seal',
  'watermark',
  'certificate_background',
  'email_header',
  'email_footer',
  'login_logo',
  'login_background',
  'dashboard_banner',
  'announcement_banner',
  'maintenance_banner',
  'app_icon',
  'app_splash',
] as const;

export type OfficialAssetCategory = (typeof OFFICIAL_ASSET_CATEGORIES)[number];

export function isOfficialCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return (OFFICIAL_ASSET_CATEGORIES as readonly string[]).includes(category);
}

/** Asset slot codes governed by comm_asset_assignment / core_configuration_assignment. */
export const BRAND_ASSET_SLOTS = [
  'PRIMARY_LOGO',
  'SECONDARY_LOGO',
  'FAVICON',
  'LETTERHEAD_HEADER',
  'LETTERHEAD_FOOTER',
  'SEAL',
  'STAMP',
  'WATERMARK',
  'EMAIL_HEADER',
  'EMAIL_FOOTER',
  'LOGIN_LOGO',
  'LOGIN_BACKGROUND',
  'PUBLIC_PORTAL_BANNER',
  'MEMBER_PORTAL_BANNER',
  'EMPLOYER_PORTAL_BANNER',
  'MOBILE_APP_ICON',
  'MOBILE_APP_SPLASH',
  'CERTIFICATE_BACKGROUND',
  'DASHBOARD_BANNER',
  'ANNOUNCEMENT_BANNER',
  'MAINTENANCE_BANNER',
] as const;

export type BrandAssetSlot = (typeof BRAND_ASSET_SLOTS)[number];

/** Preferred lifecycle order — sold to the picker as sort ordering. */
export const ASSET_LIFECYCLE_STATES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'archived',
] as const;
export type AssetLifecycleState = (typeof ASSET_LIFECYCLE_STATES)[number];
