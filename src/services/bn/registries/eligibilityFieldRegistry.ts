/**
 * Eligibility Field Registry — canonical, typed list of fields that may be
 * referenced from eligibility rules. Eliminates free-text field names.
 */
import type { FieldDataType } from './operatorRegistry';

export interface EligibilityFieldDef {
  key: string;
  label: string;
  type: FieldDataType;
  /** Logical domain — used to group fields in the picker. */
  group: 'Person' | 'Contribution' | 'Employer' | 'Evidence' | 'Claim' | 'Survivor' | 'Medical';
  /** Resolver hint — adapter/table the runtime will read from. */
  source: string;
  /** Example value, used for the simulator. */
  sampleValue: string | number | boolean;
  description?: string;
}

export const ELIGIBILITY_FIELDS: readonly EligibilityFieldDef[] = [
  // Person
  { key: 'person.age_at_claim_date', label: 'Age at claim date', type: 'number', group: 'Person', source: 'ip_master.dob', sampleValue: 62 },
  { key: 'person.gender', label: 'Gender', type: 'string', group: 'Person', source: 'ip_master.gender', sampleValue: 'M' },
  { key: 'person.status', label: 'Person status', type: 'string', group: 'Person', source: 'ip_master.status', sampleValue: 'ACTIVE' },

  // Contribution
  { key: 'contribution.paid_weeks', label: 'Paid weeks', type: 'number', group: 'Contribution', source: 'ip_wages_ann_sum', sampleValue: 500 },
  { key: 'contribution.total_paid_credited_weeks', label: 'Paid + credited weeks', type: 'number', group: 'Contribution', source: 'ip_wages_ann_sum', sampleValue: 520 },
  { key: 'contribution.recent_paid_weeks', label: 'Recent paid weeks (last N)', type: 'number', group: 'Contribution', source: 'ip_wages', sampleValue: 26 },
  { key: 'contribution.average_weekly_wage', label: 'Average weekly wage', type: 'number', group: 'Contribution', source: 'ip_wages', sampleValue: 850 },

  // Employer
  { key: 'employer.status', label: 'Employer status', type: 'string', group: 'Employer', source: 'er_master.status', sampleValue: 'ACTIVE' },

  // Evidence
  { key: 'evidence.required_docs_complete', label: 'Required documents complete', type: 'boolean', group: 'Evidence', source: 'bn_claim_document', sampleValue: true },

  // Claim
  { key: 'claim.has_duplicate_active_claim', label: 'Has duplicate active claim', type: 'boolean', group: 'Claim', source: 'bn_claim', sampleValue: false },

  // Survivor
  { key: 'survivor.relationship', label: 'Survivor relationship', type: 'string', group: 'Survivor', source: 'bn_award_beneficiary.relationship', sampleValue: 'SPOUSE' },
  { key: 'survivor.age', label: 'Survivor age', type: 'number', group: 'Survivor', source: 'bn_award_beneficiary.dob', sampleValue: 17 },
  { key: 'survivor.student_status', label: 'Survivor student status', type: 'boolean', group: 'Survivor', source: 'bn_award_beneficiary.is_student', sampleValue: true },

  // Medical
  { key: 'medical.board_decision', label: 'Medical board decision', type: 'string', group: 'Medical', source: 'bn_medical_recommendation.decision', sampleValue: 'APPROVE' },
  { key: 'medical.disablement_percentage', label: 'Disablement %', type: 'number', group: 'Medical', source: 'bn_medical_recommendation.disablement_pct', sampleValue: 35 },
] as const;

export type EligibilityFieldKey = (typeof ELIGIBILITY_FIELDS)[number]['key'];

const BY_KEY = new Map(ELIGIBILITY_FIELDS.map((f) => [f.key, f]));

export function getEligibilityField(key: string): EligibilityFieldDef | undefined {
  return BY_KEY.get(key);
}

export function isValidEligibilityFieldKey(key: string): boolean {
  return BY_KEY.has(key);
}
