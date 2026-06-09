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
  | 'ACTIVE_AWARD_LOOKUP'
  // Participant-role aware public smart fields
  | 'APPLICANT_SSN_LOOKUP'

  | 'INSURED_PERSON_SSN_LOOKUP'
  | 'DECEASED_PERSON_SSN_LOOKUP'
  | 'BENEFICIARY_SELECTOR'
  | 'GUARDIAN_PAYEE_DETAILS'
  | 'DOCTOR_PROVIDER_TASK_INVITE'
  | 'SCHOOL_TASK_INVITE'
  | 'FUNERAL_HOME_DETAILS'
  | 'REPRESENTATIVE_DETAILS'
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
  { key: 'APPLICANT_SSN_LOOKUP', label: 'Applicant SSN Lookup', defaultSourceAdapter: 'ip_master', description: 'Looks up the person filling the form.' },
  { key: 'INSURED_PERSON_SSN_LOOKUP', label: 'Insured Person SSN Lookup', defaultSourceAdapter: 'ip_master', description: 'Looks up the person the claim is about.' },
  { key: 'DECEASED_PERSON_SSN_LOOKUP', label: 'Deceased Person SSN Lookup', defaultSourceAdapter: 'ip_master', description: 'For survivor / funeral claims.' },
  { key: 'BENEFICIARY_SELECTOR', label: 'Beneficiary Selector', defaultSourceAdapter: 'bn_award_beneficiary', description: 'Grid of survivor beneficiaries.' },
  { key: 'GUARDIAN_PAYEE_DETAILS', label: 'Guardian / Payee Details', description: 'Captures guardian/payee for minors or pensioners.' },
  { key: 'DOCTOR_PROVIDER_TASK_INVITE', label: 'Doctor / Provider Task Invite', description: 'Invites a doctor or medical provider to submit a report.' },
  { key: 'SCHOOL_TASK_INVITE', label: 'School Task Invite', description: 'Invites a school to confirm enrolment for student child.' },
  { key: 'FUNERAL_HOME_DETAILS', label: 'Funeral Home Details', description: 'Captures funeral home invoice details.' },
  { key: 'REPRESENTATIVE_DETAILS', label: 'Representative Details', description: 'Captures authorised representative.' },
  { key: 'DATE', label: 'Date' },
  { key: 'MONEY', label: 'Money' },
  { key: 'NUMBER', label: 'Number' },
  { key: 'TEXT', label: 'Text' },
  { key: 'SELECT', label: 'Select' },
  { key: 'BOOLEAN', label: 'Boolean' },
] as const;

export const SMART_FIELD_CHANNELS = ['PUBLIC_PORTAL', 'PUBLIC_ONLINE', 'OFFICER_INTAKE', 'OFFICER_REVIEW', 'AWARD_SERVICING', 'PAYMENTS'] as const;
export type SmartFieldChannel = (typeof SMART_FIELD_CHANNELS)[number];
