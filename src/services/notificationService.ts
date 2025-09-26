import { 
  NotificationTemplate, 
  ActionMapping, 
  DeliverySettings, 
  UserPreference, 
  NotificationItem, 
  NotificationStats,
  EmailLog,
  AuditLog,
  UserRole
} from '@/types/notifications';

// Mock data
const mockTemplates: NotificationTemplate[] = [
  {
    id: '1',
    name: 'Welcome Email',
    type: 'Email',
    subject: 'Welcome to St. Kitts Social Security',
    content: 'Dear {{UserName}}, welcome to our system! Your account {{AccountNumber}} has been created.',
    placeholders: ['{{UserName}}', '{{AccountNumber}}'],
    isActive: true,
    createdBy: 'Admin',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Payment Confirmation',
    type: 'SMS',
    content: 'Payment of ${{Amount}} received for account {{AccountNumber}}. Thank you!',
    placeholders: ['{{Amount}}', '{{AccountNumber}}'],
    isActive: true,
    createdBy: 'System',
    createdAt: '2024-01-20',
    updatedAt: '2024-01-25'
  },
  {
    id: '3',
    name: 'Task Assignment',
    type: 'Web In-app',
    content: 'New task assigned: {{TaskTitle}}. Due date: {{DueDate}}',
    placeholders: ['{{TaskTitle}}', '{{DueDate}}'],
    isActive: true,
    createdBy: 'Manager',
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01'
  }
];

const mockActionMappings: ActionMapping[] = [
  {
    id: '1',
    eventName: 'User Registration',
    eventType: 'User Signup',
    templateId: '1',
    templateName: 'Welcome Email',
    channels: [
      { type: 'Email', priority: 1, isEnabled: true },
      { type: 'SMS', priority: 2, isEnabled: false }
    ],
    isEnabled: true,
    priority: 'High',
    fallbackRules: ['SMS if email fails']
  },
  {
    id: '2',
    eventName: 'Payment Received',
    eventType: 'Payment Success',
    templateId: '2',
    templateName: 'Payment Confirmation',
    channels: [
      { type: 'SMS', priority: 1, isEnabled: true },
      { type: 'Email', priority: 2, isEnabled: true }
    ],
    isEnabled: true,
    priority: 'Medium',
    fallbackRules: ['Email if SMS fails']
  }
];

const mockDeliverySettings: DeliverySettings[] = [
  {
    id: '1',
    name: 'Immediate Delivery',
    scheduleType: 'Immediate',
    retryAttempts: 3,
    batchSize: 100,
    isActive: true
  },
  {
    id: '2',
    name: 'Daily Batch',
    scheduleType: 'Scheduled',
    scheduledTime: '09:00',
    retryAttempts: 2,
    batchSize: 500,
    isActive: true
  }
];

const mockUserPreferences: UserPreference[] = [
  {
    userId: '1',
    userName: 'John Smith',
    email: 'john.smith@example.com',
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    inAppNotifications: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    frequency: 'Immediate',
    priority: 'All'
  },
  {
    userId: '2',
    userName: 'Mary Johnson',
    email: 'mary.johnson@example.com',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    inAppNotifications: true,
    frequency: 'Daily',
    priority: 'High Only'
  }
];

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    userId: '1',
    type: 'System',
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight from 2-4 AM',
    isRead: false,
    priority: 'High',
    createdAt: '2024-03-15T10:30:00Z'
  },
  {
    id: '2',
    userId: '1',
    type: 'Payment',
    title: 'Payment Processed',
    message: 'Your payment of $250.00 has been successfully processed',
    isRead: true,
    priority: 'Medium',
    createdAt: '2024-03-14T15:20:00Z'
  },
  {
    id: '3',
    userId: '1',
    type: 'Task',
    title: 'Document Review Required',
    message: 'Please review the submitted documents for case #SS-2024-001',
    isRead: false,
    priority: 'High',
    createdAt: '2024-03-13T09:45:00Z',
    actionUrl: '/cases/SS-2024-001'
  }
];

const mockStats: NotificationStats = {
  totalSent: 15420,
  sentToday: 89,
  deliveryRate: 98.5,
  openRate: 72.3,
  clickRate: 24.1,
  failureRate: 1.5
};

const mockEmailLogs: EmailLog[] = [
  {
    id: '1',
    email: 'john.smith@example.com',
    subject: 'Welcome to St. Kitts Social Security',
    templateName: 'Welcome Email',
    status: 'Delivered',
    sentAt: '2024-03-15T09:00:00Z',
    deliveredAt: '2024-03-15T09:00:05Z',
    openedAt: '2024-03-15T09:15:00Z',
    retryCount: 0
  },
  {
    id: '2',
    email: 'mary.johnson@example.com',
    subject: 'Payment Confirmation',
    templateName: 'Payment Confirmation',
    status: 'Failed',
    sentAt: '2024-03-15T10:30:00Z',
    failureReason: 'Invalid email address',
    retryCount: 2
  }
];

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    action: 'Template Created',
    performedBy: 'admin@stkitts.gov',
    timestamp: '2024-03-15T14:30:00Z',
    details: 'Created new email template "Welcome Email"',
    ipAddress: '192.168.1.100'
  },
  {
    id: '2',
    action: 'Action Mapping Updated',
    performedBy: 'manager@stkitts.gov',
    timestamp: '2024-03-15T11:20:00Z',
    details: 'Updated payment success mapping',
    ipAddress: '192.168.1.105'
  }
];

const mockUserRoles: UserRole[] = [
  {
    id: '1',
    name: 'Admin',
    permissions: ['create', 'read', 'update', 'delete', 'manage_users'],
    description: 'Full system access'
  },
  {
    id: '2',
    name: 'Manager',
    permissions: ['create', 'read', 'update'],
    description: 'Can manage templates and mappings'
  },
  {
    id: '3',
    name: 'User',
    permissions: ['read'],
    description: 'View-only access'
  }
];

export const notificationService = {
  // Templates
  getTemplates: async (): Promise<NotificationTemplate[]> => mockTemplates,
  getTemplate: async (id: string): Promise<NotificationTemplate | undefined> => 
    mockTemplates.find(t => t.id === id),
  createTemplate: async (template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> => ({
    ...template,
    id: Date.now().toString()
  }),
  updateTemplate: async (id: string, template: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
    const existing = mockTemplates.find(t => t.id === id);
    return { ...existing!, ...template };
  },
  deleteTemplate: async (id: string): Promise<void> => {
    const index = mockTemplates.findIndex(t => t.id === id);
    if (index > -1) mockTemplates.splice(index, 1);
  },

  // Action Mappings
  getActionMappings: async (): Promise<ActionMapping[]> => mockActionMappings,
  createActionMapping: async (mapping: Omit<ActionMapping, 'id'>): Promise<ActionMapping> => ({
    ...mapping,
    id: Date.now().toString()
  }),
  updateActionMapping: async (id: string, mapping: Partial<ActionMapping>): Promise<ActionMapping> => {
    const existing = mockActionMappings.find(m => m.id === id);
    return { ...existing!, ...mapping };
  },

  // Delivery Settings
  getDeliverySettings: async (): Promise<DeliverySettings[]> => mockDeliverySettings,
  updateDeliverySettings: async (id: string, settings: Partial<DeliverySettings>): Promise<DeliverySettings> => {
    const existing = mockDeliverySettings.find(s => s.id === id);
    return { ...existing!, ...settings };
  },

  // User Preferences
  getUserPreferences: async (): Promise<UserPreference[]> => mockUserPreferences,
  getUserPreference: async (userId: string): Promise<UserPreference | undefined> =>
    mockUserPreferences.find(p => p.userId === userId),
  updateUserPreference: async (userId: string, preferences: Partial<UserPreference>): Promise<UserPreference> => {
    const existing = mockUserPreferences.find(p => p.userId === userId);
    return { ...existing!, ...preferences };
  },

  // Notifications
  getNotifications: async (userId?: string): Promise<NotificationItem[]> => 
    userId ? mockNotifications.filter(n => n.userId === userId) : mockNotifications,
  markAsRead: async (id: string): Promise<void> => {
    const notification = mockNotifications.find(n => n.id === id);
    if (notification) notification.isRead = true;
  },

  // Stats
  getStats: async (): Promise<NotificationStats> => mockStats,

  // Email Logs
  getEmailLogs: async (): Promise<EmailLog[]> => mockEmailLogs,
  searchEmailLogs: async (query: string): Promise<EmailLog[]> => 
    mockEmailLogs.filter(log => 
      log.email.includes(query) || 
      log.subject.includes(query) || 
      log.templateName.includes(query)
    ),

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => mockAuditLogs,

  // User Roles
  getUserRoles: async (): Promise<UserRole[]> => mockUserRoles
};