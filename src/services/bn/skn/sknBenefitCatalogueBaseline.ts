/**
 * SKN Social Security expected benefit catalogue baseline.
 * Source: https://socialsecurity.kn/benefits/
 *
 * Used by the BN Configuration Validation Dashboard to compare configured
 * products / versions / rules against the official catalogue. Values here are
 * EXPECTED baselines — do not auto-overwrite production config from these.
 */

export type SknScenarioType = 'POSITIVE' | 'NEGATIVE' | 'BOUNDARY' | 'LEGACY_COMPARISON';

export interface SknExpectedTestCase {
  test_case_code: string;
  test_case_name: string;
  scenario_type: SknScenarioType;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

export interface SknBenefitBaseline {
  benefit_code: string;          // expected bn_product.benefit_code
  benefit_name: string;
  category: string;              // SHORT_TERM | LONG_TERM | GRANT | INJURY | NON_CONTRIB
  requires_active_version: boolean;
  requires_eligibility: boolean;
  requires_calculation: boolean;
  requires_documents: boolean;
  requires_workflow: boolean;
  requires_screen_template: boolean;
  requires_timeline: boolean;
  expected_eligibility_keys: string[];   // field_key values expected
  expected_documents: string[];          // doc type codes expected
  expected_calculation_notes: string;
  warnings: string[];                    // validation warnings to surface
  test_cases: SknExpectedTestCase[];
}

export const SKN_BENEFIT_BASELINE: SknBenefitBaseline[] = [
  {
    benefit_code: 'SKN-AGE',
    benefit_name: 'Age Benefit (Pension + Grant)',
    category: 'LONG_TERM',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.age', 'ip.total_contributions', 'ip.paid_contributions'],
    expected_documents: ['BIRTH_CERTIFICATE', 'ID_PROOF', 'BANK_DETAILS'],
    expected_calculation_notes:
      'Age Pension: age>=62, total>=500, paid>=150, % of avg annual wages (30%–60%). Age Grant: age>=62, contributions 50–499, lump sum formula.',
    warnings: [
      'Must support BOTH Age Pension and Age Grant paths.',
      'Verify pension % range 30%–60% is configured.',
      'Verify Age Grant kicks in 50–499 contributions.',
    ],
    test_cases: [
      { test_case_code: 'AGE-P1', test_case_name: 'Age 62, 500 total, 150 paid', scenario_type: 'POSITIVE', input: { age: 62, total: 500, paid: 150 }, expected: { path: 'AGE_PENSION', eligible: true } },
      { test_case_code: 'AGE-N1', test_case_name: 'Age 61 fails', scenario_type: 'NEGATIVE', input: { age: 61, total: 500, paid: 150 }, expected: { eligible: false } },
      { test_case_code: 'AGE-B1', test_case_name: 'Age 62, 499 contributions → Grant', scenario_type: 'BOUNDARY', input: { age: 62, total: 499, paid: 150 }, expected: { path: 'AGE_GRANT' } },
    ],
  },
  {
    benefit_code: 'SKN-SICK',
    benefit_name: 'Sickness Benefit',
    category: 'SHORT_TERM',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.age', 'ip.paid_contributions', 'ip.contributions_in_last_13_weeks'],
    expected_documents: ['MEDICAL_CERTIFICATE', 'EMPLOYER_CONFIRMATION'],
    expected_calculation_notes: '65% of average weekly wages, max 26 weeks, 3-day waiting period.',
    warnings: [
      'Age range 16–62 must be enforced.',
      'Min 26 paid contributions required.',
      'Min 8 contributions in 13 weeks prior to illness required.',
      'Medical certificate is mandatory.',
    ],
    test_cases: [
      { test_case_code: 'SICK-P1', test_case_name: '26 paid + 8 in last 13', scenario_type: 'POSITIVE', input: { paid: 26, recent: 8 }, expected: { eligible: true } },
      { test_case_code: 'SICK-N1', test_case_name: '25 paid fails', scenario_type: 'NEGATIVE', input: { paid: 25, recent: 8 }, expected: { eligible: false } },
      { test_case_code: 'SICK-N2', test_case_name: 'Missing medical cert blocks', scenario_type: 'NEGATIVE', input: { paid: 26, recent: 8, medical_cert: false }, expected: { blocked: true } },
    ],
  },
  {
    benefit_code: 'SKN-MAT',
    benefit_name: 'Maternity Benefit (Allowance)',
    category: 'SHORT_TERM',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.age', 'ip.gender', 'ip.total_contributions', 'ip.paid_contributions_last_39_weeks'],
    expected_documents: ['CONFINEMENT_CERTIFICATE', 'MEDICAL_CERTIFICATE'],
    expected_calculation_notes: '65% of average weekly wages, duration 13 weeks.',
    warnings: [
      'Requires at least 39 contribution weeks (not 26).',
      'Requires at least 20 paid contributions in last 39 weeks immediately before payment due.',
      'Active insured woman age 16–62 only.',
      'Maternity Grant must be supported separately.',
    ],
    test_cases: [
      { test_case_code: 'MAT-P1', test_case_name: '39 weeks + 20 paid in last 39', scenario_type: 'POSITIVE', input: { weeks: 39, paid_last_39: 20 }, expected: { eligible: true } },
      { test_case_code: 'MAT-N1', test_case_name: '19 paid in last 39 fails', scenario_type: 'NEGATIVE', input: { weeks: 39, paid_last_39: 19 }, expected: { eligible: false } },
      { test_case_code: 'MAT-B1', test_case_name: 'Boundary 20 paid', scenario_type: 'BOUNDARY', input: { weeks: 39, paid_last_39: 20 }, expected: { eligible: true } },
    ],
  },
  {
    benefit_code: 'SKN-MAT-GRANT',
    benefit_name: 'Maternity Grant',
    category: 'GRANT',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: false,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.paid_contributions', 'claim.has_birth_certificate'],
    expected_documents: ['BIRTH_CERTIFICATE'],
    expected_calculation_notes: 'Fixed lump sum grant.',
    warnings: ['Verify lump-sum amount is effective-dated.'],
    test_cases: [
      { test_case_code: 'MATG-P1', test_case_name: 'Eligible with birth cert', scenario_type: 'POSITIVE', input: { birth_cert: true, paid: 26 }, expected: { eligible: true } },
    ],
  },
  {
    benefit_code: 'SKN-FUN',
    benefit_name: 'Funeral Grant',
    category: 'GRANT',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: false,
    expected_eligibility_keys: ['ip.total_contributions', 'ip.paid_contributions', 'claim.has_death_certificate'],
    expected_documents: ['DEATH_CERTIFICATE', 'FUNERAL_EXPENSE_PROOF'],
    expected_calculation_notes:
      'Standard max $2,500; Employment Injury death $4,000; dependent child age-based scale.',
    warnings: [
      'Seed shows grant_amount 7500 — official max is 2500 (4000 if work-injury). Flag NEEDS_REVIEW.',
      'Must support employment-injury variant amount.',
      'Must support dependent child age scale.',
      'Requires at least 26 contribution weeks and 26 paid contributions.',
    ],
    test_cases: [
      { test_case_code: 'FUN-P1', test_case_name: 'Standard funeral', scenario_type: 'POSITIVE', input: { paid: 26, injury: false }, expected: { amount: 2500 } },
      { test_case_code: 'FUN-P2', test_case_name: 'Employment-injury death', scenario_type: 'POSITIVE', input: { paid: 26, injury: true }, expected: { amount: 4000 } },
      { test_case_code: 'FUN-N1', test_case_name: 'Insufficient contributions', scenario_type: 'NEGATIVE', input: { paid: 25 }, expected: { eligible: false } },
    ],
  },
  {
    benefit_code: 'SKN-INV',
    benefit_name: 'Invalidity Benefit',
    category: 'LONG_TERM',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.age', 'ip.paid_contributions', 'claim.medical_board_decision'],
    expected_documents: ['MEDICAL_CERTIFICATE', 'MEDICAL_BOARD_REPORT'],
    expected_calculation_notes:
      'Pension range 16%–60% of avg annual wages / max insurable earnings. Minimum pension applies.',
    warnings: [
      'Incapacity > 26 weeks and likely permanent required.',
      'At least 150 paid contributions required.',
      'Age 16–62 required.',
      'Medical board decision required.',
      'Medical review interval must be configured.',
    ],
    test_cases: [
      { test_case_code: 'INV-P1', test_case_name: '150 paid + board approved', scenario_type: 'POSITIVE', input: { age: 40, paid: 150, board: 'APPROVED' }, expected: { eligible: true } },
      { test_case_code: 'INV-N1', test_case_name: '149 paid fails', scenario_type: 'NEGATIVE', input: { age: 40, paid: 149 }, expected: { eligible: false } },
    ],
  },
  {
    benefit_code: 'SKN-SUR',
    benefit_name: 'Survivors Benefit',
    category: 'LONG_TERM',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.paid_contributions', 'claim.has_death_certificate', 'claim.relationship_proof'],
    expected_documents: ['DEATH_CERTIFICATE', 'RELATIONSHIP_PROOF'],
    expected_calculation_notes:
      'Survivor shares: widow/widower 50%, child 16% (max), orphan/invalid extended, dependent parent.',
    warnings: [
      'Deceased must have 150 contributions OR receiving Age/Invalidity Benefit.',
      'Must support categories: widow/widower, child, orphan/invalid child, dependent parent.',
      'Child age limit 18 (21 if in education).',
    ],
    test_cases: [
      { test_case_code: 'SUR-P1', test_case_name: 'Widow with deceased 150 paid', scenario_type: 'POSITIVE', input: { paid: 150, relation: 'SPOUSE' }, expected: { share: 0.5 } },
      { test_case_code: 'SUR-N1', test_case_name: 'No relationship proof', scenario_type: 'NEGATIVE', input: { paid: 150, proof: false }, expected: { blocked: true } },
    ],
  },
  {
    benefit_code: 'SKN-SUR-GRANT',
    benefit_name: 'Survivors Grant',
    category: 'GRANT',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: false,
    requires_timeline: false,
    expected_eligibility_keys: ['ip.paid_contributions'],
    expected_documents: ['DEATH_CERTIFICATE'],
    expected_calculation_notes: 'Lump-sum where deceased did not qualify for Survivors Pension.',
    warnings: ['Verify grant formula uses Age Grant basis.'],
    test_cases: [
      { test_case_code: 'SURG-P1', test_case_name: 'Lump sum payable', scenario_type: 'POSITIVE', input: { paid: 50 }, expected: { eligible: true } },
    ],
  },
  {
    benefit_code: 'SKN-EI-INJ',
    benefit_name: 'Employment Injury Benefit',
    category: 'INJURY',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['claim.injury_is_work_related', 'claim.has_employer_report', 'claim.has_medical_certificate'],
    expected_documents: ['EMPLOYER_INJURY_REPORT', 'MEDICAL_CERTIFICATE'],
    expected_calculation_notes: '75% of average weekly wages, max 26 weeks, 3-day waiting period.',
    warnings: [
      'No normal contribution condition required.',
      'Must be work-related injury / disease.',
      'Self-employed exclusion should be configurable.',
    ],
    test_cases: [
      { test_case_code: 'EIINJ-P1', test_case_name: 'Work injury with report + cert', scenario_type: 'POSITIVE', input: { work: true, report: true, cert: true }, expected: { eligible: true } },
      { test_case_code: 'EIINJ-N1', test_case_name: 'Non-work injury', scenario_type: 'NEGATIVE', input: { work: false }, expected: { eligible: false } },
    ],
  },
  {
    benefit_code: 'SKN-EI-DIS',
    benefit_name: 'Disablement Benefit',
    category: 'INJURY',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['claim.disablement_degree', 'claim.medical_board_decision'],
    expected_documents: ['MEDICAL_BOARD_REPORT'],
    expected_calculation_notes: 'Based on degree of disablement; pension or grant by % loss.',
    warnings: ['Medical Board degree assessment required.'],
    test_cases: [
      { test_case_code: 'EIDIS-P1', test_case_name: 'Degree 50%', scenario_type: 'POSITIVE', input: { degree: 50 }, expected: { eligible: true } },
    ],
  },
  {
    benefit_code: 'SKN-EI-MED',
    benefit_name: 'Employment Injury Medical Expenses',
    category: 'INJURY',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: false,
    expected_eligibility_keys: ['claim.injury_is_work_related'],
    expected_documents: ['MEDICAL_INVOICE', 'MEDICAL_CERTIFICATE'],
    expected_calculation_notes: 'Capped reimbursement of medical expenses.',
    warnings: ['Verify expense cap is effective-dated.'],
    test_cases: [
      { test_case_code: 'EIMED-P1', test_case_name: 'Within cap', scenario_type: 'POSITIVE', input: { amount: 1000 }, expected: { reimbursed: 1000 } },
    ],
  },
  {
    benefit_code: 'SKN-EI-DTH',
    benefit_name: 'Employment Injury Death Benefit',
    category: 'INJURY',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['claim.has_death_certificate', 'claim.injury_is_work_related'],
    expected_documents: ['DEATH_CERTIFICATE', 'EMPLOYER_INJURY_REPORT'],
    expected_calculation_notes: 'Survivor pension shares + employment injury funeral grant ($4,000).',
    warnings: ['Must link with Funeral Grant employment-injury variant.'],
    test_cases: [
      { test_case_code: 'EIDTH-P1', test_case_name: 'Work death with cert', scenario_type: 'POSITIVE', input: { work: true, cert: true }, expected: { eligible: true } },
    ],
  },
  {
    benefit_code: 'SKN-NCP',
    benefit_name: 'Non-Contributory / Assistance Pension',
    category: 'NON_CONTRIB',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.age', 'claim.means_test_passed', 'claim.no_other_income'],
    expected_documents: ['MEANS_TEST_FORM', 'ID_PROOF'],
    expected_calculation_notes: 'Configured flat monthly amount, effective-dated.',
    warnings: [
      'Age > 62 and not qualified for regular Age Pension.',
      'Means test required.',
      'No secure income / no other means of support required.',
    ],
    test_cases: [
      { test_case_code: 'NCP-P1', test_case_name: 'Age 65, means passed', scenario_type: 'POSITIVE', input: { age: 65, means: true }, expected: { eligible: true } },
      { test_case_code: 'NCP-N1', test_case_name: 'Means fail', scenario_type: 'NEGATIVE', input: { age: 65, means: false }, expected: { eligible: false } },
    ],
  },
  {
    benefit_code: 'SKN-NCP-INV',
    benefit_name: 'Invalidity Assistance (Non-Contributory)',
    category: 'NON_CONTRIB',
    requires_active_version: true,
    requires_eligibility: true,
    requires_calculation: true,
    requires_documents: true,
    requires_workflow: true,
    requires_screen_template: true,
    requires_timeline: true,
    expected_eligibility_keys: ['ip.age', 'claim.medical_board_decision', 'claim.means_test_passed'],
    expected_documents: ['MEDICAL_BOARD_REPORT', 'MEANS_TEST_FORM'],
    expected_calculation_notes: 'Flat monthly amount, effective-dated.',
    warnings: [
      'Age 16–62.',
      'Not qualified for Invalidity Benefit.',
      'Medical board + means test required.',
    ],
    test_cases: [
      { test_case_code: 'NCPI-P1', test_case_name: 'Age 40, board + means', scenario_type: 'POSITIVE', input: { age: 40, board: 'APPROVED', means: true }, expected: { eligible: true } },
    ],
  },
];

export function findBaselineByCode(code: string): SknBenefitBaseline | undefined {
  return SKN_BENEFIT_BASELINE.find((b) => b.benefit_code === code);
}
