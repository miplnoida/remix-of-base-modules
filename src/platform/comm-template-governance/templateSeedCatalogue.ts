/**
 * OM-9.7.6 — Starter Communication Template Seeds.
 *
 * Provides safe, generic starter DOCUMENT/EMAIL/SMS/IN_APP wording for the
 * catalogued business events. Real legally-final wording must replace these
 * via an approved template edit + version bump.
 */
import type { ModuleCode, OutputChannel, RecipientType } from './businessEventCatalogue';

export interface CommTemplateSeed {
  template_code: string;
  template_name: string;
  template_type: 'DOCUMENT' | 'EMAIL' | 'SMS' | 'IN_APP' | 'PORTAL_MESSAGE'
    | 'WORKFLOW_NOTIFICATION' | 'REPORT_COVER' | 'CERTIFICATE' | 'RECEIPT' | 'STATEMENT' | 'LEGAL_NOTICE';
  template_category: string;
  module_code: ModuleCode;
  business_event_code: string;
  recipient_type: RecipientType;
  output_channel: OutputChannel;
  language_code: string;
  status: 'ACTIVE';
  version_no: number;
  approval_policy: 'ADMIN_APPROVAL';
  default_letterhead_required: boolean;
  signature_required: boolean;
  disclaimer_required: boolean;
  print_footer_required: boolean;
  required_tokens: string[];
  optional_tokens: string[];
  sample_subject: string | null;
  sample_body: string;
  sample_sms_body: string | null;
  source_scope: 'ORG';
  is_system_seeded: true;
  is_active: true;
}

const DOC = (
  moduleCode: ModuleCode, event: string, name: string, recipient: RecipientType,
  subject: string, body: string, required: string[] = [],
  category = 'GENERAL_LETTER',
): CommTemplateSeed => ({
  template_code: `TMPL_${event}_DOCUMENT`,
  template_name: name,
  template_type: event.includes('RECEIPT') ? 'RECEIPT' : 'DOCUMENT',
  template_category: category,
  module_code: moduleCode,
  business_event_code: event,
  recipient_type: recipient,
  output_channel: 'DOCUMENT',
  language_code: 'en',
  status: 'ACTIVE',
  version_no: 1,
  approval_policy: 'ADMIN_APPROVAL',
  default_letterhead_required: true,
  signature_required: true,
  disclaimer_required: true,
  print_footer_required: true,
  required_tokens: ['organization.name', 'recipient.name', 'current.date', ...required],
  optional_tokens: ['office.name', 'office.address', 'office.phone', 'reference.number'],
  sample_subject: subject,
  sample_body: body,
  sample_sms_body: null,
  source_scope: 'ORG',
  is_system_seeded: true,
  is_active: true,
});

const EML = (
  moduleCode: ModuleCode, event: string, name: string, recipient: RecipientType,
  subject: string, body: string, required: string[] = [],
): CommTemplateSeed => ({
  template_code: `TMPL_${event}_EMAIL`,
  template_name: name,
  template_type: 'EMAIL',
  template_category: 'TRANSACTIONAL_EMAIL',
  module_code: moduleCode,
  business_event_code: event,
  recipient_type: recipient,
  output_channel: 'EMAIL',
  language_code: 'en',
  status: 'ACTIVE',
  version_no: 1,
  approval_policy: 'ADMIN_APPROVAL',
  default_letterhead_required: false,
  signature_required: true,
  disclaimer_required: true,
  print_footer_required: false,
  required_tokens: ['organization.name', 'recipient.name', ...required],
  optional_tokens: ['support.email', 'support.phone', 'portal.loginUrl', 'reference.number'],
  sample_subject: subject,
  sample_body: body,
  sample_sms_body: null,
  source_scope: 'ORG',
  is_system_seeded: true,
  is_active: true,
});

const SMS = (
  moduleCode: ModuleCode, event: string, name: string, recipient: RecipientType,
  smsBody: string, required: string[] = [],
): CommTemplateSeed => ({
  template_code: `TMPL_${event}_SMS`,
  template_name: name,
  template_type: 'SMS',
  template_category: 'TRANSACTIONAL_SMS',
  module_code: moduleCode,
  business_event_code: event,
  recipient_type: recipient,
  output_channel: 'SMS',
  language_code: 'en',
  status: 'ACTIVE',
  version_no: 1,
  approval_policy: 'ADMIN_APPROVAL',
  default_letterhead_required: false,
  signature_required: false,
  disclaimer_required: false,
  print_footer_required: false,
  required_tokens: ['organization.name', ...required],
  optional_tokens: ['reference.number'],
  sample_subject: null,
  sample_body: smsBody,
  sample_sms_body: smsBody,
  source_scope: 'ORG',
  is_system_seeded: true,
  is_active: true,
});

const INAPP = (
  moduleCode: ModuleCode, event: string, name: string, recipient: RecipientType,
  subject: string, body: string, required: string[] = [],
): CommTemplateSeed => ({
  template_code: `TMPL_${event}_IN_APP`,
  template_name: name,
  template_type: 'IN_APP',
  template_category: 'IN_APP_MESSAGE',
  module_code: moduleCode,
  business_event_code: event,
  recipient_type: recipient,
  output_channel: 'IN_APP',
  language_code: 'en',
  status: 'ACTIVE',
  version_no: 1,
  approval_policy: 'ADMIN_APPROVAL',
  default_letterhead_required: false,
  signature_required: false,
  disclaimer_required: false,
  print_footer_required: false,
  required_tokens: ['recipient.name', ...required],
  optional_tokens: ['portal.loginUrl'],
  sample_subject: subject,
  sample_body: body,
  sample_sms_body: null,
  source_scope: 'ORG',
  is_system_seeded: true,
  is_active: true,
});

const ORG_HDR = 'Dear {{recipient.name}},\n\n';
const ORG_FTR = '\n\nRegards,\n{{department.name}}\n{{organization.name}}\n{{current.date}}';

export const COMM_TEMPLATE_SEEDS: CommTemplateSeed[] = [
  // Employer
  DOC('EMPLOYER', 'EMPLOYER_REGISTRATION_APPROVED', 'Employer Registration Approval Letter', 'EMPLOYER',
    'Employer Registration Approved — {{employer.number}}',
    `${ORG_HDR}We are pleased to confirm that your employer registration ({{employer.number}}) has been approved as of {{current.date}}.${ORG_FTR}`,
    ['employer.number']),
  EML('EMPLOYER', 'EMPLOYER_REGISTRATION_APPROVED', 'Employer Registration Approved Email', 'EMPLOYER',
    'Employer Registration Approved',
    `${ORG_HDR}Your employer registration ({{employer.number}}) has been approved. You can now sign in to the portal at {{portal.loginUrl}}.${ORG_FTR}`,
    ['employer.number']),
  SMS('EMPLOYER', 'EMPLOYER_REGISTRATION_APPROVED', 'Employer Registration Approved SMS', 'EMPLOYER',
    '{{organization.name}}: Employer registration {{employer.number}} approved.',
    ['employer.number']),

  DOC('EMPLOYER', 'EMPLOYER_ARREARS_NOTICE', 'Employer Arrears Notice', 'EMPLOYER',
    'Arrears Notice — {{employer.number}}',
    `${ORG_HDR}Our records show contributions in arrears of {{arrears.amount}} for the period {{arrears.period}}. Please settle immediately or contact us to arrange a payment plan.${ORG_FTR}`,
    ['employer.number','arrears.amount','arrears.period'], 'COMPLIANCE_NOTICE'),

  // Insured Person
  DOC('INSURED_PERSON', 'IP_REGISTRATION_APPROVED', 'Insured Person Registration Approval Letter', 'INSURED_PERSON',
    'Registration Approved — {{insuredPerson.number}}',
    `${ORG_HDR}Your registration has been approved. Your Social Security Number is {{insuredPerson.number}}.${ORG_FTR}`,
    ['insuredPerson.number']),
  EML('INSURED_PERSON', 'IP_REGISTRATION_APPROVED', 'IP Registration Approved Email', 'INSURED_PERSON',
    'Your Registration is Approved',
    `${ORG_HDR}Your registration has been approved. Your SSN is {{insuredPerson.number}}.${ORG_FTR}`,
    ['insuredPerson.number']),
  SMS('INSURED_PERSON', 'IP_REGISTRATION_APPROVED', 'IP Registration Approved SMS', 'INSURED_PERSON',
    '{{organization.name}}: Your registration is approved. SSN: {{insuredPerson.number}}.',
    ['insuredPerson.number']),

  // Contributions
  DOC('CONTRIBUTIONS', 'CONTRIBUTION_PAYMENT_RECEIVED', 'Contribution Payment Receipt', 'EMPLOYER',
    'Payment Receipt — {{receipt.number}}',
    `${ORG_HDR}We acknowledge receipt of contribution payment {{payment.reference}} for period {{contribution.period}}, amount {{contribution.amount}}, received on {{contribution.receivedDate}}.${ORG_FTR}`,
    ['payment.reference','contribution.period','contribution.amount','contribution.receivedDate','receipt.number'], 'PAYMENT_RECEIPT'),
  EML('CONTRIBUTIONS', 'CONTRIBUTION_RETURN_REJECTED', 'C3 Return Rejected Email', 'EMPLOYER',
    'C3 Return Rejected — {{contribution.period}}',
    `${ORG_HDR}Your C3 return for {{contribution.period}} was rejected. Please review the validation errors in the portal.${ORG_FTR}`,
    ['contribution.period']),

  // Benefits
  DOC('BENEFITS', 'BENEFIT_CLAIM_APPROVED', 'Benefit Claim Approval Letter', 'CLAIMANT',
    'Benefit Claim Approved — {{claim.number}}',
    `${ORG_HDR}Your claim {{claim.number}} ({{claim.type}}) has been approved. Total benefit: {{benefit.amount}}. Payment scheduled: {{benefit.paymentDate}}.${ORG_FTR}`,
    ['claim.number','claim.type','benefit.amount','benefit.paymentDate']),
  EML('BENEFITS', 'BENEFIT_CLAIM_APPROVED', 'Benefit Claim Approved Email', 'CLAIMANT',
    'Your Claim {{claim.number}} is Approved',
    `${ORG_HDR}Good news — your claim {{claim.number}} has been approved for {{benefit.amount}}.${ORG_FTR}`,
    ['claim.number','benefit.amount']),
  SMS('BENEFITS', 'BENEFIT_CLAIM_APPROVED', 'Benefit Claim Approved SMS', 'CLAIMANT',
    '{{organization.name}}: Claim {{claim.number}} approved for {{benefit.amount}}.',
    ['claim.number','benefit.amount']),
  DOC('BENEFITS', 'BENEFIT_CLAIM_REJECTED', 'Benefit Claim Rejection Letter', 'CLAIMANT',
    'Benefit Claim Rejected — {{claim.number}}',
    `${ORG_HDR}Your claim {{claim.number}} has been reviewed and could not be approved at this time.${ORG_FTR}`,
    ['claim.number']),

  // Compliance
  DOC('COMPLIANCE', 'COMPLIANCE_WARNING_NOTICE', 'Compliance Warning Notice', 'EMPLOYER',
    'Compliance Warning — {{employer.number}}',
    `${ORG_HDR}This is a formal compliance warning. Please respond within the required timeframe.${ORG_FTR}`,
    ['employer.number'], 'COMPLIANCE_NOTICE'),

  // Finance
  DOC('FINANCE', 'PAYMENT_RECEIPT', 'Payment Receipt', 'EMPLOYER',
    'Payment Receipt — {{receipt.number}}',
    `${ORG_HDR}Receipt {{receipt.number}} for {{payment.amount}} received on {{payment.date}}.${ORG_FTR}`,
    ['receipt.number','payment.amount','payment.date'], 'PAYMENT_RECEIPT'),

  // Legal
  DOC('LEGAL', 'LEGAL_HEARING_NOTICE', 'Legal Hearing Notice', 'EMPLOYER',
    'Hearing Notice — {{case.number}}',
    `${ORG_HDR}A hearing is scheduled for case {{case.number}} on {{hearing.date}} at {{hearing.location}}.${ORG_FTR}`,
    ['case.number','hearing.date','hearing.location'], 'LEGAL_NOTICE'),

  // Workflow
  EML('WORKFLOW', 'WORKFLOW_TASK_ASSIGNED', 'Workflow Task Assigned Email', 'STAFF',
    'Task Assigned: {{workflow.taskName}}',
    `${ORG_HDR}You have been assigned task {{workflow.taskName}} (instance {{workflow.instanceNumber}}), due {{workflow.dueDate}}.${ORG_FTR}`,
    ['workflow.taskName','workflow.instanceNumber','workflow.dueDate']),
  INAPP('WORKFLOW', 'WORKFLOW_TASK_ASSIGNED', 'Workflow Task Assigned In-App Message', 'STAFF',
    'New task: {{workflow.taskName}}',
    'Task {{workflow.taskName}} assigned to you, due {{workflow.dueDate}}.',
    ['workflow.taskName','workflow.dueDate']),

  // Admin
  EML('ADMIN', 'USER_ACCOUNT_CREATED', 'User Account Created Email', 'ADMIN_USER',
    'Your account is ready',
    `${ORG_HDR}An account has been created for you on the {{organization.name}} system. Please sign in at {{portal.loginUrl}}.${ORG_FTR}`),
  EML('ADMIN', 'PASSWORD_RESET_NOTICE', 'Password Reset Email', 'ADMIN_USER',
    'Password reset request',
    `${ORG_HDR}A password reset was requested for your account. If this was not you, contact {{support.email}}.${ORG_FTR}`),
];
