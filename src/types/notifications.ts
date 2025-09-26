export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'Email' | 'SMS' | 'Push' | 'Web In-app' | 'Mobile In-app';
  subject?: string;
  content: string;
  placeholders: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionMapping {
  id: string;
  eventName: string;
  eventType: 'User Signup' | 'Payment Success' | 'Task Assigned' | 'Reminder' | 'System Alert';
  templateId: string;
  templateName: string;
  channels: NotificationChannel[];
  isEnabled: boolean;
  priority: 'High' | 'Medium' | 'Low';
  fallbackRules: string[];
}

export interface NotificationChannel {
  type: 'Email' | 'SMS' | 'Push' | 'Web In-app' | 'Mobile In-app';
  priority: number;
  isEnabled: boolean;
}

export interface DeliverySettings {
  id: string;
  name: string;
  scheduleType: 'Immediate' | 'Scheduled' | 'Delayed';
  delay?: number;
  scheduledTime?: string;
  retryAttempts: number;
  batchSize: number;
  isActive: boolean;
}

export interface UserPreference {
  userId: string;
  userName: string;
  email: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  frequency: 'Immediate' | 'Hourly' | 'Daily' | 'Weekly';
  priority: 'All' | 'High Only' | 'Critical Only';
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'System' | 'Task' | 'Payment' | 'Reminder' | 'Alert';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationStats {
  totalSent: number;
  sentToday: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  failureRate: number;
}

export interface EmailLog {
  id: string;
  email: string;
  subject: string;
  templateName: string;
  status: 'Delivered' | 'Failed' | 'Pending' | 'Bounced';
  sentAt: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failureReason?: string;
  retryCount: number;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
  ipAddress: string;
}

export interface UserRole {
  id: string;
  name: 'Admin' | 'Manager' | 'User';
  permissions: string[];
  description: string;
}