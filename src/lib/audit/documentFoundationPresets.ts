/**
 * Document Foundation Presets
 * 
 * 18 professionally designed foundation presets for Document & Output Settings.
 * Each preset defines a complete set of branding colors, typography, and table styles.
 * Page layout, pagination, and draft rules use shared sensible defaults.
 */

import type { DocumentFoundationConfig } from './documentFoundationTypes';

export interface FoundationPresetMeta {
  key: string;
  name: string;
  description: string;
  category: 'professional' | 'government' | 'corporate' | 'modern' | 'classic';
  /** Swatch colors for visual preview [primary, secondary, accent] */
  swatches: [string, string, string];
}

// ─── Shared base (layout, pagination, draft rules) ───

const SHARED_BASE: Pick<DocumentFoundationConfig, 'pageLayout' | 'pagination' | 'draftRules' | 'branding'> = {
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
  draftRules: {
    showWatermark: true,
    watermarkText: 'DRAFT',
    showIssuedStamp: true,
  },
};

const signOff = [
  { label: 'Prepared By', defaultName: '', roleTitle: 'Internal Auditor' },
  { label: 'Reviewed By', defaultName: '', roleTitle: 'Manager, Internal Audit' },
  { label: 'Approved By', defaultName: '', roleTitle: 'Director' },
];

// ════════════════════════════════════════════════════════════════
// 1. SSB INSTITUTIONAL GREEN ★ (Default)
// ════════════════════════════════════════════════════════════════
const SSB_GREEN: DocumentFoundationConfig = {
  ...SHARED_BASE,
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
    h1Size: 18,
    h2Size: 14,
    h3Size: 12,
    headingColor: '#0E5F3A',
    bodyColor: '#1A1A1A',
    lineHeight: 1.5,
    paragraphSpacingBefore: 6,
    paragraphSpacingAfter: 6,
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
  signOff,
};

// 2. AUDIT NAVY
const AUDIT_NAVY: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#1E3A5F',
    secondary: '#4A6D8C',
    accent: '#D5E8F0',
    tableHeader: '#1E3A5F',
    tableStripe: '#F0F4F8',
    text: '#1A1A1A',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    headingFont: 'Arial, Helvetica, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#1E3A5F', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#1E3A5F', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F0F4F8', borderColor: '#D1D5DB',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 3. GOVERNMENT FORMAL
const GOVERNMENT_FORMAL: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#1B2838',
    secondary: '#37474F',
    accent: '#ECEFF1',
    tableHeader: '#1B2838',
    tableStripe: '#F5F5F5',
    text: '#212121',
    gold: '#8D6E37',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Times New Roman, Times, serif',
    headingFont: 'Times New Roman, Times, serif',
    baseFontSize: 12, h1Size: 20, h2Size: 16, h3Size: 13,
    headingColor: '#1B2838', bodyColor: '#212121',
    lineHeight: 1.6, paragraphSpacingBefore: 6, paragraphSpacingAfter: 8,
  },
  tableStyle: {
    headerBackground: '#1B2838', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F5F5F5', borderColor: '#BDBDBD',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 4. CORPORATE CHARCOAL
const CORPORATE_CHARCOAL: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#2C3E50',
    secondary: '#5D6D7E',
    accent: '#EBF0F5',
    tableHeader: '#2C3E50',
    tableStripe: '#F8F9FA',
    text: '#2C3E50',
    gold: '#D4A847',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Calibri, Candara, sans-serif',
    headingFont: 'Calibri, Candara, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#2C3E50', bodyColor: '#2C3E50',
    lineHeight: 1.5, paragraphSpacingBefore: 4, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#2C3E50', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F8F9FA', borderColor: '#D5DBDF',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 5. EXECUTIVE BURGUNDY
const EXECUTIVE_BURGUNDY: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#6B1D2A',
    secondary: '#8B3A4A',
    accent: '#F5E6E9',
    tableHeader: '#6B1D2A',
    tableStripe: '#FDF2F4',
    text: '#1A1A1A',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Georgia, Times New Roman, serif',
    headingFont: 'Georgia, Times New Roman, serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#6B1D2A', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#6B1D2A', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FDF2F4', borderColor: '#D4C0C5',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 6. ROYAL BLUE
const ROYAL_BLUE: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#1A237E',
    secondary: '#3949AB',
    accent: '#E8EAF6',
    tableHeader: '#1A237E',
    tableStripe: '#F3F4FC',
    text: '#1A1A1A',
    gold: '#FFB300',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    headingFont: 'Arial, Helvetica, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#1A237E', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#1A237E', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F3F4FC', borderColor: '#C5CAE9',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 7. FOREST GREEN
const FOREST_GREEN: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#1B5E20',
    secondary: '#388E3C',
    accent: '#E8F5E9',
    tableHeader: '#1B5E20',
    tableStripe: '#F1F8F2',
    text: '#1A1A1A',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Cambria, Georgia, serif',
    headingFont: 'Cambria, Georgia, serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#1B5E20', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#1B5E20', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F1F8F2', borderColor: '#C8E6C9',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 8. SLATE MODERN
const SLATE_MODERN: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#455A64',
    secondary: '#607D8B',
    accent: '#ECEFF1',
    tableHeader: '#455A64',
    tableStripe: '#F5F7F8',
    text: '#263238',
    gold: '#FFA000',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Calibri, Candara, sans-serif',
    headingFont: 'Calibri, Candara, sans-serif',
    baseFontSize: 10, h1Size: 16, h2Size: 13, h3Size: 11,
    headingColor: '#455A64', bodyColor: '#263238',
    lineHeight: 1.4, paragraphSpacingBefore: 4, paragraphSpacingAfter: 4,
  },
  tableStyle: {
    headerBackground: '#455A64', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F5F7F8', borderColor: '#CFD8DC',
    repeatHeaderOnPageBreak: true, fontSize: 'small', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 5,
  },
  signOff,
};

// 9. TEAL PROFESSIONAL
const TEAL_PROFESSIONAL: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#00695C',
    secondary: '#00897B',
    accent: '#E0F2F1',
    tableHeader: '#00695C',
    tableStripe: '#F0FAF8',
    text: '#1A1A1A',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Verdana, Geneva, sans-serif',
    headingFont: 'Verdana, Geneva, sans-serif',
    baseFontSize: 10, h1Size: 16, h2Size: 13, h3Size: 11,
    headingColor: '#00695C', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#00695C', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F0FAF8', borderColor: '#B2DFDB',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 10. OXFORD NAVY & GOLD
const OXFORD_NAVY_GOLD: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#002147',
    secondary: '#1C3D5A',
    accent: '#F5F0E1',
    tableHeader: '#002147',
    tableStripe: '#FAFAF5',
    text: '#1A1A1A',
    gold: '#D4A843',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Garamond, Baskerville, serif',
    headingFont: 'Garamond, Baskerville, serif',
    baseFontSize: 12, h1Size: 20, h2Size: 16, h3Size: 13,
    headingColor: '#002147', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 8,
  },
  tableStyle: {
    headerBackground: '#002147', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FAFAF5', borderColor: '#D1C9B8',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 11. STEEL BLUE
const STEEL_BLUE: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#37474F',
    secondary: '#546E7A',
    accent: '#E3EDF3',
    tableHeader: '#37474F',
    tableStripe: '#F4F7F9',
    text: '#212121',
    gold: '#B8860B',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Segoe UI, Tahoma, sans-serif',
    headingFont: 'Segoe UI, Tahoma, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#37474F', bodyColor: '#212121',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#37474F', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F4F7F9', borderColor: '#CFD8DC',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 12. MIDNIGHT BLACK
const MIDNIGHT_BLACK: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#1A1A2E',
    secondary: '#16213E',
    accent: '#E8E8F0',
    tableHeader: '#1A1A2E',
    tableStripe: '#F5F5F8',
    text: '#1A1A1A',
    gold: '#E6B422',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    headingFont: 'Arial, Helvetica, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#1A1A2E', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#1A1A2E', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F5F5F8', borderColor: '#D0D0D8',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 13. CARIBBEAN TEAL
const CARIBBEAN_TEAL: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#006064',
    secondary: '#00838F',
    accent: '#E0F7FA',
    tableHeader: '#006064',
    tableStripe: '#F0FAFB',
    text: '#1A1A1A',
    gold: '#F4C430',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Calibri, Candara, sans-serif',
    headingFont: 'Calibri, Candara, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#006064', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#006064', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#F0FAFB', borderColor: '#B2EBF2',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 14. CLASSIC BROWN
const CLASSIC_BROWN: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#4E342E',
    secondary: '#6D4C41',
    accent: '#EFEBE9',
    tableHeader: '#4E342E',
    tableStripe: '#FAF6F4',
    text: '#3E2723',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Palatino Linotype, Book Antiqua, serif',
    headingFont: 'Palatino Linotype, Book Antiqua, serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#4E342E', bodyColor: '#3E2723',
    lineHeight: 1.6, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#4E342E', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FAF6F4', borderColor: '#D7CCC8',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 15. PLUM EXECUTIVE
const PLUM_EXECUTIVE: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#4A148C',
    secondary: '#6A1B9A',
    accent: '#F3E5F5',
    tableHeader: '#4A148C',
    tableStripe: '#FAF5FC',
    text: '#1A1A1A',
    gold: '#FFB300',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Georgia, Times New Roman, serif',
    headingFont: 'Georgia, Times New Roman, serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#4A148C', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#4A148C', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FAF5FC', borderColor: '#CE93D8',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 16. AMBER WARM
const AMBER_WARM: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#E65100',
    secondary: '#F57C00',
    accent: '#FFF3E0',
    tableHeader: '#E65100',
    tableStripe: '#FFFAF4',
    text: '#1A1A1A',
    gold: '#F4C430',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Trebuchet MS, Lucida Grande, sans-serif',
    headingFont: 'Trebuchet MS, Lucida Grande, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#E65100', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#E65100', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FFFAF4', borderColor: '#FFCC80',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 17. MONOCHROME CLEAN
const MONOCHROME_CLEAN: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#333333',
    secondary: '#666666',
    accent: '#F0F0F0',
    tableHeader: '#333333',
    tableStripe: '#FAFAFA',
    text: '#1A1A1A',
    gold: '#999999',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    headingFont: 'Arial, Helvetica, sans-serif',
    baseFontSize: 11, h1Size: 18, h2Size: 14, h3Size: 12,
    headingColor: '#333333', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 6,
  },
  tableStyle: {
    headerBackground: '#333333', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FAFAFA', borderColor: '#E0E0E0',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};

// 18. EMERALD & GOLD (SSB Festive)
const EMERALD_GOLD: DocumentFoundationConfig = {
  ...SHARED_BASE,
  colorPalette: {
    primary: '#0E5F3A',
    secondary: '#C4A756',
    accent: '#FDF8E8',
    tableHeader: '#0E5F3A',
    tableStripe: '#FDFCF5',
    text: '#1A1A1A',
    gold: '#C4A756',
    gapAnalysisHeader: '#B71C1C',
  },
  typography: {
    fontFamily: 'Garamond, Baskerville, serif',
    headingFont: 'Garamond, Baskerville, serif',
    baseFontSize: 12, h1Size: 20, h2Size: 16, h3Size: 13,
    headingColor: '#0E5F3A', bodyColor: '#1A1A1A',
    lineHeight: 1.5, paragraphSpacingBefore: 6, paragraphSpacingAfter: 8,
  },
  tableStyle: {
    headerBackground: '#0E5F3A', headerTextColor: '#FFFFFF',
    stripedRows: true, stripeColor: '#FDFCF5', borderColor: '#D4CDB5',
    repeatHeaderOnPageBreak: true, fontSize: 'normal', autoFitMode: 'auto_fit_window',
    boldTotalRows: true, cellPadding: 6,
  },
  signOff,
};


// ─── Preset Registry ───

export const FOUNDATION_PRESETS: Record<string, DocumentFoundationConfig> = {
  ssb_green: SSB_GREEN,
  audit_navy: AUDIT_NAVY,
  government_formal: GOVERNMENT_FORMAL,
  corporate_charcoal: CORPORATE_CHARCOAL,
  executive_burgundy: EXECUTIVE_BURGUNDY,
  royal_blue: ROYAL_BLUE,
  forest_green: FOREST_GREEN,
  slate_modern: SLATE_MODERN,
  teal_professional: TEAL_PROFESSIONAL,
  oxford_navy_gold: OXFORD_NAVY_GOLD,
  steel_blue: STEEL_BLUE,
  midnight_black: MIDNIGHT_BLACK,
  caribbean_teal: CARIBBEAN_TEAL,
  classic_brown: CLASSIC_BROWN,
  plum_executive: PLUM_EXECUTIVE,
  amber_warm: AMBER_WARM,
  monochrome_clean: MONOCHROME_CLEAN,
  emerald_gold: EMERALD_GOLD,
};

export const FOUNDATION_PRESET_METADATA: FoundationPresetMeta[] = [
  { key: 'ssb_green', name: 'SSB Institutional', description: 'Official SSB Green brand identity', category: 'professional', swatches: ['#0E5F3A', '#1A7A4E', '#C4A756'] },
  { key: 'audit_navy', name: 'Audit Navy', description: 'Classic navy blue audit standard', category: 'professional', swatches: ['#1E3A5F', '#4A6D8C', '#C4A756'] },
  { key: 'government_formal', name: 'Government Formal', description: 'Traditional serif for regulatory reports', category: 'government', swatches: ['#1B2838', '#37474F', '#8D6E37'] },
  { key: 'corporate_charcoal', name: 'Corporate Charcoal', description: 'Modern Calibri corporate style', category: 'corporate', swatches: ['#2C3E50', '#5D6D7E', '#D4A847'] },
  { key: 'executive_burgundy', name: 'Executive Burgundy', description: 'Distinguished Georgia serif in burgundy', category: 'classic', swatches: ['#6B1D2A', '#8B3A4A', '#C4A756'] },
  { key: 'royal_blue', name: 'Royal Blue', description: 'Deep indigo for board-level reporting', category: 'corporate', swatches: ['#1A237E', '#3949AB', '#FFB300'] },
  { key: 'forest_green', name: 'Forest Green', description: 'Rich green in Cambria serif', category: 'classic', swatches: ['#1B5E20', '#388E3C', '#C4A756'] },
  { key: 'slate_modern', name: 'Slate Modern', description: 'Compact working-draft style', category: 'modern', swatches: ['#455A64', '#607D8B', '#FFA000'] },
  { key: 'teal_professional', name: 'Teal Professional', description: 'Clean teal in Verdana', category: 'modern', swatches: ['#00695C', '#00897B', '#C4A756'] },
  { key: 'oxford_navy_gold', name: 'Oxford Navy & Gold', description: 'Prestigious Garamond with gold accents', category: 'classic', swatches: ['#002147', '#1C3D5A', '#D4A843'] },
  { key: 'steel_blue', name: 'Steel Blue', description: 'Modern Segoe UI in cool steel tones', category: 'modern', swatches: ['#37474F', '#546E7A', '#B8860B'] },
  { key: 'midnight_black', name: 'Midnight Black', description: 'Authoritative dark palette', category: 'corporate', swatches: ['#1A1A2E', '#16213E', '#E6B422'] },
  { key: 'caribbean_teal', name: 'Caribbean Teal', description: 'Tropical-inspired deep teal', category: 'professional', swatches: ['#006064', '#00838F', '#F4C430'] },
  { key: 'classic_brown', name: 'Classic Brown', description: 'Warm Palatino in earthy brown tones', category: 'classic', swatches: ['#4E342E', '#6D4C41', '#C4A756'] },
  { key: 'plum_executive', name: 'Plum Executive', description: 'Elegant purple for executive reports', category: 'corporate', swatches: ['#4A148C', '#6A1B9A', '#FFB300'] },
  { key: 'amber_warm', name: 'Amber Warm', description: 'Bold warm-toned Trebuchet style', category: 'modern', swatches: ['#E65100', '#F57C00', '#F4C430'] },
  { key: 'monochrome_clean', name: 'Monochrome Clean', description: 'Neutral grayscale for maximum clarity', category: 'modern', swatches: ['#333333', '#666666', '#999999'] },
  { key: 'emerald_gold', name: 'Emerald & Gold', description: 'SSB colors in elegant Garamond serif', category: 'classic', swatches: ['#0E5F3A', '#C4A756', '#FDF8E8'] },
];
