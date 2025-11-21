// Central Notification Engine Types

export type NotificationChannel = 'Email' | 'SMS' | 'Push' | 'Multi' | 'Auto';
export type NotificationPriority = 'Low' | 'Normal' | 'High' | 'Critical';
export type NotificationStatus = 
  | 'Pending' 
  | 'Queued' 
  | 'InProgress' 
  | 'Sent'
  | 'Delivered'
  | 'Failed' 
  | 'Bounced'
  | 'Cancelled'
  | 'Completed';

export type SourceModule = 
  | 'Compliance' 
  | 'Benefits' 
  | 'Finance' 
  | 'Legal' 
  | 'InternalAudit' 
  | 'CaseManagement'
  | 'Contributions'
  | 'Workflow'
  | 'Scheduler'
  | 'Employers'
  | 'InsuredPersons'
  | 'System';

export type PartyType = 'Employer' | 'InsuredPerson' | 'OtherParty' | 'InternalUser';
export type LanguageCode = 'en' | 'fr';

export interface NotificationTemplate {
  templateId: string;
  templateName: string;
  module: SourceModule;
  channel: NotificationChannel;
  subject: string; // For Email/Push
  bodyText: string; // Supports {placeholders}
  languageCode: LanguageCode;
  isActive: boolean;
  versionNo: number;
  createdBy: string;
  createdOn: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
  description?: string;
  sampleParameters?: Record<string, string>; // For documentation
}

export interface NotificationRecipient {
  recipientId: string;
  requestId: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  channelAddress: string; // Email/phone/deviceToken
  deliveryChannel: NotificationChannel;
  preferredLanguage?: LanguageCode;
}

export interface NotificationRequest {
  requestId: string;
  sourceModule: SourceModule;
  sourceContextType: string; // 'Employer', 'Case', 'Claim', 'Invoice', etc.
  sourceContextId: string;
  sourceContextReference: string; // Human-readable reference
  templateId?: string;
  templateName?: string;
  channel: NotificationChannel;
  recipients: NotificationRecipient[];
  parameters: Record<string, any>; // Template placeholder values
  priority: NotificationPriority;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedDateTime: string;
  scheduledSendDateTime?: string; // null = ASAP
  status: NotificationStatus;
  completedDateTime?: string;
  errorMessage?: string;
  totalRecipients: number;
  successfulSends: number;
  failedSends: number;
}

export interface NotificationMessage {
  messageId: string;
  requestId: string;
  recipientId: string;
  recipientName: string;
  recipientAddress: string; // Email/phone
  channel: NotificationChannel;
  subject: string;
  bodyRendered: string; // Final text/HTML
  createdOn: string;
  sentOn?: string;
  deliveredOn?: string;
  status: NotificationStatus;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string; // From SMS/email gateway
  attemptCount: number;
  lastAttemptOn?: string;
}

export interface NotificationDeliveryAttempt {
  attemptId: string;
  messageId: string;
  attemptNo: number;
  attemptDateTime: string;
  resultStatus: 'Sent' | 'Failed' | 'Timeout' | 'Bounced';
  errorDetail?: string;
  providerResponse?: string;
}

export interface ChannelConfiguration {
  configId: string;
  channel: NotificationChannel;
  isEnabled: boolean;
  
  // Email Settings
  emailProvider?: 'SMTP' | 'Resend' | 'SendGrid' | 'AWS_SES';
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpUseTLS?: boolean;
  fromAddress?: string;
  fromName?: string;
  
  // SMS Settings
  smsProvider?: 'Twilio' | 'MessageBird' | 'LocalGateway';
  smsGatewayUrl?: string;
  smsApiKey?: string;
  smsFromNumber?: string;
  
  // Push Settings
  pushProvider?: 'FCM' | 'APNS' | 'OneSignal';
  pushServerKey?: string;
  pushProjectId?: string;
  
  // Retry & Limits
  maxRetries: number;
  retryBackoffMinutes: string; // e.g., "5,15,60"
  dailyLimit?: number;
  
  // Audit
  lastModifiedBy: string;
  lastModifiedOn: string;
  isActive: boolean;
}

export interface NotificationPreference {
  preferenceId: string;
  partyType: PartyType;
  partyId: string;
  partyName: string;
  
  // Channel Preferences
  preferredChannels: NotificationChannel[];
  emailAddress?: string;
  mobileNumber?: string;
  pushDeviceToken?: string;
  
  // Opt-in/out
  allowMarketingEmails: boolean;
  allowMarketingSMS: boolean;
  allowPushNotifications: boolean;
  
  // Always allow mandatory regulatory notices
  allowMandatoryNotices: boolean; // Always true
  
  preferredLanguage: LanguageCode;
  
  // Audit
  createdOn: string;
  lastModifiedBy?: string;
  lastModifiedOn?: string;
}

export interface NotificationStatistics {
  totalRequests: number;
  totalMessages: number;
  byChannel: {
    channel: NotificationChannel;
    count: number;
    successRate: number;
  }[];
  byModule: {
    module: SourceModule;
    count: number;
  }[];
  byStatus: {
    status: NotificationStatus;
    count: number;
  }[];
  byPriority: {
    priority: NotificationPriority;
    count: number;
  }[];
  last24Hours: {
    sent: number;
    failed: number;
    pending: number;
  };
  last7Days: {
    date: string;
    sent: number;
    failed: number;
  }[];
}

// API Request/Response Types
export interface QueueNotificationRequest {
  sourceModule: SourceModule;
  sourceContextType: string;
  sourceContextId: string;
  sourceContextReference: string;
  templateId?: string;
  channel?: NotificationChannel;
  recipients: {
    partyType: PartyType;
    partyId: string;
    channelAddress?: string; // If known, otherwise lookup
  }[];
  parameters: Record<string, any>;
  priority?: NotificationPriority;
  scheduledSendDateTime?: string;
}

export interface QueueNotificationResponse {
  requestId: string;
  status: 'Queued' | 'Failed';
  message: string;
  recipientCount: number;
}
