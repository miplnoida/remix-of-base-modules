import { 
  NotificationTemplate, 
  NotificationRequest, 
  NotificationMessage, 
  NotificationDeliveryAttempt,
  ChannelConfiguration,
  NotificationPreference 
} from '@/types/notification';
import { comprehensiveTemplates } from './comprehensiveTemplates';

export const notificationTemplates: NotificationTemplate[] = comprehensiveTemplates;

export const notificationRequests: NotificationRequest[] = [
  {
    requestId: 'REQ001',
    sourceModule: 'Compliance',
    sourceContextType: 'ComplianceSubcase',
    sourceContextId: 'SUB123',
    sourceContextReference: 'CMP-2025-045',
    templateId: 'TPL001',
    templateName: 'C3 Late Submission Reminder - Email',
    channel: 'Email',
    recipients: [
      {
        recipientId: 'RCP001',
        requestId: 'REQ001',
        partyType: 'Employer',
        partyId: 'EMP12345',
        partyName: 'ABC Construction Ltd',
        channelAddress: 'finance@abcconstruction.kn',
        deliveryChannel: 'Email',
        preferredLanguage: 'en'
      }
    ],
    parameters: {
      EmployerName: 'ABC Construction Ltd',
      Period: 'January 2025',
      AmountXCD: '5,000.00',
      DueDate: '2025-02-15',
      DaysOverdue: '10'
    },
    priority: 'High',
    requestedByUserId: 'USER001',
    requestedByUserName: 'Jane Smith',
    requestedDateTime: '2025-02-25T10:30:00',
    status: 'Completed',
    completedDateTime: '2025-02-25T10:31:15',
    totalRecipients: 1,
    successfulSends: 1,
    failedSends: 0
  },
  {
    requestId: 'REQ002',
    sourceModule: 'Benefits',
    sourceContextType: 'BenefitClaim',
    sourceContextId: 'BEN001',
    sourceContextReference: 'BEN-2025-001',
    templateId: 'TPL003',
    templateName: 'Benefit Claim Approved - Email',
    channel: 'Email',
    recipients: [
      {
        recipientId: 'RCP002',
        requestId: 'REQ002',
        partyType: 'InsuredPerson',
        partyId: 'IP67890',
        partyName: 'John Doe',
        channelAddress: 'john.doe@email.com',
        deliveryChannel: 'Email',
        preferredLanguage: 'en'
      }
    ],
    parameters: {
      ApplicantName: 'John Doe',
      ClaimNumber: 'BEN-2025-001',
      BenefitType: 'Sickness Benefit',
      ApprovedAmount: '2,500.00',
      PaymentDate: '2025-02-28'
    },
    priority: 'Normal',
    requestedByUserId: 'USER002',
    requestedByUserName: 'Robert Brown',
    requestedDateTime: '2025-02-20T14:00:00',
    status: 'Completed',
    completedDateTime: '2025-02-20T14:00:45',
    totalRecipients: 1,
    successfulSends: 1,
    failedSends: 0
  },
  {
    requestId: 'REQ003',
    sourceModule: 'Finance',
    sourceContextType: 'Payment',
    sourceContextId: 'PAY456',
    sourceContextReference: 'RCP-2025-123',
    templateId: 'TPL004',
    templateName: 'Payment Received Confirmation - SMS',
    channel: 'SMS',
    recipients: [
      {
        recipientId: 'RCP003',
        requestId: 'REQ003',
        partyType: 'Employer',
        partyId: 'EMP11111',
        partyName: 'XYZ Hotel & Resort',
        channelAddress: '+1-869-555-0199',
        deliveryChannel: 'SMS',
        preferredLanguage: 'en'
      }
    ],
    parameters: {
      Amount: '1,000.00',
      Reference: 'Invoice INV-001',
      ReceiptNo: 'RCP-2025-123'
    },
    priority: 'Normal',
    requestedByUserId: 'SYSTEM',
    requestedByUserName: 'System - Auto',
    requestedDateTime: '2025-02-25T16:45:00',
    status: 'Completed',
    completedDateTime: '2025-02-25T16:45:02',
    totalRecipients: 1,
    successfulSends: 1,
    failedSends: 0
  },
  {
    requestId: 'REQ004',
    sourceModule: 'Scheduler',
    sourceContextType: 'ScheduledJob',
    sourceContextId: 'JOB789',
    sourceContextReference: 'Nightly Arrears Summary',
    channel: 'Email',
    recipients: [
      {
        recipientId: 'RCP004',
        requestId: 'REQ004',
        partyType: 'InternalUser',
        partyId: 'USER001',
        partyName: 'Jane Smith - Compliance Manager',
        channelAddress: 'jane.smith@ssb.gov.kn',
        deliveryChannel: 'Email',
        preferredLanguage: 'en'
      }
    ],
    parameters: {
      ReportDate: '2025-02-24',
      TotalArrears: '125,000.00',
      NewCases: '5',
      OverdueNotices: '12'
    },
    priority: 'Normal',
    requestedByUserId: 'SCHEDULER',
    requestedByUserName: 'System Scheduler',
    requestedDateTime: '2025-02-25T02:00:00',
    scheduledSendDateTime: '2025-02-25T02:00:00',
    status: 'Completed',
    completedDateTime: '2025-02-25T02:00:30',
    totalRecipients: 1,
    successfulSends: 1,
    failedSends: 0
  },
  {
    requestId: 'REQ005',
    sourceModule: 'Legal',
    sourceContextType: 'LegalCase',
    sourceContextId: 'CASE789',
    sourceContextReference: 'LGL-2025-045',
    templateId: 'TPL006',
    templateName: 'Legal Notice Issued - Email',
    channel: 'Email',
    recipients: [
      {
        recipientId: 'RCP005',
        requestId: 'REQ005',
        partyType: 'Employer',
        partyId: 'EMP22222',
        partyName: 'XYZ Corporation',
        channelAddress: 'legal@xyzcorp.kn',
        deliveryChannel: 'Email',
        preferredLanguage: 'en'
      }
    ],
    parameters: {
      EmployerName: 'XYZ Corporation',
      CaseNumber: 'LGL-2025-045',
      TotalArrears: '25,000.00',
      LegalCosts: '2,500.00',
      TotalDue: '27,500.00',
      ResponseDays: '14'
    },
    priority: 'Critical',
    requestedByUserId: 'USER003',
    requestedByUserName: 'Sarah Williams - Legal Officer',
    requestedDateTime: '2025-02-24T09:00:00',
    status: 'Completed',
    completedDateTime: '2025-02-24T09:00:45',
    totalRecipients: 1,
    successfulSends: 1,
    failedSends: 0
  },
  {
    requestId: 'REQ006',
    sourceModule: 'Compliance',
    sourceContextType: 'ComplianceSubcase',
    sourceContextId: 'SUB456',
    sourceContextReference: 'CMP-2025-078',
    templateId: 'TPL002',
    templateName: 'C3 Late Submission Reminder - SMS',
    channel: 'SMS',
    recipients: [
      {
        recipientId: 'RCP006',
        requestId: 'REQ006',
        partyType: 'Employer',
        partyId: 'EMP33333',
        partyName: 'Island Traders Ltd',
        channelAddress: '+1-869-555-0177',
        deliveryChannel: 'SMS',
        preferredLanguage: 'en'
      }
    ],
    parameters: {
      Period: 'Feb 2025',
      AmountXCD: '3,200'
    },
    priority: 'High',
    requestedByUserId: 'USER001',
    requestedByUserName: 'Jane Smith',
    requestedDateTime: '2025-02-26T08:15:00',
    status: 'Failed',
    errorMessage: 'SMS gateway timeout',
    totalRecipients: 1,
    successfulSends: 0,
    failedSends: 1
  },
];

export const notificationMessages: NotificationMessage[] = [
  {
    messageId: 'MSG001',
    requestId: 'REQ001',
    recipientId: 'RCP001',
    recipientName: 'ABC Construction Ltd',
    recipientAddress: 'finance@abcconstruction.kn',
    channel: 'Email',
    subject: 'Reminder: C3 Submission Overdue for January 2025',
    bodyRendered: 'Dear ABC Construction Ltd,\n\nThis is a reminder that your C3 contribution form for January 2025 is now overdue...',
    createdOn: '2025-02-25T10:30:30',
    sentOn: '2025-02-25T10:31:05',
    deliveredOn: '2025-02-25T10:31:15',
    status: 'Delivered',
    providerMessageId: 'resend_msg_abc123',
    attemptCount: 1,
    lastAttemptOn: '2025-02-25T10:31:05'
  },
  {
    messageId: 'MSG002',
    requestId: 'REQ002',
    recipientId: 'RCP002',
    recipientName: 'John Doe',
    recipientAddress: 'john.doe@email.com',
    channel: 'Email',
    subject: 'Your Benefit Claim BEN-2025-001 Has Been Approved',
    bodyRendered: 'Dear John Doe,\n\nWe are pleased to inform you that your benefit claim (BEN-2025-001) has been approved...',
    createdOn: '2025-02-20T14:00:15',
    sentOn: '2025-02-20T14:00:35',
    deliveredOn: '2025-02-20T14:00:45',
    status: 'Delivered',
    providerMessageId: 'resend_msg_def456',
    attemptCount: 1,
    lastAttemptOn: '2025-02-20T14:00:35'
  },
  {
    messageId: 'MSG003',
    requestId: 'REQ003',
    recipientId: 'RCP003',
    recipientName: 'XYZ Hotel & Resort',
    recipientAddress: '+1-869-555-0199',
    channel: 'SMS',
    subject: '',
    bodyRendered: 'SSB: Payment of XCD 1,000.00 received for Invoice INV-001. Receipt: RCP-2025-123. Thank you!',
    createdOn: '2025-02-25T16:45:00',
    sentOn: '2025-02-25T16:45:01',
    deliveredOn: '2025-02-25T16:45:02',
    status: 'Delivered',
    providerMessageId: 'twilio_SM_xyz789',
    attemptCount: 1,
    lastAttemptOn: '2025-02-25T16:45:01'
  },
  {
    messageId: 'MSG006',
    requestId: 'REQ006',
    recipientId: 'RCP006',
    recipientName: 'Island Traders Ltd',
    recipientAddress: '+1-869-555-0177',
    channel: 'SMS',
    subject: '',
    bodyRendered: 'SSB: Your C3 for Feb 2025 is overdue. Amount: XCD 3,200. Submit now to avoid penalties. Call 465-2519.',
    createdOn: '2025-02-26T08:15:00',
    sentOn: '2025-02-26T08:15:02',
    status: 'Failed',
    errorCode: 'GATEWAY_TIMEOUT',
    errorMessage: 'SMS gateway did not respond within timeout period',
    attemptCount: 3,
    lastAttemptOn: '2025-02-26T08:30:00'
  },
];

export const notificationDeliveryAttempts: NotificationDeliveryAttempt[] = [
  {
    attemptId: 'ATT001',
    messageId: 'MSG006',
    attemptNo: 1,
    attemptDateTime: '2025-02-26T08:15:02',
    resultStatus: 'Timeout',
    errorDetail: 'Gateway did not respond within 10 seconds'
  },
  {
    attemptId: 'ATT002',
    messageId: 'MSG006',
    attemptNo: 2,
    attemptDateTime: '2025-02-26T08:20:00',
    resultStatus: 'Timeout',
    errorDetail: 'Gateway did not respond within 10 seconds'
  },
  {
    attemptId: 'ATT003',
    messageId: 'MSG006',
    attemptNo: 3,
    attemptDateTime: '2025-02-26T08:30:00',
    resultStatus: 'Failed',
    errorDetail: 'Max retries exceeded'
  },
];

export const channelConfigurations: ChannelConfiguration[] = [
  {
    configId: 'CFG_EMAIL',
    channel: 'Email',
    isEnabled: true,
    emailProvider: 'Resend',
    fromAddress: 'notifications@ssb.gov.kn',
    fromName: 'Social Security Board',
    maxRetries: 3,
    retryBackoffMinutes: '5,15,60',
    dailyLimit: 10000,
    lastModifiedBy: 'System Admin',
    lastModifiedOn: '2025-01-15T10:00:00',
    isActive: true
  },
  {
    configId: 'CFG_SMS',
    channel: 'SMS',
    isEnabled: true,
    smsProvider: 'Twilio',
    smsGatewayUrl: 'https://api.twilio.com/2010-04-01',
    smsFromNumber: '+1-869-465-2519',
    maxRetries: 3,
    retryBackoffMinutes: '5,10,30',
    dailyLimit: 5000,
    lastModifiedBy: 'System Admin',
    lastModifiedOn: '2025-01-15T10:00:00',
    isActive: true
  },
  {
    configId: 'CFG_PUSH',
    channel: 'Push',
    isEnabled: false,
    pushProvider: 'FCM',
    maxRetries: 2,
    retryBackoffMinutes: '5,15',
    dailyLimit: 20000,
    lastModifiedBy: 'System Admin',
    lastModifiedOn: '2025-01-15T10:00:00',
    isActive: false
  },
];

export const notificationPreferences: NotificationPreference[] = [
  {
    preferenceId: 'PREF001',
    partyType: 'Employer',
    partyId: 'EMP12345',
    partyName: 'ABC Construction Ltd',
    preferredChannels: ['Email', 'SMS'],
    emailAddress: 'finance@abcconstruction.kn',
    mobileNumber: '+1-869-555-0101',
    allowMarketingEmails: false,
    allowMarketingSMS: false,
    allowPushNotifications: false,
    allowMandatoryNotices: true,
    preferredLanguage: 'en',
    createdOn: '2024-06-01T00:00:00'
  },
  {
    preferenceId: 'PREF002',
    partyType: 'InsuredPerson',
    partyId: 'IP67890',
    partyName: 'John Doe',
    preferredChannels: ['Email'],
    emailAddress: 'john.doe@email.com',
    mobileNumber: '+1-869-555-0155',
    allowMarketingEmails: true,
    allowMarketingSMS: false,
    allowPushNotifications: true,
    allowMandatoryNotices: true,
    preferredLanguage: 'en',
    createdOn: '2024-08-15T00:00:00'
  },
];
