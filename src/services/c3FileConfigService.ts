import {
  C3FormatScheme,
  C3ColumnMapping,
  C3ValidationRule,
  C3ContributionMapping,
  C3ImportExportSettings,
  C3GeneralConfig,
  C3FileConfigAuditLog,
} from '@/types/c3FileConfig';

// Mock Data Storage - EC3 Standard Format
let mockFormats: C3FormatScheme[] = [
  {
    formatId: 'FMT_002',
    formatName: 'EC3 Standard File 1.0.0',
    description: 'Standard Electronic C3 file format for St Kitts & Nevis',
    inputType: 'CSV',
    effectiveFrom: '2004-05-04',
    effectiveTo: null,
    isDefault: true,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2004-05-04',
  },
];

// Complete EC3 Column Mappings with all required fields
let mockColumnMappings: C3ColumnMapping[] = [
  // HEADER mappings (5 columns)
  { mappingId: 'COL_H001', formatId: 'FMT_002', rowType: 'HEADER', columnPosition: 1, columnCode: 'HDR_CODE', columnName: 'HDR', displayName: 'Record Type', fieldType: 'String', required: true, unique: false, mapsTo: 'System.RowType', mappingTarget: 'HDR', validationPattern: '^HDR$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_H002', formatId: 'FMT_002', rowType: 'HEADER', columnPosition: 2, columnCode: 'REGNO', columnName: 'REGNO', displayName: 'Employer Registration', fieldType: 'String', required: true, unique: false, mapsTo: 'Employer.RegistrationNumber', mappingTarget: 'RegistrationNumber', validationPattern: '^[0-9]{6}$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_H003', formatId: 'FMT_002', rowType: 'HEADER', columnPosition: 3, columnCode: 'PERIOD', columnName: 'PERIOD', displayName: 'Period Start', fieldType: 'Date', required: true, unique: false, mapsTo: 'C3Header.PeriodStart', mappingTarget: 'PeriodStart', validationPattern: '^01/\\d{2}/\\d{4}$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_H004', formatId: 'FMT_002', rowType: 'HEADER', columnPosition: 4, columnCode: 'VERSION', columnName: 'VERSION', displayName: 'File Version', fieldType: 'String', required: true, unique: false, mapsTo: 'C3Header.FormatVersion', mappingTarget: 'FormatVersion', validationPattern: '^\\d+\\.\\d+\\.\\d+$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_H005', formatId: 'FMT_002', rowType: 'HEADER', columnPosition: 5, columnCode: 'COMPANY', columnName: 'COMPANY', displayName: 'Employer Name', fieldType: 'String', required: true, unique: false, mapsTo: 'Employer.Name', mappingTarget: 'Name', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  // DETAIL mappings (24 columns) - abbreviated for brevity
  { mappingId: 'COL_D001', formatId: 'FMT_002', rowType: 'DETAIL', columnPosition: 1, columnCode: 'LINE_NO', columnName: 'LINE', displayName: 'Line Number', fieldType: 'String', required: true, unique: true, mapsTo: 'C3Detail.LineNumber', mappingTarget: 'LineNumber', validationPattern: '^\\d{3}$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_D002', formatId: 'FMT_002', rowType: 'DETAIL', columnPosition: 2, columnCode: 'SSN', columnName: 'SSN', displayName: 'Employee SSN', fieldType: 'String', required: true, unique: false, mapsTo: 'Employee.SSN', mappingTarget: 'SSN', validationPattern: '^[0-9]{6}$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_D023', formatId: 'FMT_002', rowType: 'DETAIL', columnPosition: 23, columnCode: 'LEVY', columnName: 'LEVY', displayName: 'Employee Levy', fieldType: 'Decimal', required: true, unique: false, mapsTo: 'Contributions.LevyEmployee', mappingTarget: 'LevyEmployee', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_D024', formatId: 'FMT_002', rowType: 'DETAIL', columnPosition: 24, columnCode: 'SOCSEC', columnName: 'SOCSEC', displayName: 'Total SS', fieldType: 'Decimal', required: true, unique: false, mapsTo: 'Contributions.SocSecTotal', mappingTarget: 'SocSecTotal', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  // FOOTER mappings (8 columns)
  { mappingId: 'COL_F001', formatId: 'FMT_002', rowType: 'FOOTER', columnPosition: 1, columnCode: 'FTR_CODE', columnName: 'FTR', displayName: 'Record Type', fieldType: 'String', required: true, unique: false, mapsTo: 'System.RowType', mappingTarget: 'FTR', validationPattern: '^FTR$', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_F004', formatId: 'FMT_002', rowType: 'FOOTER', columnPosition: 4, columnCode: 'CTRLTTL', columnName: 'CTRLTTL', displayName: 'Control Total', fieldType: 'Decimal', required: true, unique: false, mapsTo: 'C3Footer.TotalWages', mappingTarget: 'TotalWages', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_F005', formatId: 'FMT_002', rowType: 'FOOTER', columnPosition: 5, columnCode: 'TTLSS', columnName: 'TTLSS', displayName: 'Total SS', fieldType: 'Decimal', required: true, unique: false, mapsTo: 'C3Footer.TotalSocSec', mappingTarget: 'TotalSocSec', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_F006', formatId: 'FMT_002', rowType: 'FOOTER', columnPosition: 6, columnCode: 'TTLLV', columnName: 'TTLLV', displayName: 'Total Levy', fieldType: 'Decimal', required: true, unique: false, mapsTo: 'C3Footer.TotalLevy', mappingTarget: 'TotalLevy', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'COL_F007', formatId: 'FMT_002', rowType: 'FOOTER', columnPosition: 7, columnCode: 'TTLPE', columnName: 'TTLPE', displayName: 'Total Severance', fieldType: 'Decimal', required: true, unique: false, mapsTo: 'C3Footer.TotalSeverance', mappingTarget: 'TotalSeverance', validationPattern: null, effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
];

// EC3 Validation Rules with all required fields
let mockValidationRules: C3ValidationRule[] = [
  { ruleId: 'VAL_VR001', ruleCode: 'VR001', formatId: 'FMT_002', ruleName: 'Header First Line', ruleType: 'RowLevel', ruleScope: 'Row', rowTypeFilter: 'HEADER', condition: 'Column[1] == "HDR"', severity: 'Error', errorMessage: 'First row must begin with HDR', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { ruleId: 'VAL_VR004', ruleCode: 'VR004', formatId: 'FMT_002', ruleName: 'REGNO Consistency', ruleType: 'FileLevel', ruleScope: 'File', rowTypeFilter: 'ALL', condition: 'Header.REGNO == Footer.REGNO', severity: 'Error', errorMessage: 'REGNO in footer must match header', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { ruleId: 'VAL_VR010', ruleCode: 'VR010', formatId: 'FMT_002', ruleName: 'REGNO Format', ruleType: 'RowLevel', ruleScope: 'Row', rowTypeFilter: 'ALL', condition: 'REGNO matches /^[0-9]{6}$/', severity: 'Error', errorMessage: 'REGNO must be 6-digit number', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { ruleId: 'VAL_VR022', ruleCode: 'VR022', formatId: 'FMT_002', ruleName: 'NUMRECS Count', ruleType: 'FileLevel', ruleScope: 'File', rowTypeFilter: 'ALL', condition: 'Footer.NUMRECS == count(DETAIL)', severity: 'Error', errorMessage: 'NUMRECS must equal detail count', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
];

// EC3 Contribution Mappings with all required fields
let mockContributionMappings: C3ContributionMapping[] = [
  { mappingId: 'CONTRIB_001', formatId: 'FMT_002', mappingCode: 'WAGES_BASE', description: 'Total wages for SS/Levy/Severance', sourceField: 'Calculated', targetModule: 'Wages', targetField: 'TotalWages', formula: 'PAY1+PAY2+PAY3+PAY4+PAY5+HOLPAY+BONUS', appliesTo: 'All', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'CONTRIB_002', formatId: 'FMT_002', mappingCode: 'SS_DETAIL', description: 'Reported SS per employee', sourceField: 'SOCSEC', targetModule: 'SocialSecurity', targetField: 'ReportedTotal', formula: null, appliesTo: 'Employee', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'CONTRIB_003', formatId: 'FMT_002', mappingCode: 'LEVY_EMP', description: 'Employee levy', sourceField: 'LEVY', targetModule: 'Levy', targetField: 'ReportedEmployeeLevy', formula: null, appliesTo: 'Employee', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'CONTRIB_004', formatId: 'FMT_002', mappingCode: 'SS_TOTAL', description: 'Total SS from footer', sourceField: 'Footer.TTLSS', targetModule: 'SocialSecurity', targetField: 'ReportedFileTotal', formula: null, appliesTo: 'File', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'CONTRIB_005', formatId: 'FMT_002', mappingCode: 'LEVY_TOTAL', description: 'Total levy from footer', sourceField: 'Footer.TTLLV', targetModule: 'Levy', targetField: 'ReportedFileTotal', formula: null, appliesTo: 'File', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
  { mappingId: 'CONTRIB_006', formatId: 'FMT_002', mappingCode: 'SEV_TOTAL', description: 'Total severance from footer', sourceField: 'Footer.TTLPE', targetModule: 'Severance', targetField: 'ReportedFileTotal', formula: null, appliesTo: 'File', effectiveFrom: '2004-05-04', effectiveTo: null, status: 'Active' },
];

let mockImportExportSettings: C3ImportExportSettings[] = [];
let mockGeneralConfigs: C3GeneralConfig[] = [];
let auditLog: C3FileConfigAuditLog[] = [];

export const c3FileConfigService = {
  getFormats: async () => mockFormats,
  getFormat: async (id: string) => mockFormats.find(f => f.formatId === id),
  createFormat: async (format: Omit<C3FormatScheme, 'formatId' | 'createdDate'>) => {
    const newFormat = { ...format, formatId: `FMT_${Date.now()}`, createdDate: new Date().toISOString() };
    mockFormats.push(newFormat);
    return newFormat;
  },
  updateFormat: async (id: string, updates: Partial<C3FormatScheme>) => {
    const index = mockFormats.findIndex(f => f.formatId === id);
    if (index === -1) throw new Error('Not found');
    mockFormats[index] = { ...mockFormats[index], ...updates };
    return mockFormats[index];
  },
  deleteFormat: async (id: string) => { mockFormats = mockFormats.filter(f => f.formatId !== id); },
  getColumnMappings: async (formatId: string) => mockColumnMappings.filter(m => m.formatId === formatId),
  createColumnMapping: async (m: Omit<C3ColumnMapping, 'mappingId'>) => { const n = { ...m, mappingId: `COL_${Date.now()}` }; mockColumnMappings.push(n); return n; },
  updateColumnMapping: async (id: string, u: Partial<C3ColumnMapping>) => { const i = mockColumnMappings.findIndex(m => m.mappingId === id); mockColumnMappings[i] = { ...mockColumnMappings[i], ...u }; return mockColumnMappings[i]; },
  deleteColumnMapping: async (id: string) => { mockColumnMappings = mockColumnMappings.filter(m => m.mappingId !== id); },
  getValidationRules: async (formatId: string) => mockValidationRules.filter(r => r.formatId === formatId),
  createValidationRule: async (r: Omit<C3ValidationRule, 'ruleId'>) => { const n = { ...r, ruleId: `VAL_${Date.now()}` }; mockValidationRules.push(n); return n; },
  updateValidationRule: async (id: string, u: Partial<C3ValidationRule>) => { const i = mockValidationRules.findIndex(r => r.ruleId === id); mockValidationRules[i] = { ...mockValidationRules[i], ...u }; return mockValidationRules[i]; },
  deleteValidationRule: async (id: string) => { mockValidationRules = mockValidationRules.filter(r => r.ruleId !== id); },
  getContributionMappings: async (formatId: string) => mockContributionMappings.filter(m => m.formatId === formatId),
  createContributionMapping: async (m: Omit<C3ContributionMapping, 'mappingId'>) => { const n = { ...m, mappingId: `CONTRIB_${Date.now()}` }; mockContributionMappings.push(n); return n; },
  updateContributionMapping: async (id: string, u: Partial<C3ContributionMapping>) => { const i = mockContributionMappings.findIndex(m => m.mappingId === id); mockContributionMappings[i] = { ...mockContributionMappings[i], ...u }; return mockContributionMappings[i]; },
  deleteContributionMapping: async (id: string) => { mockContributionMappings = mockContributionMappings.filter(m => m.mappingId !== id); },
  getImportExportSettings: async (formatId: string) => mockImportExportSettings.filter(s => s.formatId === formatId),
  createImportExportSettings: async (s: Omit<C3ImportExportSettings, 'settingsId'>) => { const n = { ...s, settingsId: `IMP_${Date.now()}` }; mockImportExportSettings.push(n); return n; },
  updateImportExportSettings: async (id: string, u: Partial<C3ImportExportSettings>) => { const i = mockImportExportSettings.findIndex(s => s.settingsId === id); mockImportExportSettings[i] = { ...mockImportExportSettings[i], ...u }; return mockImportExportSettings[i]; },
  deleteImportExportSettings: async (id: string) => { mockImportExportSettings = mockImportExportSettings.filter(s => s.settingsId !== id); },
  getGeneralConfigs: async (formatId: string) => mockGeneralConfigs.filter(c => c.formatId === formatId),
  createGeneralConfig: async (c: Omit<C3GeneralConfig, 'configId'>) => { const n = { ...c, configId: `GEN_${Date.now()}` }; mockGeneralConfigs.push(n); return n; },
  updateGeneralConfig: async (id: string, u: Partial<C3GeneralConfig>) => { const i = mockGeneralConfigs.findIndex(c => c.configId === id); mockGeneralConfigs[i] = { ...mockGeneralConfigs[i], ...u }; return mockGeneralConfigs[i]; },
  deleteGeneralConfig: async (id: string) => { mockGeneralConfigs = mockGeneralConfigs.filter(c => c.configId !== id); },
  getAuditLog: async () => auditLog,
};
