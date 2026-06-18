/**
 * Participant role catalogue and product participant configuration types.
 * Aligned with DB enum `bn_participant_role` and table `bn_product_participant_config`.
 */
export type BnParticipantRole =
  | 'APPLICANT'
  | 'CLAIMANT'
  | 'INSURED_PERSON'
  | 'DECEASED_INSURED_PERSON'
  | 'BENEFICIARY'
  | 'PAYEE'
  | 'GUARDIAN'
  | 'REPRESENTATIVE'
  | 'EMPLOYER'
  | 'DOCTOR'
  | 'MEDICAL_PROVIDER'
  | 'SCHOOL'
  | 'FUNERAL_HOME';

export const BN_PARTICIPANT_ROLES: readonly BnParticipantRole[] = [
  'APPLICANT', 'CLAIMANT', 'INSURED_PERSON', 'DECEASED_INSURED_PERSON',
  'BENEFICIARY', 'PAYEE', 'GUARDIAN', 'REPRESENTATIVE',
  'EMPLOYER', 'DOCTOR', 'MEDICAL_PROVIDER', 'SCHOOL', 'FUNERAL_HOME',
] as const;

export const BN_PARTICIPANT_ROLE_LABELS: Record<BnParticipantRole, string> = {
  APPLICANT: 'Applicant',
  CLAIMANT: 'Claimant',
  INSURED_PERSON: 'Insured Person',
  DECEASED_INSURED_PERSON: 'Deceased Insured Person',
  BENEFICIARY: 'Beneficiary',
  PAYEE: 'Payee',
  GUARDIAN: 'Guardian',
  REPRESENTATIVE: 'Representative',
  EMPLOYER: 'Employer',
  DOCTOR: 'Doctor',
  MEDICAL_PROVIDER: 'Medical Provider',
  SCHOOL: 'School',
  FUNERAL_HOME: 'Funeral Home',
};

export type BnParticipantVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';

export interface BnProductParticipantConfig {
  id: string;
  product_version_id: string;
  applicant_must_equal_insured: boolean;
  allowed_applicant_kinds: string[];
  required_roles: string[];
  optional_roles: string[];
  requires_deceased: boolean;
  requires_beneficiaries: boolean;
  requires_guardian_or_payee: boolean;
  requires_employer_task: boolean;
  requires_doctor_task: boolean;
  requires_school_task_when: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type BnProductParticipantConfigInput = Omit<BnProductParticipantConfig, 'id' | 'created_at' | 'updated_at'>;
