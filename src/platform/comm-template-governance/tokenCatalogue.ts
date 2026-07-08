/**
 * OM-9.7.6 — Communication Token Catalogue.
 *
 * Canonical token registry used by resolver and health checks to validate
 * that templates only reference known tokens and to warn on unresolved ones.
 */
export interface CommToken {
  token_key: string;
  label: string;
  category: TokenCategory;
  description: string;
  sample_value: string;
  allowed_modules: string[] | 'ALL';
  resolver_status: 'RESOLVED' | 'PLANNED' | 'MANUAL';
  is_active: boolean;
}

export type TokenCategory =
  | 'ORGANIZATION' | 'DEPARTMENT' | 'OFFICE' | 'RECIPIENT'
  | 'EMPLOYER' | 'INSURED_PERSON' | 'CONTRIBUTION' | 'BENEFIT'
  | 'PAYMENT' | 'CASE_LEGAL' | 'WORKFLOW' | 'SYSTEM';

const T = (
  token_key: string, label: string, category: TokenCategory,
  description: string, sample_value: string,
  allowed_modules: string[] | 'ALL' = 'ALL',
  resolver_status: CommToken['resolver_status'] = 'RESOLVED',
): CommToken => ({ token_key, label, category, description, sample_value, allowed_modules, resolver_status, is_active: true });

export const COMM_TOKEN_CATALOGUE: CommToken[] = [
  // Organization
  T('organization.name',        'Organization Name',          'ORGANIZATION', 'Full legal or common name of the SSB organization', 'Social Security Board'),
  T('organization.legalName',   'Organization Legal Name',    'ORGANIZATION', 'Registered legal name',                             'The Social Security Board of St. Kitts and Nevis'),
  T('organization.address',     'Organization Address',       'ORGANIZATION', 'Head-office postal address',                         'PO Box 79, Basseterre'),
  T('organization.phone',       'Organization Phone',         'ORGANIZATION', 'Head-office telephone',                              '+1 869 465 2535'),
  T('organization.email',       'Organization Email',         'ORGANIZATION', 'Head-office email',                                  'info@example.ssb'),
  T('organization.website',     'Organization Website',       'ORGANIZATION', 'Public website URL',                                 'https://www.example.ssb'),
  T('organization.logo',        'Organization Logo',          'ORGANIZATION', 'Approved official logo asset',                       '[logo]'),
  T('organization.seal',        'Organization Seal',          'ORGANIZATION', 'Approved official seal asset',                       '[seal]'),

  // Department
  T('department.name',          'Department Name',            'DEPARTMENT', 'Owning department display name', 'Benefits'),
  T('department.code',          'Department Code',            'DEPARTMENT', 'Owning department code',         'BN'),
  T('department.phone',         'Department Phone',           'DEPARTMENT', 'Department phone number',        '+1 869 465 0000'),
  T('department.email',         'Department Email',           'DEPARTMENT', 'Department email',               'benefits@example.ssb'),
  T('department.signature',     'Department Signature',       'DEPARTMENT', 'Effective department signature', '[signature]'),
  T('department.disclaimer',    'Department Disclaimer',      'DEPARTMENT', 'Effective department disclaimer','[disclaimer]'),

  // Office / location
  T('office.name',              'Office Name',                'OFFICE', 'Office/branch name',        'Basseterre Head Office'),
  T('office.address',           'Office Address',             'OFFICE', 'Office postal address',     'Bay Road, Basseterre'),
  T('office.phone',             'Office Phone',               'OFFICE', 'Office phone number',       '+1 869 465 2535'),
  T('office.email',             'Office Email',               'OFFICE', 'Office email',              'basseterre@example.ssb'),
  T('office.branchName',        'Office Branch Name',         'OFFICE', 'Branch label',              'Head Office'),

  // Recipient
  T('recipient.name',           'Recipient Name',             'RECIPIENT', 'Recipient full name',    'John Smith'),
  T('recipient.email',          'Recipient Email',            'RECIPIENT', 'Recipient email',        'john.smith@example.com'),
  T('recipient.phone',          'Recipient Phone',            'RECIPIENT', 'Recipient phone',        '+1 869 555 0100'),
  T('recipient.address',        'Recipient Address',          'RECIPIENT', 'Recipient postal address','12 Main Street, Basseterre'),

  // Employer
  T('employer.name',            'Employer Name',              'EMPLOYER', 'Employer registered name',       'Acme Ltd', ['EMPLOYER','CONTRIBUTIONS','COMPLIANCE','LEGAL','FINANCE']),
  T('employer.number',          'Employer Number',            'EMPLOYER', 'Employer identifier',            'EMP-00012'),
  T('employer.registrationDate','Employer Registration Date', 'EMPLOYER', 'Registration date',              '2024-01-05'),
  T('employer.status',          'Employer Status',            'EMPLOYER', 'Current status',                 'ACTIVE'),
  T('employer.contactName',     'Employer Contact Name',      'EMPLOYER', 'Primary contact person',         'Jane Doe'),
  T('employer.contactEmail',    'Employer Contact Email',     'EMPLOYER', 'Primary contact email',          'jane.doe@acme.com'),
  T('employer.address',         'Employer Address',           'EMPLOYER', 'Employer postal address',        '5 Industrial Park'),

  // Insured Person
  T('insuredPerson.name',        'Insured Person Name',       'INSURED_PERSON', 'IP full name',              'Alice Roberts'),
  T('insuredPerson.number',      'Insured Person Number',     'INSURED_PERSON', 'SSN',                       'SSN-000123'),
  T('insuredPerson.dateOfBirth', 'Insured Person DOB',        'INSURED_PERSON', 'Date of birth',             '1985-04-15'),
  T('insuredPerson.status',      'Insured Person Status',     'INSURED_PERSON', 'Current status',            'ACTIVE'),
  T('insuredPerson.employerName','Insured Person Employer',   'INSURED_PERSON', 'Current employer',          'Acme Ltd'),

  // Contribution
  T('contribution.period',       'Contribution Period',       'CONTRIBUTION', 'Reporting period',            '2026-01'),
  T('contribution.amount',       'Contribution Amount',       'CONTRIBUTION', 'Contribution amount',         '1,250.00'),
  T('contribution.dueDate',      'Contribution Due Date',     'CONTRIBUTION', 'Payment due date',            '2026-02-15'),
  T('contribution.receivedDate', 'Contribution Received Date','CONTRIBUTION', 'Payment received date',       '2026-02-10'),
  T('contribution.status',       'Contribution Status',       'CONTRIBUTION', 'Status',                      'RECEIVED'),
  T('arrears.amount',            'Arrears Amount',            'CONTRIBUTION', 'Total arrears amount',        '3,500.00'),
  T('arrears.period',            'Arrears Period',            'CONTRIBUTION', 'Arrears period range',        '2025-11 to 2026-01'),

  // Benefit
  T('claim.number',              'Claim Number',              'BENEFIT', 'Claim reference number',           'CLM-000456'),
  T('claim.type',                'Claim Type',                'BENEFIT', 'Claim benefit type',               'SICKNESS'),
  T('claim.receivedDate',        'Claim Received Date',       'BENEFIT', 'Received date',                    '2026-03-01'),
  T('claim.status',              'Claim Status',              'BENEFIT', 'Current status',                   'UNDER_REVIEW'),
  T('claim.decisionDate',        'Claim Decision Date',       'BENEFIT', 'Decision date',                    '2026-03-15'),
  T('benefit.amount',            'Benefit Amount',            'BENEFIT', 'Awarded amount',                   '2,000.00'),
  T('benefit.paymentDate',       'Benefit Payment Date',      'BENEFIT', 'Scheduled payment date',           '2026-03-20'),

  // Payment
  T('payment.reference',         'Payment Reference',         'PAYMENT', 'Payment reference number',         'PAY-000789'),
  T('payment.amount',            'Payment Amount',            'PAYMENT', 'Payment amount',                   '1,250.00'),
  T('payment.date',              'Payment Date',              'PAYMENT', 'Payment date',                     '2026-02-10'),
  T('payment.method',            'Payment Method',            'PAYMENT', 'Payment method',                   'BANK_TRANSFER'),
  T('payment.status',            'Payment Status',            'PAYMENT', 'Payment status',                   'CLEARED'),
  T('receipt.number',            'Receipt Number',            'PAYMENT', 'Receipt number',                   'RCP-000123'),

  // Case / Legal
  T('case.number',               'Case Number',               'CASE_LEGAL', 'Case reference number',          'LEG-000012'),
  T('case.type',                 'Case Type',                 'CASE_LEGAL', 'Case type',                      'RECOVERY'),
  T('case.status',               'Case Status',               'CASE_LEGAL', 'Case status',                    'OPEN'),
  T('case.officer',              'Case Officer',              'CASE_LEGAL', 'Assigned officer',               'Legal Officer'),
  T('hearing.date',              'Hearing Date',              'CASE_LEGAL', 'Scheduled hearing date',         '2026-04-10'),
  T('hearing.location',          'Hearing Location',          'CASE_LEGAL', 'Hearing location',               'Magistrate Court, Basseterre'),
  T('appeal.deadline',           'Appeal Deadline',           'CASE_LEGAL', 'Appeal deadline',                '2026-05-01'),

  // Workflow
  T('workflow.taskName',         'Workflow Task Name',        'WORKFLOW', 'Task name',                        'Review Registration'),
  T('workflow.instanceNumber',   'Workflow Instance Number',  'WORKFLOW', 'Workflow instance identifier',     'WF-000456'),
  T('workflow.dueDate',          'Workflow Due Date',         'WORKFLOW', 'Task due date',                    '2026-03-05'),
  T('workflow.assignedTo',       'Workflow Assigned To',      'WORKFLOW', 'Assignee display name',            'Approver 1'),
  T('workflow.stageName',        'Workflow Stage Name',       'WORKFLOW', 'Stage name',                       'Approval'),
  T('workflow.decision',         'Workflow Decision',         'WORKFLOW', 'Decision',                         'APPROVED'),
  T('workflow.comment',          'Workflow Comment',          'WORKFLOW', 'Approver comment',                 'Looks good'),

  // System
  T('reference.number',          'Reference Number',          'SYSTEM', 'Generated communication reference', 'REF-000001'),
  T('current.date',              'Current Date',              'SYSTEM', 'Rendering date',                     '2026-07-08'),
  T('portal.loginUrl',           'Portal Login URL',          'SYSTEM', 'Portal login URL',                   'https://portal.example.ssb'),
  T('support.phone',             'Support Phone',             'SYSTEM', 'Support phone',                      '+1 869 465 2535'),
  T('support.email',             'Support Email',             'SYSTEM', 'Support email',                      'support@example.ssb'),
];

const TOKEN_KEYS = new Set(COMM_TOKEN_CATALOGUE.map((t) => t.token_key));

/** Return every {{token}} occurrence in a template body. */
export function extractTokens(body: string | null | undefined): string[] {
  if (!body) return [];
  const out = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.add(m[1]);
  return [...out];
}

export interface TokenValidationResult {
  parsedTokens: string[];
  knownTokens: string[];
  unknownTokens: string[];
  isValid: boolean;
}

export function validateTemplateTokens(
  body: string | null | undefined,
  requiredTokens: string[] = [],
): TokenValidationResult & { missingRequired: string[] } {
  const parsedTokens = extractTokens(body);
  const knownTokens = parsedTokens.filter((k) => TOKEN_KEYS.has(k));
  const unknownTokens = parsedTokens.filter((k) => !TOKEN_KEYS.has(k));
  const missingRequired = requiredTokens.filter((k) => !parsedTokens.includes(k));
  return {
    parsedTokens,
    knownTokens,
    unknownTokens,
    missingRequired,
    isValid: unknownTokens.length === 0 && missingRequired.length === 0,
  };
}

export const isKnownToken = (key: string): boolean => TOKEN_KEYS.has(key);
