/**
 * OM-9.7.6 — Communication Business-Event Catalogue.
 *
 * Canonical list of business events that produce customer/staff-facing
 * communications. Business modules must reference these codes when calling
 * `resolveBusinessCommunicationContext` rather than inventing their own.
 */
export interface CommBusinessEvent {
  code: string;
  moduleCode: ModuleCode;
  name: string;
  defaultChannels: OutputChannel[];
  defaultRecipient: RecipientType;
  description?: string;
}

export type ModuleCode =
  | 'EMPLOYER' | 'INSURED_PERSON' | 'CONTRIBUTIONS' | 'BENEFITS'
  | 'COMPLIANCE' | 'FINANCE' | 'LEGAL' | 'WORKFLOW' | 'ADMIN' | 'COMM_HUB';

export type OutputChannel =
  | 'DOCUMENT' | 'EMAIL' | 'SMS' | 'IN_APP' | 'PORTAL' | 'PDF' | 'PRINT';

export type RecipientType =
  | 'EMPLOYER' | 'INSURED_PERSON' | 'CLAIMANT' | 'BENEFICIARY' | 'DEPENDANT'
  | 'STAFF' | 'APPROVER' | 'INSPECTOR' | 'LEGAL_OFFICER' | 'FINANCE_OFFICER'
  | 'ADMIN_USER' | 'PUBLIC_USER' | 'SYSTEM_USER';

const E = (
  moduleCode: ModuleCode,
  code: string,
  name: string,
  defaultRecipient: RecipientType,
  defaultChannels: OutputChannel[] = ['DOCUMENT', 'EMAIL'],
): CommBusinessEvent => ({ moduleCode, code, name, defaultRecipient, defaultChannels });

export const COMM_BUSINESS_EVENTS: CommBusinessEvent[] = [
  // Employer
  E('EMPLOYER', 'EMPLOYER_REGISTRATION_RECEIVED',   'Employer Registration Received',   'EMPLOYER', ['DOCUMENT','EMAIL','SMS']),
  E('EMPLOYER', 'EMPLOYER_REGISTRATION_APPROVED',   'Employer Registration Approved',   'EMPLOYER', ['DOCUMENT','EMAIL','SMS']),
  E('EMPLOYER', 'EMPLOYER_REGISTRATION_REJECTED',   'Employer Registration Rejected',   'EMPLOYER', ['DOCUMENT','EMAIL']),
  E('EMPLOYER', 'EMPLOYER_INFORMATION_REQUIRED',    'Employer Information Required',    'EMPLOYER'),
  E('EMPLOYER', 'EMPLOYER_STATUS_CHANGED',          'Employer Status Changed',          'EMPLOYER'),
  E('EMPLOYER', 'EMPLOYER_DEACTIVATION_NOTICE',     'Employer Deactivation Notice',     'EMPLOYER'),
  E('EMPLOYER', 'EMPLOYER_COMPLIANCE_NOTICE',       'Employer Compliance Notice',       'EMPLOYER'),
  E('EMPLOYER', 'EMPLOYER_ARREARS_NOTICE',          'Employer Arrears Notice',          'EMPLOYER'),
  E('EMPLOYER', 'EMPLOYER_INSPECTION_NOTICE',       'Employer Inspection Notice',       'EMPLOYER'),
  E('EMPLOYER', 'EMPLOYER_PORTAL_ACCOUNT_CREATED',  'Employer Portal Account Created',  'EMPLOYER', ['EMAIL','SMS']),

  // Insured Person
  E('INSURED_PERSON', 'IP_REGISTRATION_RECEIVED',       'IP Registration Received',       'INSURED_PERSON', ['DOCUMENT','EMAIL','SMS']),
  E('INSURED_PERSON', 'IP_REGISTRATION_APPROVED',       'IP Registration Approved',       'INSURED_PERSON', ['DOCUMENT','EMAIL','SMS']),
  E('INSURED_PERSON', 'IP_REGISTRATION_REJECTED',       'IP Registration Rejected',       'INSURED_PERSON'),
  E('INSURED_PERSON', 'IP_DATA_CORRECTION_RECEIVED',    'IP Data Correction Received',    'INSURED_PERSON'),
  E('INSURED_PERSON', 'IP_DATA_CORRECTION_APPROVED',    'IP Data Correction Approved',    'INSURED_PERSON'),
  E('INSURED_PERSON', 'IP_EMPLOYMENT_LINKED',           'IP Employment Linked',           'INSURED_PERSON'),
  E('INSURED_PERSON', 'IP_EMPLOYMENT_TERMINATED',       'IP Employment Terminated',       'INSURED_PERSON'),
  E('INSURED_PERSON', 'IP_ACCOUNT_CREATED',             'IP Portal Account Created',      'INSURED_PERSON', ['EMAIL','SMS']),

  // Contributions / C3
  E('CONTRIBUTIONS', 'CONTRIBUTION_RETURN_RECEIVED',   'Contribution Return Received',   'EMPLOYER'),
  E('CONTRIBUTIONS', 'CONTRIBUTION_RETURN_ACCEPTED',   'Contribution Return Accepted',   'EMPLOYER'),
  E('CONTRIBUTIONS', 'CONTRIBUTION_RETURN_REJECTED',   'Contribution Return Rejected',   'EMPLOYER'),
  E('CONTRIBUTIONS', 'CONTRIBUTION_PAYMENT_RECEIVED',  'Contribution Payment Received',  'EMPLOYER', ['DOCUMENT','EMAIL','SMS']),
  E('CONTRIBUTIONS', 'CONTRIBUTION_ARREARS_NOTICE',    'Contribution Arrears Notice',    'EMPLOYER'),
  E('CONTRIBUTIONS', 'CONTRIBUTION_PERIOD_CLOSED',     'Contribution Period Closed',     'EMPLOYER'),
  E('CONTRIBUTIONS', 'C3_VALIDATION_FAILED',           'C3 Validation Failed',           'EMPLOYER'),
  E('CONTRIBUTIONS', 'C3_RECONCILIATION_COMPLETED',    'C3 Reconciliation Completed',    'EMPLOYER'),

  // Benefits
  E('BENEFITS', 'BENEFIT_CLAIM_RECEIVED',            'Benefit Claim Received',            'CLAIMANT', ['DOCUMENT','EMAIL','SMS']),
  E('BENEFITS', 'BENEFIT_CLAIM_UNDER_REVIEW',        'Benefit Claim Under Review',        'CLAIMANT'),
  E('BENEFITS', 'BENEFIT_CLAIM_INFORMATION_REQUIRED','Benefit Claim Information Required','CLAIMANT'),
  E('BENEFITS', 'BENEFIT_CLAIM_APPROVED',            'Benefit Claim Approved',            'CLAIMANT', ['DOCUMENT','EMAIL','SMS']),
  E('BENEFITS', 'BENEFIT_CLAIM_REJECTED',            'Benefit Claim Rejected',            'CLAIMANT', ['DOCUMENT','EMAIL']),
  E('BENEFITS', 'BENEFIT_PAYMENT_AUTHORIZED',        'Benefit Payment Authorized',        'BENEFICIARY'),
  E('BENEFITS', 'BENEFIT_PAYMENT_RELEASED',          'Benefit Payment Released',          'BENEFICIARY', ['DOCUMENT','EMAIL','SMS']),
  E('BENEFITS', 'BENEFIT_OVERPAYMENT_NOTICE',        'Benefit Overpayment Notice',        'BENEFICIARY'),

  // Compliance
  E('COMPLIANCE', 'COMPLIANCE_CASE_OPENED',          'Compliance Case Opened',            'EMPLOYER'),
  E('COMPLIANCE', 'COMPLIANCE_INFORMATION_REQUEST',  'Compliance Information Request',    'EMPLOYER'),
  E('COMPLIANCE', 'COMPLIANCE_WARNING_NOTICE',       'Compliance Warning Notice',         'EMPLOYER'),
  E('COMPLIANCE', 'COMPLIANCE_PENALTY_NOTICE',       'Compliance Penalty Notice',         'EMPLOYER'),
  E('COMPLIANCE', 'COMPLIANCE_CASE_CLOSED',          'Compliance Case Closed',            'EMPLOYER'),
  E('COMPLIANCE', 'INSPECTION_SCHEDULED',            'Inspection Scheduled',              'EMPLOYER'),
  E('COMPLIANCE', 'INSPECTION_FINDINGS_NOTICE',      'Inspection Findings Notice',        'EMPLOYER'),

  // Finance
  E('FINANCE', 'PAYMENT_RECEIPT',                    'Payment Receipt',                   'EMPLOYER', ['DOCUMENT','EMAIL']),
  E('FINANCE', 'PAYMENT_FAILED',                     'Payment Failed',                    'EMPLOYER', ['EMAIL','SMS']),
  E('FINANCE', 'REFUND_APPROVED',                    'Refund Approved',                   'EMPLOYER'),
  E('FINANCE', 'REFUND_REJECTED',                    'Refund Rejected',                   'EMPLOYER'),
  E('FINANCE', 'PAYMENT_REVERSAL_NOTICE',            'Payment Reversal Notice',           'EMPLOYER'),
  E('FINANCE', 'BANK_RECONCILIATION_EXCEPTION',      'Bank Reconciliation Exception',     'FINANCE_OFFICER', ['EMAIL','IN_APP']),

  // Legal
  E('LEGAL', 'LEGAL_NOTICE_OF_ACTION',               'Legal Notice of Action',            'EMPLOYER'),
  E('LEGAL', 'LEGAL_HEARING_NOTICE',                 'Legal Hearing Notice',              'EMPLOYER'),
  E('LEGAL', 'LEGAL_DECISION_NOTICE',                'Legal Decision Notice',             'EMPLOYER'),
  E('LEGAL', 'LEGAL_APPEAL_RIGHTS_NOTICE',           'Legal Appeal Rights Notice',        'EMPLOYER'),
  E('LEGAL', 'LEGAL_CASE_CLOSED',                    'Legal Case Closed',                 'EMPLOYER'),
  // Internal legal review — routed to internal admin/legal officer, not customer.
  E('LEGAL', 'LEGAL_REVIEW_REQUIRED_NOTICE',         'Legal Review Required',             'ADMIN_USER', ['EMAIL','IN_APP']),

  // Workflow
  E('WORKFLOW', 'WORKFLOW_TASK_ASSIGNED',            'Workflow Task Assigned',            'STAFF', ['EMAIL','IN_APP']),
  E('WORKFLOW', 'WORKFLOW_TASK_OVERDUE',             'Workflow Task Overdue',             'STAFF', ['EMAIL','IN_APP']),
  E('WORKFLOW', 'WORKFLOW_REQUEST_APPROVED',         'Workflow Request Approved',         'STAFF', ['EMAIL','IN_APP']),
  E('WORKFLOW', 'WORKFLOW_REQUEST_REJECTED',         'Workflow Request Rejected',         'STAFF', ['EMAIL','IN_APP']),
  E('WORKFLOW', 'WORKFLOW_REQUEST_RETURNED',         'Workflow Request Returned',         'STAFF', ['EMAIL','IN_APP']),
  E('WORKFLOW', 'WORKFLOW_ESCALATION_NOTICE',        'Workflow Escalation Notice',        'APPROVER', ['EMAIL','IN_APP']),

  // Admin
  E('ADMIN', 'USER_ACCOUNT_CREATED',                 'User Account Created',              'ADMIN_USER', ['EMAIL']),
  E('ADMIN', 'PASSWORD_RESET_NOTICE',                'Password Reset Notice',             'ADMIN_USER', ['EMAIL','SMS']),
  E('ADMIN', 'ROLE_CHANGED_NOTICE',                  'Role Changed Notice',               'ADMIN_USER', ['EMAIL','IN_APP']),
  E('ADMIN', 'DELEGATION_CREATED',                   'Delegation Created',                'ADMIN_USER', ['EMAIL','IN_APP']),
  E('ADMIN', 'SYSTEM_MAINTENANCE_NOTICE',            'System Maintenance Notice',         'ADMIN_USER', ['EMAIL','IN_APP']),
  E('ADMIN', 'REFERENCE_DATA_CHANGE_APPROVED',       'Reference Data Change Approved',    'ADMIN_USER', ['EMAIL','IN_APP']),

  // Communication Hub — internal/admin-only pilot events. NOT customer-facing.
  // Risk level: low/internal. Default testMode is enforced by the caller.
  E('COMM_HUB', 'ADMIN_TEST_NOTICE',                 'Admin Test Notice',                 'ADMIN_USER', ['EMAIL']),
];

export const findBusinessEvent = (code: string): CommBusinessEvent | undefined =>
  COMM_BUSINESS_EVENTS.find((e) => e.code === code);

export const businessEventsByModule = (moduleCode: ModuleCode): CommBusinessEvent[] =>
  COMM_BUSINESS_EVENTS.filter((e) => e.moduleCode === moduleCode);
