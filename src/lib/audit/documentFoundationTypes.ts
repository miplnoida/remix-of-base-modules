/**
 * Unified Document Foundation Types
 * 
 * Shared settings (branding, typography, page layout, pagination, sign-off, 
 * color palette, table style, draft rules) that ALL audit document types inherit.
 */

// ─── Document Types ───
export type AuditDocumentType = 'audit_report' | 'audit_plan' | 'mgmt_response';

export const DOCUMENT_TYPE_LABELS: Record<AuditDocumentType, string> = {
  audit_report: 'Audit Report',
  audit_plan: 'Internal Audit Plan',
  mgmt_response: 'Management Response Report',
};

// ─── Foundation Branding ───
export interface FoundationBranding {
  showLogo: boolean;
  logoSource: string;
  logoSize: 'small' | 'medium' | 'large';
  logoAlignment: 'left' | 'center' | 'right';
  orgName: string;
  country: string;
  address: string;
  phone: string;
  confidentialLabel: string;
  showWatermark: boolean;
  watermarkText: string;
}

// ─── Foundation Color Palette ───
export interface FoundationColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  tableHeader: string;
  tableStripe: string;
  text: string;
  gold: string;
  /** Header color for gap analysis / warning tables */
  gapAnalysisHeader: string;
}

// ─── Foundation Typography ───
export interface FoundationTypography {
  fontFamily: string;
  headingFont: string;
  baseFontSize: number;
  h1Size: number;
  h2Size: number;
  h3Size: number;
  headingColor: string;
  bodyColor: string;
  lineHeight: number;
  paragraphSpacingBefore: number;
  paragraphSpacingAfter: number;
}

// ─── Foundation Page Layout ───
export interface FoundationPageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FoundationPageLayout {
  pageSize: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: FoundationPageMargins;
}

// ─── Foundation Pagination ───
export interface FoundationPagination {
  showPageNumbers: boolean;
  hideOnCover: boolean;
  position: 'bottom-center' | 'bottom-right' | 'top-right';
  frontMatterStyle: 'roman' | 'arabic' | 'alpha' | 'none';
  bodyStyle: 'arabic' | 'roman';
  appendixStyle: 'roman' | 'arabic' | 'alpha' | 'none';
  pageBreakBetweenSections: boolean;
}

// ─── Foundation Signatory ───
export interface FoundationSignatory {
  label: string;
  defaultName: string;
  roleTitle: string;
}

// ─── Foundation Draft Rules ───
export interface FoundationDraftRules {
  showWatermark: boolean;
  watermarkText: string;
  showIssuedStamp: boolean;
}

// ─── Foundation Table Style ───
export interface FoundationTableStyle {
  headerBackground: string;
  headerTextColor: string;
  stripedRows: boolean;
  stripeColor: string;
  borderColor: string;
  repeatHeaderOnPageBreak: boolean;
  fontSize: 'small' | 'normal';
  autoFitMode: 'fixed' | 'auto_fit_content' | 'auto_fit_window';
  boldTotalRows: boolean;
  cellPadding: number;
}

// ─── Full Foundation Config ───
export interface DocumentFoundationConfig {
  branding: FoundationBranding;
  colorPalette: FoundationColorPalette;
  typography: FoundationTypography;
  pageLayout: FoundationPageLayout;
  pagination: FoundationPagination;
  signOff: FoundationSignatory[];
  draftRules: FoundationDraftRules;
  tableStyle: FoundationTableStyle;
}

// ─── Section Library Entry ───
export interface DocumentSectionEntry {
  id: string;
  section_key: string;
  label: string;
  applies_to: AuditDocumentType[];
  is_shared: boolean;
  default_enabled: boolean;
  default_order: number;
  display_mode: 'narrative' | 'table' | 'auto';
  is_mandatory: boolean;
  category: 'cover' | 'front_matter' | 'body' | 'appendix';
  description: string | null;
  /** Default TOC inclusion — can be overridden per template */
  default_include_in_toc: boolean;
  /** Default page-break behavior — can be overridden per template */
  default_start_on_new_page: boolean;
}

// ─── Defaults ───
export const DEFAULT_FOUNDATION: DocumentFoundationConfig = {
  branding: {
    showLogo: true,
    logoSource: 'default',
    logoSize: 'medium',
    logoAlignment: 'center',
    orgName: 'SOCIAL SECURITY BOARD',
    country: 'ST. KITTS AND NEVIS',
    address: 'Bay Road, P.O. Box 79, Basseterre, St. Kitts',
    phone: '(869) 465-2521',
    confidentialLabel: 'CONFIDENTIAL',
    showWatermark: true,
    watermarkText: 'DRAFT',
  },
  colorPalette: {
    primary: '#0E5F3A',
    secondary: '#1A7A4E',
    accent: '#D4EDDA',
    tableHeader: '#0E5F3A',
    tableStripe: '#F0F8F4',
    text: '#1A1A1A',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    headingFont: 'Arial, Helvetica, sans-serif',
    baseFontSize: 11,
    h1Size: 20,
    h2Size: 14,
    h3Size: 12,
    headingColor: '#0E5F3A',
    bodyColor: '#1A1A1A',
    lineHeight: 1.5,
    paragraphSpacingBefore: 6,
    paragraphSpacingAfter: 8,
  },
  pageLayout: {
    pageSize: 'letter',
    orientation: 'portrait',
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0 },
  },
  pagination: {
    showPageNumbers: true,
    hideOnCover: true,
    position: 'bottom-center',
    frontMatterStyle: 'roman',
    bodyStyle: 'arabic',
    appendixStyle: 'arabic',
    pageBreakBetweenSections: true,
  },
  signOff: [
    { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
    { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
    { label: 'Approved By', defaultName: '', roleTitle: 'Director' },
  ],
  draftRules: {
    showWatermark: true,
    watermarkText: 'DRAFT',
    showIssuedStamp: true,
  },
  tableStyle: {
    headerBackground: '#0E5F3A',
    headerTextColor: '#FFFFFF',
    stripedRows: true,
    stripeColor: '#F0F8F4',
    borderColor: '#C8D6CF',
    repeatHeaderOnPageBreak: true,
    fontSize: 'normal',
    autoFitMode: 'auto_fit_window',
    boldTotalRows: true,
    cellPadding: 6,
  },
};
