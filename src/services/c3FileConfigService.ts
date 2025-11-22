import {
  C3FormatScheme,
  C3ColumnMapping,
  C3ValidationRule,
  C3ContributionMapping,
  C3ImportExportSettings,
  C3GeneralConfig,
  C3FileConfigAuditLog,
} from '@/types/c3FileConfig';

// Mock Data Storage
let mockFormats: C3FormatScheme[] = [
  {
    formatId: 'FMT_001',
    formatName: 'Standard C3 CSV v1',
    description: 'Standard CSV format for C3 submissions',
    inputType: 'CSV',
    effectiveFrom: '2020-01-01',
    effectiveTo: '2024-12-31',
    isDefault: false,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2020-01-01',
  },
  {
    formatId: 'FMT_002',
    formatName: 'Enhanced C3 Excel 2025+',
    description: 'Enhanced Excel format with validation',
    inputType: 'Excel',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    isDefault: true,
    status: 'Active',
    createdBy: 'Admin',
    createdDate: '2024-11-01',
  },
];

let mockColumnMappings: C3ColumnMapping[] = [
  {
    mappingId: 'COL_001',
    formatId: 'FMT_002',
    columnPosition: 1,
    columnName: 'EMPLOYEE_SSN',
    displayName: 'Employee SSN',
    fieldType: 'String',
    required: true,
    unique: true,
    mapsTo: 'EmployeeField',
    mappingTarget: 'SSN',
    validationPattern: '^\\d{9}$',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    mappingId: 'COL_002',
    formatId: 'FMT_002',
    columnPosition: 2,
    columnName: 'EMPLOYEE_NAME',
    displayName: 'Employee Full Name',
    fieldType: 'String',
    required: true,
    unique: false,
    mapsTo: 'EmployeeField',
    mappingTarget: 'NAME',
    validationPattern: null,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    mappingId: 'COL_003',
    formatId: 'FMT_002',
    columnPosition: 3,
    columnName: 'BASIC_EARNINGS',
    displayName: 'Basic Salary',
    fieldType: 'Number',
    required: true,
    unique: false,
    mapsTo: 'PayrollComponent',
    mappingTarget: 'BASIC',
    validationPattern: null,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockValidationRules: C3ValidationRule[] = [
  {
    ruleId: 'VAL_001',
    formatId: 'FMT_002',
    ruleName: 'SSN Must Exist',
    ruleType: 'RowLevel',
    condition: 'EMPLOYEE_SSN must exist in employer employee register',
    severity: 'Error',
    errorMessage: 'Employee SSN not found in employer records',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    ruleId: 'VAL_002',
    formatId: 'FMT_002',
    ruleName: 'Total Earnings Positive',
    ruleType: 'RowLevel',
    condition: 'BASIC_EARNINGS + OVERTIME + BONUS >= 0',
    severity: 'Error',
    errorMessage: 'Total earnings must be positive',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    ruleId: 'VAL_003',
    formatId: 'FMT_002',
    ruleName: 'File Total Match',
    ruleType: 'FileLevel',
    condition: 'Sum of all employee earnings must match file total',
    severity: 'Error',
    errorMessage: 'File total does not match sum of employee earnings',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockContributionMappings: C3ContributionMapping[] = [
  {
    mappingId: 'CONTRIB_001',
    formatId: 'FMT_002',
    payrollComponent: 'BASIC',
    earningsField: 'BASIC_EARNINGS',
    contributesToSocialSecurity: true,
    contributesToInjury: true,
    contributesToLevy: true,
    contributesToSeverance: true,
    shareType: 'FullAmount',
    portionPercent: null,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
  {
    mappingId: 'CONTRIB_002',
    formatId: 'FMT_002',
    payrollComponent: 'BONUS',
    earningsField: 'BONUS_EARNINGS',
    contributesToSocialSecurity: true,
    contributesToInjury: false,
    contributesToLevy: false,
    contributesToSeverance: false,
    shareType: 'FullAmount',
    portionPercent: null,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockImportExportSettings: C3ImportExportSettings[] = [
  {
    settingsId: 'IMP_001',
    formatId: 'FMT_002',
    fileType: 'Excel',
    delimiter: null,
    encoding: 'UTF-8',
    sheetName: 'C3_Submission',
    rootTag: null,
    schemaUrl: null,
    hasHeaderRow: true,
    headerRowNumber: 1,
    sampleTemplateUrl: '/templates/c3_template_2025.xlsx',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let mockGeneralConfigs: C3GeneralConfig[] = [
  {
    configId: 'GEN_001',
    formatId: 'FMT_002',
    allowPartialSubmissions: false,
    requireDigitalSignature: true,
    maxFileSize: 10,
    maxEmployeesPerFile: 1000,
    autoValidateOnUpload: true,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    status: 'Active',
  },
];

let auditLog: C3FileConfigAuditLog[] = [];

// Service Functions
export const c3FileConfigService = {
  // Formats
  getFormats: async (): Promise<C3FormatScheme[]> => mockFormats,
  getFormat: async (id: string): Promise<C3FormatScheme | undefined> => mockFormats.find((f) => f.formatId === id),
  createFormat: async (format: Omit<C3FormatScheme, 'formatId' | 'createdDate'>): Promise<C3FormatScheme> => {
    const newFormat = {
      ...format,
      formatId: `FMT_${Date.now()}`,
      createdDate: new Date().toISOString(),
    };
    mockFormats.push(newFormat);
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'C3FormatScheme',
      entityId: newFormat.formatId,
      action: 'Create',
      oldValues: null,
      newValues: newFormat,
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
    });
    return newFormat;
  },
  updateFormat: async (id: string, updates: Partial<C3FormatScheme>): Promise<C3FormatScheme> => {
    const index = mockFormats.findIndex((f) => f.formatId === id);
    if (index === -1) throw new Error('Format not found');
    const oldFormat = { ...mockFormats[index] };
    mockFormats[index] = { ...mockFormats[index], ...updates, updatedDate: new Date().toISOString() };
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'C3FormatScheme',
      entityId: id,
      action: 'Update',
      oldValues: oldFormat,
      newValues: mockFormats[index],
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
    });
    return mockFormats[index];
  },
  deleteFormat: async (id: string): Promise<void> => {
    const format = mockFormats.find((f) => f.formatId === id);
    mockFormats = mockFormats.filter((f) => f.formatId !== id);
    auditLog.push({
      auditId: `AUDIT_${Date.now()}`,
      entityType: 'C3FormatScheme',
      entityId: id,
      action: 'Delete',
      oldValues: format,
      newValues: null,
      userId: 'current-user',
      userName: 'Current User',
      timestamp: new Date().toISOString(),
    });
  },

  // Column Mappings
  getColumnMappings: async (formatId: string): Promise<C3ColumnMapping[]> =>
    mockColumnMappings.filter((m) => m.formatId === formatId),
  createColumnMapping: async (mapping: Omit<C3ColumnMapping, 'mappingId'>): Promise<C3ColumnMapping> => {
    const newMapping = { ...mapping, mappingId: `COL_${Date.now()}` };
    mockColumnMappings.push(newMapping);
    return newMapping;
  },
  updateColumnMapping: async (id: string, updates: Partial<C3ColumnMapping>): Promise<C3ColumnMapping> => {
    const index = mockColumnMappings.findIndex((m) => m.mappingId === id);
    if (index === -1) throw new Error('Column mapping not found');
    mockColumnMappings[index] = { ...mockColumnMappings[index], ...updates };
    return mockColumnMappings[index];
  },
  deleteColumnMapping: async (id: string): Promise<void> => {
    mockColumnMappings = mockColumnMappings.filter((m) => m.mappingId !== id);
  },

  // Validation Rules
  getValidationRules: async (formatId: string): Promise<C3ValidationRule[]> =>
    mockValidationRules.filter((r) => r.formatId === formatId),
  createValidationRule: async (rule: Omit<C3ValidationRule, 'ruleId'>): Promise<C3ValidationRule> => {
    const newRule = { ...rule, ruleId: `VAL_${Date.now()}` };
    mockValidationRules.push(newRule);
    return newRule;
  },
  updateValidationRule: async (id: string, updates: Partial<C3ValidationRule>): Promise<C3ValidationRule> => {
    const index = mockValidationRules.findIndex((r) => r.ruleId === id);
    if (index === -1) throw new Error('Validation rule not found');
    mockValidationRules[index] = { ...mockValidationRules[index], ...updates };
    return mockValidationRules[index];
  },
  deleteValidationRule: async (id: string): Promise<void> => {
    mockValidationRules = mockValidationRules.filter((r) => r.ruleId !== id);
  },

  // Contribution Mappings
  getContributionMappings: async (formatId: string): Promise<C3ContributionMapping[]> =>
    mockContributionMappings.filter((m) => m.formatId === formatId),
  createContributionMapping: async (
    mapping: Omit<C3ContributionMapping, 'mappingId'>
  ): Promise<C3ContributionMapping> => {
    const newMapping = { ...mapping, mappingId: `CONTRIB_${Date.now()}` };
    mockContributionMappings.push(newMapping);
    return newMapping;
  },
  updateContributionMapping: async (
    id: string,
    updates: Partial<C3ContributionMapping>
  ): Promise<C3ContributionMapping> => {
    const index = mockContributionMappings.findIndex((m) => m.mappingId === id);
    if (index === -1) throw new Error('Contribution mapping not found');
    mockContributionMappings[index] = { ...mockContributionMappings[index], ...updates };
    return mockContributionMappings[index];
  },
  deleteContributionMapping: async (id: string): Promise<void> => {
    mockContributionMappings = mockContributionMappings.filter((m) => m.mappingId !== id);
  },

  // Import/Export Settings
  getImportExportSettings: async (formatId: string): Promise<C3ImportExportSettings[]> =>
    mockImportExportSettings.filter((s) => s.formatId === formatId),
  createImportExportSettings: async (
    settings: Omit<C3ImportExportSettings, 'settingsId'>
  ): Promise<C3ImportExportSettings> => {
    const newSettings = { ...settings, settingsId: `IMP_${Date.now()}` };
    mockImportExportSettings.push(newSettings);
    return newSettings;
  },
  updateImportExportSettings: async (
    id: string,
    updates: Partial<C3ImportExportSettings>
  ): Promise<C3ImportExportSettings> => {
    const index = mockImportExportSettings.findIndex((s) => s.settingsId === id);
    if (index === -1) throw new Error('Import/Export settings not found');
    mockImportExportSettings[index] = { ...mockImportExportSettings[index], ...updates };
    return mockImportExportSettings[index];
  },
  deleteImportExportSettings: async (id: string): Promise<void> => {
    mockImportExportSettings = mockImportExportSettings.filter((s) => s.settingsId !== id);
  },

  // General Config
  getGeneralConfigs: async (formatId: string): Promise<C3GeneralConfig[]> =>
    mockGeneralConfigs.filter((c) => c.formatId === formatId),
  createGeneralConfig: async (config: Omit<C3GeneralConfig, 'configId'>): Promise<C3GeneralConfig> => {
    const newConfig = { ...config, configId: `GEN_${Date.now()}` };
    mockGeneralConfigs.push(newConfig);
    return newConfig;
  },
  updateGeneralConfig: async (id: string, updates: Partial<C3GeneralConfig>): Promise<C3GeneralConfig> => {
    const index = mockGeneralConfigs.findIndex((c) => c.configId === id);
    if (index === -1) throw new Error('General config not found');
    mockGeneralConfigs[index] = { ...mockGeneralConfigs[index], ...updates };
    return mockGeneralConfigs[index];
  },
  deleteGeneralConfig: async (id: string): Promise<void> => {
    mockGeneralConfigs = mockGeneralConfigs.filter((c) => c.configId !== id);
  },

  // Audit Log
  getAuditLog: async (): Promise<C3FileConfigAuditLog[]> => auditLog,
};
