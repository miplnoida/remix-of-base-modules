// Derived asset specifications — drives auto-generation from one master SSB logo.
// Each spec defines slot, output dimensions, transform, and (optional) category mapping
// so the existing assetResolver fallbacks keep working.

import type { CommAssetCategory } from "@/hooks/comm/useMediaAssets";

export type DerivedTransform =
  | "passthrough"          // resize only, keep colours/alpha
  | "transparent"          // attempt white-background removal
  | "monochrome"           // desaturate
  | "white_on_dark"        // invert luminance / tint white (dark mode logo)
  | "black_on_light"       // tint dark (light mode logo)
  | "square_pad"           // centre on transparent square with safe padding
  | "low_opacity"          // watermark: low alpha
  | "qr_center";           // small transparent square for QR centre

export interface DerivedAssetSpec {
  slot: string;            // SSB_LOGO_MAIN, etc.
  name: string;
  group: "Logo Variants" | "System Icons" | "Document Assets" | "Portal Assets";
  category: CommAssetCategory;   // legacy fallback category
  width: number;
  height: number;
  transform: DerivedTransform;
  padding?: number;        // px safe padding for square_pad
  opacity?: number;        // for low_opacity (0–1)
  description: string;
}

export const SSB_MASTER_SLOT = "SSB_OFFICIAL_LOGO_MASTER";

export const DERIVED_ASSET_SPECS: DerivedAssetSpec[] = [
  // Logo variants
  { slot: "SSB_LOGO_MAIN",        name: "SSB Main Logo",        group: "Logo Variants", category: "logo",        width: 800,  height: 800,  transform: "passthrough", description: "Primary brand logo, used across the app header and documents." },
  { slot: "SSB_LOGO_SMALL",       name: "SSB Small Logo",       group: "Logo Variants", category: "logo_small",  width: 256,  height: 256,  transform: "passthrough", description: "Compact logo for tight UI areas, lists, and inline references." },
  { slot: "SSB_LOGO_TRANSPARENT", name: "SSB Transparent Logo", group: "Logo Variants", category: "logo",        width: 800,  height: 800,  transform: "transparent", description: "Logo with white background removed for overlay use." },
  { slot: "SSB_LOGO_MONOCHROME",  name: "SSB Monochrome Logo",  group: "Logo Variants", category: "logo",        width: 800,  height: 800,  transform: "monochrome",  description: "Grayscale variant for print and single-colour contexts." },
  { slot: "SSB_LOGO_DARK_MODE",   name: "SSB Dark-Mode Logo",   group: "Logo Variants", category: "logo",        width: 800,  height: 800,  transform: "white_on_dark", description: "White-tinted variant for dark backgrounds." },
  { slot: "SSB_LOGO_LIGHT_MODE",  name: "SSB Light-Mode Logo",  group: "Logo Variants", category: "logo",        width: 800,  height: 800,  transform: "black_on_light", description: "Standard variant for light backgrounds." },

  // System icons
  { slot: "SSB_FAVICON",            name: "SSB Favicon",            group: "System Icons", category: "favicon",  width: 64,   height: 64,   transform: "square_pad", padding: 4,  description: "Browser tab icon." },
  { slot: "SSB_MOBILE_APP_ICON",    name: "SSB Mobile App Icon",    group: "System Icons", category: "app_icon", width: 1024, height: 1024, transform: "square_pad", padding: 96, description: "Mobile app launcher icon with safe padding." },
  { slot: "SSB_PWA_ICON",           name: "SSB PWA Icon",           group: "System Icons", category: "app_icon", width: 512,  height: 512,  transform: "square_pad", padding: 48, description: "Progressive Web App install icon." },
  { slot: "SSB_NOTIFICATION_ICON",  name: "SSB Notification Icon",  group: "System Icons", category: "app_icon", width: 96,   height: 96,   transform: "monochrome", description: "Monochrome notification badge icon." },
  { slot: "SSB_MOBILE_SPLASH_LOGO", name: "SSB Mobile Splash Logo", group: "System Icons", category: "app_splash", width: 1024, height: 1024, transform: "square_pad", padding: 256, description: "Splash screen logo for mobile launch." },
  { slot: "SSB_LOGIN_PAGE_LOGO",    name: "SSB Login Page Logo",    group: "System Icons", category: "login_logo", width: 480, height: 480, transform: "passthrough", description: "Login screen branding." },

  // Document assets
  { slot: "SSB_LETTERHEAD_LOGO",     name: "SSB Letterhead Logo",     group: "Document Assets", category: "letterhead_header", width: 600,  height: 600,  transform: "passthrough", description: "Print-safe logo for letterheads." },
  { slot: "SSB_EMAIL_HEADER_LOGO",   name: "SSB Email Header Logo",   group: "Document Assets", category: "email_header",      width: 600,  height: 200,  transform: "passthrough", description: "Web-safe logo for email headers." },
  { slot: "SSB_EMAIL_FOOTER_LOGO",   name: "SSB Email Footer Logo",   group: "Document Assets", category: "email_footer",      width: 300,  height: 100,  transform: "passthrough", description: "Logo for email footer area." },
  { slot: "SSB_WATERMARK_LIGHT",     name: "SSB Light Watermark",     group: "Document Assets", category: "watermark",         width: 1200, height: 1200, transform: "low_opacity",   opacity: 0.08, description: "Low-opacity watermark for documents." },
  { slot: "SSB_WATERMARK_CENTER",    name: "SSB Centre Watermark",    group: "Document Assets", category: "watermark",         width: 800,  height: 800,  transform: "low_opacity",   opacity: 0.12, description: "Centre-page watermark for sensitive prints." },
  { slot: "SSB_QR_CENTER_LOGO",      name: "SSB QR Centre Logo",      group: "Document Assets", category: "qr_code",           width: 120,  height: 120,  transform: "qr_center",     description: "Logo overlaid in QR code centre with transparent margin." },
  { slot: "SSB_CERTIFICATE_WATERMARK", name: "SSB Certificate Watermark", group: "Document Assets", category: "certificate_background", width: 1500, height: 1500, transform: "low_opacity", opacity: 0.10, description: "Faint watermark for certificates." },

  // Portal assets
  { slot: "SSB_PUBLIC_PORTAL_BANNER_LOGO",   name: "Public Portal Banner",   group: "Portal Assets", category: "dashboard_banner", width: 1600, height: 320, transform: "passthrough", description: "Public website portal banner logo." },
  { slot: "SSB_MEMBER_PORTAL_BANNER_LOGO",   name: "Member Portal Banner",   group: "Portal Assets", category: "dashboard_banner", width: 1600, height: 320, transform: "passthrough", description: "Insured-person portal banner." },
  { slot: "SSB_EMPLOYER_PORTAL_BANNER_LOGO", name: "Employer Portal Banner", group: "Portal Assets", category: "dashboard_banner", width: 1600, height: 320, transform: "passthrough", description: "Employer portal banner." },
  { slot: "SSB_DASHBOARD_HEADER_LOGO",       name: "Dashboard Header Logo",  group: "Portal Assets", category: "logo_small",       width: 320,  height: 80,  transform: "passthrough", description: "Logo in admin dashboard top bar." },
  { slot: "SSB_SIDEBAR_LOGO",                name: "Sidebar Logo",           group: "Portal Assets", category: "logo_small",       width: 200,  height: 60,  transform: "passthrough", description: "Logo for collapsed/expanded sidebar." },
];

// Maps an organization branding column to the slot that should populate it.
export const ORG_DEFAULT_SLOT_MAP = {
  default_logo_asset_id:            "SSB_LOGO_MAIN",
  default_small_logo_asset_id:      "SSB_LOGO_SMALL",
  default_favicon_asset_id:         "SSB_FAVICON",
  default_letterhead_logo_asset_id: "SSB_LETTERHEAD_LOGO",
  default_email_header_asset_id:    "SSB_EMAIL_HEADER_LOGO",
  default_watermark_asset_id:       "SSB_WATERMARK_LIGHT",
  default_qr_logo_asset_id:         "SSB_QR_CENTER_LOGO",
} as const;
