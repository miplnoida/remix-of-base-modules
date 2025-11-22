// C3 File Configuration Types - Versioned Configuration System

export type C3FormatStatus = 'Active' | 'Inactive';
export type InputType = 'CSV' | 'Excel' | 'XML' | 'JSON' | 'PortalDirectEntry';
export type FieldType = 'String' | 'Number' | 'Date' | 'Enum' | 'Boolean';
export type ValidationSeverity = 'Error' | 'Warning';
export type RuleType = 'RowLevel' | 'FileLevel' | 'CrossField';

// Main C3 Format Scheme (Top-Level Versioned Container)
export interface C3FormatScheme {
  formatId: string;
  formatName: string;
  description: string;
  inputType: InputType;
  effectiveFrom: string;
  effectiveTo: string | null;
  isDefault: boolean;
  status: C3FormatStatus;
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  notes?: string;
}

// Columns & Mapping
export interface C3ColumnMapping {
  mappingId: string;
  formatId: string;
  columnPosition: number;
  columnName: string;
  displayName: string;
  fieldType: FieldType;
  required: boolean;
  unique: boolean;
  mapsTo: 'EmployeeField' | 'PayrollComponent' | 'EmployerInfo' | 'PeriodInfo';
  mappingTarget: string; // e.g., "SSN", "BASIC_EARNINGS", "EMPLOYER_ID", "YEAR"
  validationPattern: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: C3FormatStatus;
  notes?: string;
}

// Validation Rules
export interface C3ValidationRule {
  ruleId: string;
  formatId: string;
  ruleName: string;
  ruleType: RuleType;
  condition: string; // JSON or simple definition
  severity: ValidationSeverity;
  errorMessage: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: C3FormatStatus;
  notes?: string;
}

// Contribution Mapping (SS / Levy / Injury / Severance)
export interface C3ContributionMapping {
  mappingId: string;
  formatId: string;
  payrollComponent: string;
  earningsField: string;
  contributesToSocialSecurity: boolean;
  contributesToInjury: boolean;
  contributesToLevy: boolean;
  contributesToSeverance: boolean;
  shareType: 'FullAmount' | 'Portion';
  portionPercent: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: C3FormatStatus;
  notes?: string;
}

// Import/Export Settings
export interface C3ImportExportSettings {
  settingsId: string;
  formatId: string;
  fileType: InputType;
  delimiter: string | null; // For CSV
  encoding: string; // e.g., "UTF-8"
  sheetName: string | null; // For Excel
  rootTag: string | null; // For XML
  schemaUrl: string | null; // For XML
  hasHeaderRow: boolean;
  headerRowNumber: number;
  sampleTemplateUrl: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: C3FormatStatus;
  notes?: string;
}

// General Configuration (within format detail)
export interface C3GeneralConfig {
  configId: string;
  formatId: string;
  allowPartialSubmissions: boolean;
  requireDigitalSignature: boolean;
  maxFileSize: number; // in MB
  maxEmployeesPerFile: number;
  autoValidateOnUpload: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: C3FormatStatus;
  notes?: string;
}

// Audit Log Entry
export interface C3FileConfigAuditLog {
  auditId: string;
  entityType: string;
  entityId: string;
  action: 'Create' | 'Update' | 'Delete' | 'Activate' | 'Deactivate';
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  userId: string;
  userName: string;
  timestamp: string;
  notes?: string;
}
