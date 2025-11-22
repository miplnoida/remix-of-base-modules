import { NotificationTemplate } from '@/types/notification';

// Comprehensive St. Kitts & Nevis Social Security Board Templates
// Covering Email, SMS, Push Notifications, and Physical Letters

export const comprehensiveTemplates: NotificationTemplate[] = [
  // ===== COMPLIANCE MODULE =====
  {
    templateId: 'COMP-EMAIL-001',
    templateName: 'First Arrears Notice - Email',
    module: 'Compliance',
    channel: 'Email',
    subject: 'Notice: Outstanding Contributions - {EmployerName}',
    bodyText: `Dear {EmployerName},

Our records indicate outstanding Social Security contributions for your organization.

Outstanding Period(s): {Periods}
Total Amount Due: XCD {TotalAmount}
SSC Component: XCD {SSCAmount}
Levy Component: XCD {LevyAmount}
Severance Component: XCD {SeveranceAmount}

Please remit payment within 7 days to avoid additional penalties and interest charges.

Payment Options:
- Online: www.ssbpay.gov.kn
- In Person: Social Security Board, Basseterre
- Bank Transfer: Account details below

For payment arrangements, contact compliance@ssb.gov.kn or call +1-869-465-2519.

Regards,
Compliance Department
Social Security Board, St. Kitts & Nevis`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'First formal notice for outstanding contributions',
    sampleParameters: {
      EmployerName: 'ABC Construction Ltd',
      Periods: 'January - March 2025',
      TotalAmount: '15,000.00',
      SSCAmount: '8,000.00',
      LevyAmount: '5,000.00',
      SeveranceAmount: '2,000.00'
    }
  },
  {
    templateId: 'COMP-LETTER-001',
    templateName: 'First Arrears Notice - Physical Letter',
    module: 'Compliance',
    channel: 'Letter',
    subject: 'OFFICIAL NOTICE - Outstanding Contributions',
    bodyText: `[SSB LETTERHEAD]

Date: {IssueDate}
Reference: {ReferenceNumber}

{EmployerName}
{EmployerAddress}

Dear Sir/Madam,

RE: OUTSTANDING SOCIAL SECURITY CONTRIBUTIONS

We write to inform you that our records indicate outstanding contributions owed by your organization to the Social Security Board.

DETAILS OF ARREARS:
Period(s): {Periods}
Social Security Contributions (SSC): XCD {SSCAmount}
Housing & Development Levy: XCD {LevyAmount}
Severance Contributions: XCD {SeveranceAmount}
Penalties: XCD {PenaltyAmount}
Interest Charges: XCD {InterestAmount}
-------------------
TOTAL AMOUNT DUE: XCD {TotalAmount}

PAYMENT DEADLINE: {PaymentDeadline}

Failure to remit payment or contact us within seven (7) days from the date of this notice will result in escalation to our Legal Department and may include court proceedings.

To discuss payment arrangements, please contact our Compliance Department immediately.

Yours faithfully,

{ComplianceOfficerName}
{ComplianceOfficerTitle}
Compliance Department
Social Security Board

Contact: +1-869-465-2519 | compliance@ssb.gov.kn`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Formal physical letter for first arrears notice',
    sampleParameters: {
      IssueDate: '2025-02-20',
      ReferenceNumber: 'SSB/COMP/2025/045',
      EmployerName: 'ABC Construction Ltd',
      EmployerAddress: '123 Industrial Estate, Basseterre, St. Kitts',
      Periods: 'January - March 2025',
      SSCAmount: '8,000.00',
      LevyAmount: '5,000.00',
      SeveranceAmount: '2,000.00',
      PenaltyAmount: '1,200.00',
      InterestAmount: '450.00',
      TotalAmount: '16,650.00',
      PaymentDeadline: '2025-02-27',
      ComplianceOfficerName: 'John Smith',
      ComplianceOfficerTitle: 'Senior Compliance Officer'
    }
  },
  {
    templateId: 'COMP-SMS-001',
    templateName: 'C3 Submission Reminder - SMS',
    module: 'Compliance',
    channel: 'SMS',
    subject: '',
    bodyText: 'SSB: Your C3 for {Period} is due {DueDate}. Submit online at www.ssbpay.gov.kn or visit our office. Call 465-2519 for assistance.',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'SMS reminder for upcoming C3 submission deadline',
    sampleParameters: {
      Period: 'February 2025',
      DueDate: 'March 15'
    }
  },
  {
    templateId: 'COMP-PUSH-001',
    templateName: 'C3 Overdue Alert - Push Notification',
    module: 'Compliance',
    channel: 'Push',
    subject: 'C3 Submission Overdue',
    bodyText: 'Your C3 for {Period} is now {DaysOverdue} days overdue. Penalties apply. Submit immediately.',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Push notification for overdue C3 submissions',
    sampleParameters: {
      Period: 'January 2025',
      DaysOverdue: '10'
    }
  },
  {
    templateId: 'COMP-LETTER-002',
    templateName: 'Inspection Notice - Physical Letter',
    module: 'Compliance',
    channel: 'Letter',
    subject: 'NOTICE OF COMPLIANCE INSPECTION',
    bodyText: `[SSB LETTERHEAD]

Date: {IssueDate}
Reference: {ReferenceNumber}

{EmployerName}
{EmployerAddress}

Dear Sir/Madam,

RE: NOTICE OF COMPLIANCE INSPECTION

This serves as official notification that the Social Security Board will conduct a compliance inspection of your organization's records.

INSPECTION DETAILS:
Date: {InspectionDate}
Time: {InspectionTime}
Inspector: {InspectorName}
Expected Duration: {Duration}

DOCUMENTS REQUIRED:
- Employee wage records for periods {ReviewPeriods}
- C3 Submission records
- Payroll registers
- Employment contracts
- Time and attendance records

Please ensure all documents are available and that a responsible officer is present during the inspection.

Failure to cooperate may result in penalties under Section {LegalSection} of the Social Security Act.

For questions, contact {InspectorName} at {InspectorPhone}.

Yours faithfully,

{SupervisorName}
{SupervisorTitle}
Compliance Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Official notice for scheduled compliance inspection',
    sampleParameters: {
      IssueDate: '2025-03-01',
      ReferenceNumber: 'SSB/COMP/INS/2025/089',
      EmployerName: 'XYZ Hotel & Resort',
      EmployerAddress: '456 Frigate Bay Road, Basseterre',
      InspectionDate: '2025-03-15',
      InspectionTime: '09:00 AM',
      InspectorName: 'Jane Williams',
      Duration: '4 hours',
      ReviewPeriods: 'January 2024 - December 2024',
      LegalSection: '28(3)',
      InspectorPhone: '+1-869-465-2519 ext. 305',
      SupervisorName: 'Michael Thompson',
      SupervisorTitle: 'Compliance Supervisor'
    }
  },

  // ===== BENEFITS MODULE =====
  {
    templateId: 'BEN-EMAIL-001',
    templateName: 'Benefit Application Received - Email',
    module: 'Benefits',
    channel: 'Email',
    subject: 'Application Received - {BenefitType} Claim {ClaimNumber}',
    bodyText: `Dear {ApplicantName},

Thank you for submitting your application for {BenefitType} benefits.

Application Details:
Claim Number: {ClaimNumber}
Date Received: {ReceivedDate}
Processing Officer: {ProcessingOfficer}
Estimated Processing Time: {ProcessingTime} business days

Next Steps:
1. Your application is under review
2. You will be contacted if additional documents are required
3. Decision notification will be sent via email and SMS

Track your application status online at www.ssb.gov.kn/claims using your claim number.

For inquiries, contact benefits@ssb.gov.kn or call +1-869-465-2519.

Best regards,
Benefits Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Confirmation email for benefit application receipt',
    sampleParameters: {
      ApplicantName: 'John Doe',
      BenefitType: 'Sickness Benefit',
      ClaimNumber: 'BEN-2025-001234',
      ReceivedDate: '2025-02-20',
      ProcessingOfficer: 'Sarah Johnson',
      ProcessingTime: '14'
    }
  },
  {
    templateId: 'BEN-LETTER-001',
    templateName: 'Benefit Claim Approved - Physical Letter',
    module: 'Benefits',
    channel: 'Letter',
    subject: 'BENEFIT CLAIM APPROVAL NOTIFICATION',
    bodyText: `[SSB LETTERHEAD]

Date: {IssueDate}
Reference: {ReferenceNumber}

{ApplicantName}
{ApplicantAddress}

Dear {ApplicantName},

RE: APPROVAL OF {BenefitType} CLAIM - {ClaimNumber}

We are pleased to inform you that your application for {BenefitType} has been approved.

CLAIM DETAILS:
Claim Number: {ClaimNumber}
Benefit Type: {BenefitType}
Approved Amount: XCD {ApprovedAmount}
Benefit Period: {BenefitPeriod}
Weekly/Monthly Rate: XCD {PaymentRate}

PAYMENT INFORMATION:
First Payment Date: {FirstPaymentDate}
Payment Method: {PaymentMethod}
Bank Account: {BankAccount} (if applicable)

{AdditionalInstructions}

If you have any questions regarding your benefit payments, please contact our Benefits Department at +1-869-465-2519 or benefits@ssb.gov.kn.

Congratulations on your approved claim.

Yours sincerely,

{BenefitsOfficerName}
{BenefitsOfficerTitle}
Benefits Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Official approval letter for benefit claims',
    sampleParameters: {
      IssueDate: '2025-02-25',
      ReferenceNumber: 'SSB/BEN/2025/1234',
      ApplicantName: 'John Doe',
      ApplicantAddress: '789 Cayon Street, Basseterre, St. Kitts',
      BenefitType: 'Sickness Benefit',
      ClaimNumber: 'BEN-2025-001234',
      ApprovedAmount: '2,500.00',
      BenefitPeriod: '4 weeks',
      PaymentRate: '625.00',
      FirstPaymentDate: '2025-03-01',
      PaymentMethod: 'Direct Deposit',
      BankAccount: '****1234',
      AdditionalInstructions: 'Please submit medical certificates for continued payments.',
      BenefitsOfficerName: 'Mary Williams',
      BenefitsOfficerTitle: 'Senior Benefits Officer'
    }
  },
  {
    templateId: 'BEN-SMS-001',
    templateName: 'Benefit Payment Processed - SMS',
    module: 'Benefits',
    channel: 'SMS',
    subject: '',
    bodyText: 'SSB: Your {BenefitType} payment of XCD {Amount} for {Period} has been processed. Check your bank account or collect cheque at our office.',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'SMS notification for benefit payment processing',
    sampleParameters: {
      BenefitType: 'Age Pension',
      Amount: '800.00',
      Period: 'March 2025'
    }
  },
  {
    templateId: 'BEN-LETTER-002',
    templateName: 'Benefit Claim Rejected - Physical Letter',
    module: 'Benefits',
    channel: 'Letter',
    subject: 'BENEFIT CLAIM DECISION - NOT APPROVED',
    bodyText: `[SSB LETTERHEAD]

Date: {IssueDate}
Reference: {ReferenceNumber}

{ApplicantName}
{ApplicantAddress}

Dear {ApplicantName},

RE: {BenefitType} CLAIM - {ClaimNumber}

After careful review of your application for {BenefitType}, we regret to inform you that your claim has not been approved.

REASON FOR NON-APPROVAL:
{RejectionReason}

ELIGIBILITY REQUIREMENTS:
{EligibilityRequirements}

RIGHT TO APPEAL:
You have the right to appeal this decision within thirty (30) days from the date of this letter. To file an appeal, submit a written request to:

Appeals Committee
Social Security Board
P.O. Box 79
Basseterre, St. Kitts

Please include your claim number ({ClaimNumber}) and grounds for appeal.

For clarification or additional information, contact our Benefits Department at +1-869-465-2519 or benefits@ssb.gov.kn.

Yours sincerely,

{BenefitsOfficerName}
{BenefitsOfficerTitle}
Benefits Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Official rejection letter with appeal rights',
    sampleParameters: {
      IssueDate: '2025-02-25',
      ReferenceNumber: 'SSB/BEN/2025/1456',
      ApplicantName: 'Jane Smith',
      ApplicantAddress: '321 Main Street, Charlestown, Nevis',
      BenefitType: 'Employment Injury Benefit',
      ClaimNumber: 'BEN-2025-001456',
      RejectionReason: 'Insufficient contributions during the reference period. Our records show only 28 weeks of contributions, whereas the minimum requirement is 39 weeks.',
      EligibilityRequirements: 'Employment Injury Benefit requires at least 39 weeks of paid contributions during the 52 weeks preceding the injury.',
      BenefitsOfficerName: 'Robert Brown',
      BenefitsOfficerTitle: 'Benefits Review Officer'
    }
  },
  {
    templateId: 'BEN-PUSH-001',
    templateName: 'Document Required - Push Notification',
    module: 'Benefits',
    channel: 'Push',
    subject: 'Documents Required for Claim {ClaimNumber}',
    bodyText: 'Your benefit claim requires additional documents: {DocumentList}. Submit within 7 days to avoid delays.',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Push notification for missing documents',
    sampleParameters: {
      ClaimNumber: 'BEN-2025-001234',
      DocumentList: 'Medical certificate, Birth certificate'
    }
  },

  // ===== LEGAL MODULE =====
  {
    templateId: 'LEG-LETTER-001',
    templateName: 'Legal Demand Letter - Physical',
    module: 'Legal',
    channel: 'Letter',
    subject: 'LEGAL DEMAND FOR PAYMENT - FINAL NOTICE',
    bodyText: `[SSB LETTERHEAD - LEGAL DEPARTMENT]

Date: {IssueDate}
Reference: {LegalCaseNumber}
Via Registered Mail

{EmployerName}
{EmployerAddress}

Dear Sir/Madam,

RE: LEGAL DEMAND FOR OUTSTANDING SOCIAL SECURITY CONTRIBUTIONS

CASE NUMBER: {LegalCaseNumber}

This is a formal legal demand for immediate payment of outstanding contributions owed to the Social Security Board.

STATEMENT OF ACCOUNT:
Outstanding Contributions (Principal): XCD {PrincipalAmount}
Accumulated Penalties: XCD {PenaltiesAmount}
Interest Charges: XCD {InterestAmount}
Legal Costs: XCD {LegalCosts}
----------------------------------------
TOTAL AMOUNT DUE: XCD {TotalDue}

LEGAL NOTICE:
Take notice that unless full payment is received within FOURTEEN (14) DAYS from the date of this letter, the Social Security Board will commence legal proceedings against your organization in the Magistrate's Court without further notice.

Legal action may result in:
1. Court-ordered payment with additional costs
2. Seizure and sale of assets
3. Business closure orders
4. Director liability proceedings

PAYMENT INSTRUCTIONS:
[Payment details]

This matter has been referred to our Legal Department. All future correspondence should reference case number {LegalCaseNumber}.

Legal Officer: {LegalOfficerName}
Contact: +1-869-465-2519 ext. {Extension}
Email: legal@ssb.gov.kn

DATED this {IssueDate}.

Yours faithfully,

_____________________________
{LegalOfficerName}
{LegalOfficerTitle}
Legal Department
Social Security Board

cc: Board Legal Counsel`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Final legal demand letter before court proceedings',
    sampleParameters: {
      IssueDate: '2025-03-01',
      LegalCaseNumber: 'SSB/LEG/2025/089',
      EmployerName: 'Delinquent Enterprises Ltd',
      EmployerAddress: '999 Commercial Avenue, Basseterre, St. Kitts',
      PrincipalAmount: '45,000.00',
      PenaltiesAmount: '12,000.00',
      InterestAmount: '8,500.00',
      LegalCosts: '5,000.00',
      TotalDue: '70,500.00',
      LegalOfficerName: 'Patricia Clarke, LL.B.',
      LegalOfficerTitle: 'Senior Legal Officer',
      Extension: '401'
    }
  },
  {
    templateId: 'LEG-EMAIL-001',
    templateName: 'Summons Issued Notification - Email',
    module: 'Legal',
    channel: 'Email',
    subject: 'URGENT: Court Summons Issued - Case {CaseNumber}',
    bodyText: `URGENT LEGAL NOTICE

Dear {EmployerName},

A court summons has been issued against your organization for non-payment of Social Security contributions.

Case Number: {CaseNumber}
Court: {CourtName}
Hearing Date: {HearingDate}
Hearing Time: {HearingTime}

You or your legal representative MUST appear in court on the specified date. Failure to appear may result in judgment being entered against you in your absence.

Amount Claimed: XCD {ClaimedAmount}
Plus Legal Costs: XCD {LegalCosts}

We strongly advise you to seek legal counsel immediately.

Contact our Legal Department urgently: legal@ssb.gov.kn or +1-869-465-2519.

Social Security Board - Legal Department`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Urgent notification of court summons',
    sampleParameters: {
      EmployerName: 'Delinquent Enterprises Ltd',
      CaseNumber: 'CIVIL-2025-345',
      CourtName: 'Magistrate Court No. 1, Basseterre',
      HearingDate: '2025-04-15',
      HearingTime: '10:00 AM',
      ClaimedAmount: '70,500.00',
      LegalCosts: '8,000.00'
    }
  },

  // ===== FINANCE MODULE =====
  {
    templateId: 'FIN-EMAIL-001',
    templateName: 'Payment Received Confirmation - Email',
    module: 'Finance',
    channel: 'Email',
    subject: 'Payment Confirmation - Receipt {ReceiptNumber}',
    bodyText: `Dear {PayerName},

Thank you for your payment to the Social Security Board.

PAYMENT DETAILS:
Receipt Number: {ReceiptNumber}
Date: {PaymentDate}
Amount: XCD {Amount}
Payment Method: {PaymentMethod}
Reference: {PaymentReference}

ALLOCATION:
{AllocationDetails}

Outstanding Balance: XCD {OutstandingBalance}

A copy of your official receipt is attached to this email. Please retain this for your records.

For inquiries, contact finance@ssb.gov.kn or call +1-869-465-2519.

Thank you for your compliance.

Finance Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Email confirmation for payments received',
    sampleParameters: {
      PayerName: 'ABC Construction Ltd',
      ReceiptNumber: 'RCP-2025-005678',
      PaymentDate: '2025-02-28',
      Amount: '10,000.00',
      PaymentMethod: 'Bank Transfer',
      PaymentReference: 'TRF-123456',
      AllocationDetails: 'C3 Jan 2025: XCD 5,000\nC3 Feb 2025: XCD 5,000',
      OutstandingBalance: '5,000.00'
    }
  },
  {
    templateId: 'FIN-SMS-001',
    templateName: 'Payment Receipt - SMS',
    module: 'Finance',
    channel: 'SMS',
    subject: '',
    bodyText: 'SSB: Payment XCD {Amount} received on {Date}. Receipt: {ReceiptNo}. Balance: XCD {Balance}. Thank you!',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Instant SMS payment confirmation',
    sampleParameters: {
      Amount: '2,500.00',
      Date: '28/02/2025',
      ReceiptNo: 'RCP-005678',
      Balance: '0.00'
    }
  },
  {
    templateId: 'FIN-LETTER-001',
    templateName: 'Statement of Account - Physical Letter',
    module: 'Finance',
    channel: 'Letter',
    subject: 'STATEMENT OF ACCOUNT',
    bodyText: `[SSB LETTERHEAD]

Date: {IssueDate}
Account Number: {AccountNumber}

{AccountHolderName}
{AccountHolderAddress}

Dear Sir/Madam,

RE: STATEMENT OF ACCOUNT AS AT {StatementDate}

Please find below your statement of account with the Social Security Board.

ACCOUNT SUMMARY:
Opening Balance (as at {OpeningDate}): XCD {OpeningBalance}

TRANSACTIONS:
{TransactionDetails}

CURRENT BALANCE:
Contributions Due: XCD {ContributionsDue}
Penalties: XCD {Penalties}
Interest: XCD {Interest}
Payments Received: XCD ({PaymentsReceived})
-----------------------------------
CLOSING BALANCE: XCD {ClosingBalance}

{PaymentInstructions}

For discrepancies or inquiries, contact our Finance Department within 14 days at finance@ssb.gov.kn or +1-869-465-2519.

Yours faithfully,

{FinanceOfficerName}
{FinanceOfficerTitle}
Finance Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Detailed account statement for employers/contributors',
    sampleParameters: {
      IssueDate: '2025-03-01',
      AccountNumber: 'EMP-12345',
      AccountHolderName: 'ABC Construction Ltd',
      AccountHolderAddress: '123 Industrial Estate, Basseterre',
      StatementDate: '2025-02-28',
      OpeningDate: '2025-01-01',
      OpeningBalance: '5,000.00',
      TransactionDetails: 'Jan C3 Due: XCD 5,000\nFeb C3 Due: XCD 5,000\nPayment 15/02: XCD (3,000)',
      ContributionsDue: '10,000.00',
      Penalties: '500.00',
      Interest: '200.00',
      PaymentsReceived: '3,000.00',
      ClosingBalance: '7,700.00',
      PaymentInstructions: 'Please settle this balance within 7 days.',
      FinanceOfficerName: 'Jennifer Adams',
      FinanceOfficerTitle: 'Senior Finance Officer'
    }
  },

  // ===== INTERNAL AUDIT MODULE =====
  {
    templateId: 'AUD-EMAIL-001',
    templateName: 'Audit Scheduled Notification - Email',
    module: 'InternalAudit',
    channel: 'Email',
    subject: 'Internal Audit Scheduled - {AuditType}',
    bodyText: `Dear {DepartmentHead},

An internal audit has been scheduled for your department.

AUDIT DETAILS:
Audit Type: {AuditType}
Audit Period: {AuditPeriod}
Scheduled Date: {AuditDate}
Lead Auditor: {AuditorName}
Estimated Duration: {Duration}

SCOPE:
{AuditScope}

REQUIRED PREPARATIONS:
1. Ensure all records are organized and accessible
2. Designate a liaison officer
3. Prepare workspace for audit team
4. Review checklist attached

A detailed audit plan will be shared 48 hours before commencement.

For questions, contact {AuditorEmail} or call ext. {Extension}.

Regards,
Internal Audit Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Notification of scheduled internal audit',
    sampleParameters: {
      DepartmentHead: 'Michael Johnson',
      AuditType: 'Compliance Review Audit',
      AuditPeriod: 'FY 2024',
      AuditDate: '2025-03-20',
      AuditorName: 'Sarah Williams',
      Duration: '3 days',
      AuditScope: 'Review of C3 processing procedures and employer compliance files',
      AuditorEmail: 'audit@ssb.gov.kn',
      Extension: '501'
    }
  },
  {
    templateId: 'AUD-LETTER-001',
    templateName: 'Audit Finding Report - Physical Letter',
    module: 'InternalAudit',
    channel: 'Letter',
    subject: 'AUDIT FINDINGS AND RECOMMENDATIONS',
    bodyText: `[SSB LETTERHEAD - INTERNAL AUDIT]

Date: {IssueDate}
Audit Reference: {AuditReference}
CONFIDENTIAL

{DepartmentHead}
{DepartmentName}

Dear {DepartmentHead},

RE: INTERNAL AUDIT FINDINGS - {AuditType}

Following the completion of our audit of {DepartmentName} covering period {AuditPeriod}, please find below our findings and recommendations.

AUDIT SUMMARY:
Audit Type: {AuditType}
Audit Period: {AuditPeriod}
Completion Date: {CompletionDate}
Lead Auditor: {AuditorName}

KEY FINDINGS:
{FindingsList}

RECOMMENDATIONS:
{RecommendationsList}

MANAGEMENT RESPONSE REQUIRED:
Please provide a written response to these findings within fourteen (14) days, including:
1. Action plan for each recommendation
2. Responsible officers assigned
3. Target completion dates
4. Resource requirements

A follow-up audit will be conducted in {FollowUpPeriod} to verify implementation.

For clarification, contact the Internal Audit Department at audit@ssb.gov.kn.

Yours faithfully,

{ChiefAuditorName}
{ChiefAuditorTitle}
Internal Audit Department

cc: Director General, Deputy Director`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Formal audit findings and recommendations letter',
    sampleParameters: {
      IssueDate: '2025-03-25',
      AuditReference: 'AUD/2025/012',
      DepartmentHead: 'Michael Johnson',
      DepartmentName: 'Compliance Department',
      AuditType: 'Operational Compliance Audit',
      AuditPeriod: 'January - December 2024',
      CompletionDate: '2025-03-23',
      AuditorName: 'Sarah Williams',
      FindingsList: '1. C3 verification process delays (15% of files)\n2. Missing supervisor approval in 8 cases\n3. Incomplete employer contact records',
      RecommendationsList: '1. Implement automated verification system\n2. Enforce mandatory supervisor sign-off\n3. Update CRM database with complete contact information',
      FollowUpPeriod: '6 months',
      ChiefAuditorName: 'David Brown',
      ChiefAuditorTitle: 'Chief Internal Auditor'
    }
  },

  // ===== REGISTRATION/CRD MODULE =====
  {
    templateId: 'REG-EMAIL-001',
    templateName: 'Registration Approved - Email',
    module: 'Registration',
    channel: 'Email',
    subject: 'Registration Approved - Welcome to Social Security',
    bodyText: `Dear {ApplicantName},

Congratulations! Your registration with the Social Security Board has been approved.

REGISTRATION DETAILS:
Social Security Number: {SSN}
Registration Date: {RegistrationDate}
Contributor Type: {ContributorType}
Contribution Category: {ContributionCategory}

Your Social Security card will be available for collection within 5 business days from our office at:

Social Security Board
West Independence Square Street
Basseterre, St. Kitts

Operating Hours: Monday - Friday, 8:00 AM - 3:30 PM

IMPORTANT: Please bring valid photo identification when collecting your card.

For inquiries, contact registration@ssb.gov.kn or call +1-869-465-2519.

Welcome to the Social Security System!

Customer Relationship Department
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Registration approval notification',
    sampleParameters: {
      ApplicantName: 'James Wilson',
      SSN: '234567890',
      RegistrationDate: '2025-02-28',
      ContributorType: 'Employed Person',
      ContributionCategory: 'Category 1'
    }
  },
  {
    templateId: 'REG-SMS-001',
    templateName: 'Card Ready for Collection - SMS',
    module: 'Registration',
    channel: 'SMS',
    subject: '',
    bodyText: 'SSB: Your Social Security card (SSN: {SSN}) is ready for collection. Visit our office Mon-Fri 8AM-3:30PM with photo ID.',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'SMS notification when card is ready',
    sampleParameters: {
      SSN: '****7890'
    }
  },

  // ===== GENERAL/SYSTEM =====
  {
    templateId: 'SYS-PUSH-001',
    templateName: 'System Maintenance Notice - Push',
    module: 'System',
    channel: 'Push',
    subject: 'Scheduled Maintenance: {Date}',
    bodyText: 'SSB systems will be unavailable on {Date} from {StartTime} to {EndTime} for scheduled maintenance. Plan accordingly.',
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'System maintenance notification',
    sampleParameters: {
      Date: 'March 15, 2025',
      StartTime: '6:00 PM',
      EndTime: '10:00 PM'
    }
  },
  {
    templateId: 'SYS-EMAIL-001',
    templateName: 'Password Reset Request - Email',
    module: 'System',
    channel: 'Email',
    subject: 'Password Reset Request for SSB Portal',
    bodyText: `Dear {UserName},

You have requested to reset your password for the Social Security Board online portal.

Click the link below to reset your password:
{ResetLink}

This link will expire in 24 hours.

If you did not request this reset, please ignore this email or contact support@ssb.gov.kn immediately.

For security reasons, never share your password with anyone.

Technical Support
Social Security Board`,
    languageCode: 'en',
    isActive: true,
    versionNo: 1,
    createdBy: 'System Admin',
    createdOn: '2024-01-01T00:00:00',
    description: 'Password reset email with secure link',
    sampleParameters: {
      UserName: 'John Doe',
      ResetLink: 'https://portal.ssb.gov.kn/reset/abc123xyz'
    }
  },
];
