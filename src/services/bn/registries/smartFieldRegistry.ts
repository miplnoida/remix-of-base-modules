/**
 * Smart Field Registry — UI field types used by the Screen & Field Library.
 */
export type SmartFieldType =
  | 'SSN_LOOKUP'
  | 'PERSON_SUMMARY'
  | 'EMPLOYER_LOOKUP'
  | 'CONTRIBUTION_SUMMARY'
  | 'DEPENDANT_SELECTOR'
  | 'SURVIVOR_BENEFICIARY_GRID'
  | 'DOCUMENT_UPLOAD_CHECKLIST'
  | 'BANK_ACCOUNT_CAPTURE'
  | 'MEDICAL_CERTIFICATE_BLOCK'
  | 'DECLARATION_CHECKBOX'
  | 'DATE'
  | 'MONEY'
  | 'NUMBER'
  | 'TEXT'
  | 'SELECT'
  | 'BOOLEAN';

export interface SmartFieldTypeDef {
  key: SmartFieldType;
  label: string;
  /** Adapter that supplies data when the field renders. */
  defaultSourceAdapter?: string;
  description?: string;
}

export const SMART_FIELD_TYPES: readonly SmartFieldTypeDef[] = [
  { key: 'SSN_LOOKUP', label: 'SSN Lookup', defaultSourceAdapter: 'ip_master' },
  { key: 'PERSON_SUMMARY', label: 'Person Summary', defaultSourceAdapter: 'ip_master' },
  { key: 'EMPLOYER_LOOKUP', label: 'Employer Lookup', defaultSourceAdapter: 'er_master' },
  { key: 'CONTRIBUTION_SUMMARY', label: 'Contribution Summary', defaultSourceAdapter: 'ip_wages_ann_sum' },
  { key: 'DEPENDANT_SELECTOR', label: 'Dependant Selector', defaultSourceAdapter: 'ip_depend' },
  { key: 'SURVIVOR_BENEFICIARY_GRID', label: 'Survivor / Beneficiary Grid', defaultSourceAdapter: 'bn_award_beneficiary' },
  { key: 'DOCUMENT_UPLOAD_CHECKLIST', label: 'Document Upload Checklist', defaultSourceAdapter: 'bn_claim_document' },
  { key: 'BANK_ACCOUNT_CAPTURE', label: 'Bank Account Capture', defaultSourceAdapter: 'cl_bank_acct' },
  { key: 'MEDICAL_CERTIFICATE_BLOCK', label: 'Medical Certificate Block', defaultSourceAdapter: 'bn_medical_recommendation' },
  { key: 'DECLARATION_CHECKBOX', label: 'Declaration Checkbox' },
  { key: 'DATE', label: 'Date' },
  { key: 'MONEY', label: 'Money' },
  { key: 'NUMBER', label: 'Number' },
  { key: 'TEXT', label: 'Text' },
  { key: 'SELECT', label: 'Select' },
  { key: 'BOOLEAN', label: 'Boolean' },
] as const;

export const SMART_FIELD_CHANNELS = ['PUBLIC_PORTAL', 'OFFICER_INTAKE', 'OFFICER_REVIEW', 'AWARD_SERVICING', 'PAYMENTS'] as const;
export type SmartFieldChannel = (typeof SMART_FIELD_CHANNELS)[number];
