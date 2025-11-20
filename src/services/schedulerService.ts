// ============================================
// CENTRAL SCHEDULER SERVICE
// ============================================

import { 
  SchedulerTask, 
  TaskExecutionLog, 
  ScheduleTaskRequest, 
  TaskFilters,
  TaskStatus
} from '@/types/scheduler';

// Mock data storage (in-memory for now)
let schedulerTasks: SchedulerTask[] = [
  {
    id: '1',
    taskId: 'C3_NON_SUBMISSION_CHECK',
    moduleName: 'C3 Management',
    taskName: 'C3 Non-Submission Check',
    taskType: 'Background Process',
    scheduleType: 'Recurring',
    cronExpression: '0 0 5 * *', // Daily at 5 AM
    payloadJson: { gracePeriodDays: 7, autoCreateCase: true },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 3,
    currentRetryCount: 0,
    priority: 'High',
    description: 'Checks for missing C3 submissions and auto-creates compliance cases',
    createdBy: 'system',
    createdAt: new Date(2024, 0, 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    taskId: 'COMPLIANCE_ESCALATION',
    moduleName: 'Compliance',
    taskName: 'Case Escalation Check',
    taskType: 'Workflow Action',
    scheduleType: 'Recurring',
    cronExpression: '0 0 * * 1', // Weekly on Monday
    payloadJson: { escalationThresholdDays: 30, noticeCount: 3 },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 3,
    currentRetryCount: 0,
    priority: 'High',
    description: 'Escalates overdue compliance cases to legal department',
    createdBy: 'admin',
    createdAt: new Date(2024, 0, 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    taskId: 'PAYMENT_ARRANGEMENT_DEFAULT',
    moduleName: 'Compliance',
    taskName: 'Payment Arrangement Default Detection',
    taskType: 'Background Process',
    scheduleType: 'Recurring',
    cronExpression: '0 0 1 * *', // Daily at 1 AM
    payloadJson: { graceDays: 5 },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 3,
    currentRetryCount: 0,
    priority: 'Critical',
    description: 'Detects missed installments and escalates defaulted arrangements',
    createdBy: 'system',
    createdAt: new Date(2024, 0, 15).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    taskId: 'BENEFIT_DOCUMENT_REMINDER',
    moduleName: 'Benefits',
    taskName: 'Benefit Document Reminder',
    taskType: 'Notification',
    scheduleType: 'Recurring',
    cronExpression: '0 9 * * *', // Daily at 9 AM
    payloadJson: { reminderType: 'missing_documents', templateId: 'DOC_REMINDER' },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 2,
    currentRetryCount: 0,
    priority: 'Medium',
    description: 'Sends reminders for missing benefit claim documents',
    createdBy: 'admin',
    createdAt: new Date(2024, 1, 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    taskId: 'AUDIT_PLAN_NOTIFICATION',
    moduleName: 'Internal Audit',
    taskName: 'Audit Plan Notifications',
    taskType: 'Notification',
    scheduleType: 'Recurring',
    cronExpression: '0 8 1 * *', // First day of month at 8 AM
    payloadJson: { notifyInspectors: true, notifySupervisors: true },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 3,
    currentRetryCount: 0,
    priority: 'High',
    description: 'Notifies team about monthly audit plan and assignments',
    createdBy: 'audit_manager',
    createdAt: new Date(2024, 1, 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    taskId: 'WORKFLOW_AUTO_ESCALATION',
    moduleName: 'Workflow Engine',
    taskName: 'Workflow Auto-Escalation',
    taskType: 'Workflow Action',
    scheduleType: 'Recurring',
    cronExpression: '0 */6 * * *', // Every 6 hours
    payloadJson: { slaThresholdHours: 48 },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 3,
    currentRetryCount: 0,
    priority: 'High',
    description: 'Automatically escalates pending workflow items exceeding SLA',
    createdBy: 'system',
    createdAt: new Date(2024, 2, 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '7',
    taskId: 'MONTHLY_PENALTY_CALCULATION',
    moduleName: 'Accounting',
    taskName: 'Monthly Penalty Calculation',
    taskType: 'Data Process',
    scheduleType: 'Recurring',
    cronExpression: '0 2 1 * *', // First day of month at 2 AM
    payloadJson: { interestRate: 1.5, applyToAllArrears: true },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 5,
    currentRetryCount: 0,
    priority: 'Critical',
    description: 'Calculates monthly penalties and interest on outstanding arrears',
    createdBy: 'finance_admin',
    createdAt: new Date(2024, 0, 1).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    taskId: 'NOTIFICATION_DIGEST',
    moduleName: 'Notification System',
    taskName: 'Daily Notification Digest',
    taskType: 'Notification',
    scheduleType: 'Recurring',
    cronExpression: '0 17 * * *', // Daily at 5 PM
    payloadJson: { digestType: 'daily_summary', recipients: 'all_officers' },
    status: 'Active',
    nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    maxRetryCount: 2,
    currentRetryCount: 0,
    priority: 'Low',
    description: 'Sends daily digest of pending notifications to users',
    createdBy: 'system',
    createdAt: new Date(2024, 2, 15).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let taskExecutionLogs: TaskExecutionLog[] = [
  {
    id: '1',
    taskId: '1',
    executionStartAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    executionEndAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5000).toISOString(),
    status: 'Success',
    executionDetails: { casesCreated: 3, employersChecked: 150 },
    retryCount: 0,
    executedBy: 'system',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    taskId: '2',
    executionStartAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    executionEndAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3000).toISOString(),
    status: 'Success',
    executionDetails: { casesEscalated: 5, noticesSent: 5 },
    retryCount: 0,
    executedBy: 'system',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    taskId: '3',
    executionStartAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    executionEndAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 2000).toISOString(),
    status: 'Success',
    executionDetails: { arrangementsChecked: 45, defaultsDetected: 2 },
    retryCount: 0,
    executedBy: 'system',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    taskId: '4',
    executionStartAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    executionEndAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 1500).toISOString(),
    status: 'Success',
    executionDetails: { remindersSent: 12, recipientsCount: 12 },
    retryCount: 0,
    executedBy: 'system',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    taskId: '7',
    executionStartAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    executionEndAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 8000).toISOString(),
    status: 'Success',
    executionDetails: { penaltiesCalculated: 87, totalAmount: 125000 },
    retryCount: 0,
    executedBy: 'system',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const schedulerService = {
  // Get all tasks with optional filters
  async getTasks(filters?: TaskFilters): Promise<SchedulerTask[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let filtered = [...schedulerTasks];
    
    if (filters?.moduleName) {
      filtered = filtered.filter(t => t.moduleName === filters.moduleName);
    }
    if (filters?.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters?.taskType) {
      filtered = filtered.filter(t => t.taskType === filters.taskType);
    }
    if (filters?.priority) {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }
    if (filters?.dateFrom) {
      filtered = filtered.filter(t => t.nextRunAt && t.nextRunAt >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      filtered = filtered.filter(t => t.nextRunAt && t.nextRunAt <= filters.dateTo!);
    }
    
    return filtered;
  },

  // Get a single task by ID
  async getTaskById(id: string): Promise<SchedulerTask | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return schedulerTasks.find(t => t.id === id) || null;
  },

  // Schedule a new task
  async scheduleTask(request: ScheduleTaskRequest): Promise<SchedulerTask> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newTask: SchedulerTask = {
      id: `${schedulerTasks.length + 1}`,
      ...request,
      status: 'Active',
      maxRetryCount: request.maxRetryCount || 3,
      currentRetryCount: 0,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    schedulerTasks.push(newTask);
    return newTask;
  },

  // Update an existing task
  async updateTask(id: string, updates: Partial<SchedulerTask>): Promise<SchedulerTask> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const index = schedulerTasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Task not found');
    
    schedulerTasks[index] = {
      ...schedulerTasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return schedulerTasks[index];
  },

  // Pause a task
  async pauseTask(id: string): Promise<SchedulerTask> {
    return this.updateTask(id, { status: 'Paused' });
  },

  // Resume a task
  async resumeTask(id: string): Promise<SchedulerTask> {
    return this.updateTask(id, { status: 'Active' });
  },

  // Run a task immediately
  async runTaskNow(id: string): Promise<TaskExecutionLog> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const task = schedulerTasks.find(t => t.id === id);
    if (!task) throw new Error('Task not found');
    
    const log: TaskExecutionLog = {
      id: `${taskExecutionLogs.length + 1}`,
      taskId: id,
      executionStartAt: new Date().toISOString(),
      executionEndAt: new Date(Date.now() + 2000).toISOString(),
      status: 'Success',
      executionDetails: { manualTrigger: true },
      retryCount: 0,
      executedBy: 'current_user',
      createdAt: new Date().toISOString()
    };
    
    taskExecutionLogs.push(log);
    
    // Update task last run
    await this.updateTask(id, { lastRunAt: new Date().toISOString() });
    
    return log;
  },

  // Get execution history for a task
  async getTaskExecutionHistory(taskId: string): Promise<TaskExecutionLog[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return taskExecutionLogs.filter(log => log.taskId === taskId);
  },

  // Delete a task
  async deleteTask(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    schedulerTasks = schedulerTasks.filter(t => t.id !== id);
  }
};
