// ============================================
// CENTRAL SCHEDULER - TYPE DEFINITIONS
// ============================================

export type TaskType = 'Notification' | 'Workflow Action' | 'Background Process' | 'Data Process';
export type ScheduleType = 'One-time' | 'Recurring' | 'Event-offset';
export type TaskStatus = 'Active' | 'Paused' | 'Completed' | 'Failed' | 'Disabled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ExecutionStatus = 'Running' | 'Success' | 'Failed' | 'Timeout';

export interface SchedulerTask {
  id: string;
  taskId: string;
  moduleName: string;
  taskName: string;
  taskType: TaskType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  frequencyMinutes?: number;
  payloadJson: Record<string, any>;
  status: TaskStatus;
  nextRunAt?: string;
  lastRunAt?: string;
  maxRetryCount: number;
  currentRetryCount: number;
  ownerUserId?: string;
  priority: TaskPriority;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskExecutionLog {
  id: string;
  taskId: string;
  executionStartAt: string;
  executionEndAt?: string;
  status: ExecutionStatus;
  errorMessage?: string;
  executionDetails?: Record<string, any>;
  retryCount: number;
  executedBy: string;
  createdAt: string;
}

export interface ScheduleTaskRequest {
  taskId: string;
  moduleName: string;
  taskName: string;
  taskType: TaskType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  frequencyMinutes?: number;
  payloadJson: Record<string, any>;
  priority: TaskPriority;
  description?: string;
  maxRetryCount?: number;
}

export interface TaskFilters {
  moduleName?: string;
  status?: TaskStatus;
  taskType?: TaskType;
  dateFrom?: string;
  dateTo?: string;
  priority?: TaskPriority;
}
