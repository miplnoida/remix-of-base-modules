/**
 * BN Placeholder Registry
 * ------------------------
 * Canonical list of merge placeholders supported by `buildBnMergeContext`.
 * Used by the Benefits template manager to validate that every template only
 * references known placeholders, and to show authors which tokens they may
 * insert.
 *
 * Tokens are matched case-insensitively against the registry so that legacy
 * camelCase entries (e.g. `{{ClaimNumber}}`) and modern upper-snake entries
 * (e.g. `{{CLAIM_NUMBER}}`) are both recognised as valid.
 */
export interface BnPlaceholder {
  key: string;
  label: string;
  description: string;
  aliases?: string[];
}

export const BN_PLACEHOLDERS: BnPlaceholder[] = [
  { key: 'CLAIM_NUMBER', label: 'Claim Number', description: 'Public claim reference', aliases: ['ClaimNumber'] },
  { key: 'CLAIMANT_NAME', label: 'Claimant Name', description: 'Full name of claimant', aliases: ['ClaimantName'] },
  { key: 'SSN_MASKED', label: 'SSN (masked)', description: 'Last two digits visible', aliases: ['SSNMasked'] },
  { key: 'BENEFIT_NAME', label: 'Benefit Name', description: 'Product name', aliases: ['BenefitName'] },
  { key: 'BENEFIT_TYPE', label: 'Benefit Type', description: 'Product type', aliases: ['BenefitType'] },
  { key: 'APPLICATION_DATE', label: 'Application Date', description: 'Submitted_at or created_at', aliases: ['SubmissionDate'] },
  { key: 'DECISION_DATE', label: 'Decision Date', description: 'Last decision date', aliases: ['DecisionDate'] },
  { key: 'FAILED_RULES', label: 'Failed Rules', description: 'Bulleted list of eligibility checks that failed' },
  { key: 'FAILED_REASON_SUMMARY', label: 'Failed Reason Summary', description: 'One-line summary of failures' },
  { key: 'MISSING_DOCUMENTS', label: 'Missing Documents', description: 'Comma-separated outstanding docs' },
  { key: 'NEXT_STEPS', label: 'Next Steps', description: 'Action required by claimant' },
  { key: 'APPEAL_INSTRUCTIONS', label: 'Appeal Instructions', description: 'How to appeal a decision' },
  { key: 'OFFICE_PHONE', label: 'Office Phone', description: 'Contact phone for queries', aliases: ['OfficePhone', 'OfficeContact'] },
  { key: 'OFFICE_EMAIL', label: 'Office Email', description: 'Contact email', aliases: ['OfficeEmail'] },
  { key: 'WEEKLY_RATE', label: 'Weekly Rate', description: 'Calculated weekly rate', aliases: ['WeeklyRate'] },
  { key: 'MONTHLY_RATE', label: 'Monthly Rate', description: 'Calculated monthly rate', aliases: ['MonthlyRate'] },
  { key: 'LUMP_SUM', label: 'Lump Sum', description: 'Calculated lump sum', aliases: ['LumpSum'] },
  { key: 'EFFECTIVE_DATE', label: 'Effective Date', description: 'Award effective date', aliases: ['EffectiveDate'] },
  { key: 'PAYMENT_DATE', label: 'Payment Date', description: 'Next payment date' },
  { key: 'PAYMENT_METHOD', label: 'Payment Method', description: 'Cheque / bank / cash', aliases: ['PaymentMethod'] },
  { key: 'OFFICER_NAME', label: 'Officer Name', description: 'Assigned officer name', aliases: ['OfficerName'] },
  // Additional supported tokens
  { key: 'REASON_CODE', label: 'Reason Code', aliases: ['ReasonCode'], description: 'Decision reason code' },
  { key: 'REASON_DESCRIPTION', label: 'Reason Description', aliases: ['ReasonDescription'], description: 'Reason narrative' },
  { key: 'TODAY', label: 'Today', description: 'Today\'s date (yyyy-mm-dd)', aliases: ['Today'] },
  { key: 'DUE_DATE', label: 'Due Date', aliases: ['DueDate'], description: 'Due date provided by caller' },
  // Branding / reference (resolved by letterGenerator)
  { key: 'REFERENCE_NUMBER', label: 'Reference Number', aliases: ['ReferenceNumber'], description: 'Central reference number for the letter' },
  { key: 'OFFICE_NAME', label: 'Office Name', description: 'Issuing office name', aliases: ['OfficeName'] },
  { key: 'OFFICE_ADDRESS', label: 'Office Address', description: 'Full office postal address', aliases: ['OfficeAddress'] },
  { key: 'DEPARTMENT_NAME', label: 'Department Name', description: 'Issuing department', aliases: ['DepartmentName'] },
  { key: 'SIGNATURE_BLOCK', label: 'Signature Block', description: 'Department signatory block', aliases: ['SignatureBlock'] },
];

// Phase 2 Country Pack tokens (country.*, legal.*, product.*, rule.*, …)
// are also valid template tokens; merge their keys into the known set so
// the editor's "unknown placeholder" warning doesn't flag them.
import { TOKEN_REGISTRY as BN_PHASE2_TOKENS } from '@/lib/bn/templateTokens';

const _knownLowercase = new Set<string>();
BN_PLACEHOLDERS.forEach((p) => {
  _knownLowercase.add(p.key.toLowerCase());
  (p.aliases || []).forEach((a) => _knownLowercase.add(a.toLowerCase()));
});
BN_PHASE2_TOKENS.forEach((t) => _knownLowercase.add(t.key.toLowerCase()));

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

export function extractPlaceholders(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) out.add(m[1]);
  return [...out];
}

export interface PlaceholderValidation {
  used: string[];
  unknown: string[];
  recognised: string[];
}

export function validatePlaceholders(...texts: (string | null | undefined)[]): PlaceholderValidation {
  const used = new Set<string>();
  texts.forEach((t) => extractPlaceholders(t).forEach((k) => used.add(k)));
  const usedArr = [...used];
  const unknown = usedArr.filter((k) => !_knownLowercase.has(k.toLowerCase()));
  const recognised = usedArr.filter((k) => _knownLowercase.has(k.toLowerCase()));
  return { used: usedArr, unknown, recognised };
}
