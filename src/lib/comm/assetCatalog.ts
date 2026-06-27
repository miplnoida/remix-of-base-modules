import type { CommAssetCategory } from "@/hooks/comm/useMediaAssets";

export type AssetGroup = "Branding" | "Documents" | "Email" | "Portal" | "Mobile" | "Other";

export interface AssetCategoryDef {
  value: CommAssetCategory;
  label: string;
  group: AssetGroup;
  /** One-line purpose shown under the title. */
  description: string;
  /** Where in the system this asset is consumed. */
  usedIn: string[];
  /** Recommended pixel dimensions. */
  recommendedSize: string;
  /** Accepted MIME / extensions (also drives the file picker accept attribute). */
  accept: string;
  /** Hard cap shown to the user (informational). */
  maxFileSizeKb: number;
  /** Whether the slot is conceptually a single image vs. a wider asset (e.g. background). */
  aspect: "square" | "wide" | "tall" | "any";
  /** Extra do/don't tips. */
  tips: string[];
}

export const ASSET_CATALOG: AssetCategoryDef[] = [
  // ---- Branding ----
  {
    value: "logo", label: "Primary Logo", group: "Branding",
    description: "The main organisation logo used on documents, the app header, and PDFs.",
    usedIn: ["Letterheads", "PDF cover pages", "Login screen", "App top bar"],
    recommendedSize: "512 × 512 px (transparent PNG/SVG)",
    accept: "image/png,image/svg+xml,image/webp",
    maxFileSizeKb: 500, aspect: "square",
    tips: ["Use a transparent background.", "SVG is preferred for crispness."],
  },
  {
    value: "logo_small", label: "Compact Logo / Icon Mark", group: "Branding",
    description: "Square mark used where the full logo will not fit (mobile, sidebars, social previews).",
    usedIn: ["Sidebar collapsed state", "Mobile header", "Social OG image fallback"],
    recommendedSize: "128 × 128 px",
    accept: "image/png,image/svg+xml,image/webp",
    maxFileSizeKb: 200, aspect: "square",
    tips: ["Avoid text — only the mark.", "Must be legible at 32 px."],
  },
  {
    value: "favicon", label: "Browser Favicon", group: "Branding",
    description: "Tab icon shown by web browsers and bookmarks.",
    usedIn: ["Browser tab", "Bookmarks", "PWA install"],
    recommendedSize: "32 × 32 px or 64 × 64 px (.ico or PNG)",
    accept: "image/x-icon,image/png,image/svg+xml",
    maxFileSizeKb: 100, aspect: "square",
    tips: ["Provide a square asset — no padding.", ".ico supports multiple sizes."],
  },

  // ---- Documents ----
  {
    value: "letterhead_header", label: "Letterhead — Header Band", group: "Documents",
    description: "Top band printed on every official letter and PDF report.",
    usedIn: ["Generated letters", "Audit reports", "Legal notices", "Compliance correspondence"],
    recommendedSize: "1600 × 280 px (≈ A4 width at 200 DPI)",
    accept: "image/png,image/jpeg,image/svg+xml",
    maxFileSizeKb: 800, aspect: "wide",
    tips: ["Include logo, organisation name and address line.", "Leave 20 px safe area on each side."],
  },
  {
    value: "letterhead_footer", label: "Letterhead — Footer Band", group: "Documents",
    description: "Footer band with statutory contact details printed on every letter.",
    usedIn: ["Generated letters", "Receipts", "Statements"],
    recommendedSize: "1600 × 180 px",
    accept: "image/png,image/jpeg,image/svg+xml",
    maxFileSizeKb: 800, aspect: "wide",
    tips: ["Avoid overlapping with page numbers (last 40 px)."],
  },
  {
    value: "signature", label: "Authorised Signature", group: "Documents",
    description: "Scanned signature applied to approved documents and certificates.",
    usedIn: ["Certificates", "Approval letters", "Cheques"],
    recommendedSize: "400 × 120 px (transparent PNG)",
    accept: "image/png,image/svg+xml",
    maxFileSizeKb: 200, aspect: "wide",
    tips: ["Scan at 300 DPI, then remove background.", "Restrict access — requires approval."],
  },
  {
    value: "stamp", label: "Office Stamp", group: "Documents",
    description: "Round/rectangular office stamp overlaid on issued documents.",
    usedIn: ["Receipts", "Certified copies", "Approved letters"],
    recommendedSize: "300 × 300 px (transparent PNG)",
    accept: "image/png,image/svg+xml",
    maxFileSizeKb: 200, aspect: "square",
    tips: ["Transparent background only.", "Use semi-transparent ink for realism."],
  },
  {
    value: "seal", label: "Official Seal", group: "Documents",
    description: "Statutory seal used on legal and binding documents.",
    usedIn: ["Legal notices", "Court referrals", "Binding agreements"],
    recommendedSize: "400 × 400 px (transparent PNG)",
    accept: "image/png,image/svg+xml",
    maxFileSizeKb: 300, aspect: "square",
    tips: ["High contrast; will print in black & white.", "Requires Director-level approval."],
  },
  {
    value: "qr_code", label: "Reference QR Code", group: "Documents",
    description: "QR code embedded on receipts and certificates for verification.",
    usedIn: ["Receipts", "Certificates", "Public verification pages"],
    recommendedSize: "300 × 300 px",
    accept: "image/png,image/svg+xml",
    maxFileSizeKb: 100, aspect: "square",
    tips: ["Most modules generate QR dynamically — only override here if you have a static fallback."],
  },
  {
    value: "watermark", label: "Document Watermark", group: "Documents",
    description: "Faint background mark printed behind document body (DRAFT, COPY, ORIGINAL…).",
    usedIn: ["Draft PDFs", "Internal copies"],
    recommendedSize: "1200 × 1200 px (transparent PNG, low opacity)",
    accept: "image/png,image/svg+xml",
    maxFileSizeKb: 400, aspect: "square",
    tips: ["Use ~15% opacity grey.", "Centered behind text."],
  },
  {
    value: "certificate_background", label: "Certificate Background", group: "Documents",
    description: "Full-page decorative background used by certificates of registration / completion.",
    usedIn: ["Registration certificates", "Compliance certificates"],
    recommendedSize: "2480 × 3508 px (A4 portrait, 300 DPI)",
    accept: "image/png,image/jpeg",
    maxFileSizeKb: 2000, aspect: "tall",
    tips: ["Keep the centre area lightly textured — text is overlaid there."],
  },

  // ---- Email ----
  {
    value: "email_header", label: "Email Header Banner", group: "Email",
    description: "Banner image at the top of every transactional and notification email.",
    usedIn: ["Notification emails", "Statement emails", "Payment receipts"],
    recommendedSize: "1200 × 240 px",
    accept: "image/png,image/jpeg",
    maxFileSizeKb: 300, aspect: "wide",
    tips: ["Optimise for mobile width (375 px).", "Do not embed important text — many clients block images."],
  },
  {
    value: "email_footer", label: "Email Footer Banner", group: "Email",
    description: "Footer block in emails with contact details and unsubscribe area.",
    usedIn: ["All outbound emails"],
    recommendedSize: "1200 × 180 px",
    accept: "image/png,image/jpeg",
    maxFileSizeKb: 300, aspect: "wide",
    tips: ["Leave space for the unsubscribe link injected by the mailer."],
  },

  // ---- Portal ----
  {
    value: "login_logo", label: "Login Page Logo", group: "Portal",
    description: "Logo shown on the public sign-in screen.",
    usedIn: ["Sign-in page", "Password reset"],
    recommendedSize: "320 × 120 px",
    accept: "image/png,image/svg+xml,image/webp",
    maxFileSizeKb: 200, aspect: "wide",
    tips: ["Use the colour variant of the logo."],
  },
  {
    value: "login_background", label: "Login Background", group: "Portal",
    description: "Backdrop image behind the sign-in form.",
    usedIn: ["Sign-in page"],
    recommendedSize: "1920 × 1080 px",
    accept: "image/jpeg,image/webp",
    maxFileSizeKb: 800, aspect: "wide",
    tips: ["Pick a low-contrast image so the form remains readable.", "JPG/WebP — avoid PNG to keep size low."],
  },
  {
    value: "dashboard_banner", label: "Public Portal Banner", group: "Portal",
    description: "Banner on the public landing portal.",
    usedIn: ["Public portal home"],
    recommendedSize: "1920 × 480 px",
    accept: "image/jpeg,image/webp,image/png",
    maxFileSizeKb: 800, aspect: "wide",
    tips: ["Avoid placing key text near the edges — crops on small screens."],
  },
  {
    value: "announcement_banner", label: "Member Portal Banner", group: "Portal",
    description: "Banner shown to authenticated members.",
    usedIn: ["Member portal home"],
    recommendedSize: "1600 × 400 px",
    accept: "image/jpeg,image/webp,image/png",
    maxFileSizeKb: 700, aspect: "wide",
    tips: ["Rotate periodically with effective-from/to dates."],
  },
  {
    value: "maintenance_banner", label: "Employer Portal Banner", group: "Portal",
    description: "Banner shown to authenticated employers.",
    usedIn: ["Employer portal home"],
    recommendedSize: "1600 × 400 px",
    accept: "image/jpeg,image/webp,image/png",
    maxFileSizeKb: 700, aspect: "wide",
    tips: ["Use for filing-deadline reminders and policy notices."],
  },

  // ---- Mobile ----
  {
    value: "app_icon", label: "Mobile App Icon", group: "Mobile",
    description: "Launcher icon for the iOS/Android app.",
    usedIn: ["iOS home screen", "Android launcher"],
    recommendedSize: "1024 × 1024 px (square, no transparency)",
    accept: "image/png",
    maxFileSizeKb: 500, aspect: "square",
    tips: ["No transparency — fully opaque PNG.", "Avoid thin lines, they get clipped by the OS mask."],
  },
  {
    value: "app_splash", label: "Mobile App Splash", group: "Mobile",
    description: "Splash screen shown while the app loads.",
    usedIn: ["App cold-start"],
    recommendedSize: "1242 × 2688 px (portrait)",
    accept: "image/png,image/jpeg",
    maxFileSizeKb: 1500, aspect: "tall",
    tips: ["Keep critical content in the safe area (centre 60%)."],
  },

  // ---- Other ----
  {
    value: "other", label: "Other", group: "Other",
    description: "Anything that doesn't fit the categories above.",
    usedIn: ["Ad-hoc / one-off uses"],
    recommendedSize: "—",
    accept: "image/*,.pdf,.svg,.webp",
    maxFileSizeKb: 2000, aspect: "any",
    tips: ["Always set a clear name and remarks so others can discover it."],
  },
];

export const GROUP_DEFS: { name: AssetGroup | "All"; description: string }[] = [
  { name: "All",        description: "Every asset across all touch-points." },
  { name: "Branding",   description: "Core organisation identity — primary logo, icon, favicon." },
  { name: "Documents",  description: "Letterheads, signatures, stamps and seals used on official PDFs." },
  { name: "Email",      description: "Banners used inside outgoing notification and statement emails." },
  { name: "Portal",     description: "Imagery shown on the public, member and employer web portals." },
  { name: "Mobile",     description: "App icon and splash for the mobile app." },
  { name: "Other",      description: "Ad-hoc assets that don't fit the catalogued slots." },
];

export const CATALOG_BY_KEY: Record<CommAssetCategory, AssetCategoryDef> = Object.fromEntries(
  ASSET_CATALOG.map((c) => [c.value, c]),
) as Record<CommAssetCategory, AssetCategoryDef>;

export function getCategoryDef(category: CommAssetCategory | undefined | null): AssetCategoryDef | null {
  if (!category) return null;
  return CATALOG_BY_KEY[category] ?? null;
}
