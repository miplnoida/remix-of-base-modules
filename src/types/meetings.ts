// Meeting Status Types
export type MeetingStatus = 'Scheduled' | 'Rescheduled' | 'InProgress' | 'Closed' | 'Cancelled' | 'Rejected';

// Meeting Outcome Types
export type MeetingOutcome = 'ClosedWithApproval' | 'ClosedWithRejection' | 'Reschedule' | 'NextSchedule' | 'Cancel';

// Meeting Type Types
export type MeetingType = 'IP-Registration' | 'Employer-Registration' | 'Doctor-Registration' | 'General';

// Meeting Record
export interface Meeting {
  id: string;
  meeting_reference: string;
  application_reference: string;
  workflow_instance_id?: string;
  workflow_id?: string;
  step_id?: string;
  action_config_id?: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  outcome?: MeetingOutcome;
  meeting_date: string;
  meeting_time: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  office_address?: string;
  remarks?: string;
  outcome_remarks?: string;
  parent_meeting_id?: string;
  reschedule_count: number;
  scheduled_by?: string;
  scheduled_by_name?: string;
  closed_by?: string;
  closed_by_name?: string;
  closed_at?: string;
  api_notified: boolean;
  api_notification_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;
  // Joined fields
  workflow_definitions?: { name: string; description?: string };
  workflow_steps?: { step_name: string; description?: string };
  workflow_action_configurations?: {
    meeting_type: MeetingType;
    requires_api_integration: boolean;
  };
}

// Meeting History Record
export interface MeetingHistory {
  id: string;
  meeting_id: string;
  old_status?: MeetingStatus;
  new_status: MeetingStatus;
  action_taken: string;
  outcome?: MeetingOutcome;
  old_date?: string;
  new_date?: string;
  old_time?: string;
  new_time?: string;
  remarks?: string;
  performed_by?: string;
  performed_by_name?: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Meeting API Log Record
export interface MeetingApiLog {
  id: string;
  meeting_id: string;
  api_config_id?: string;
  action_type: string;
  request_url?: string;
  request_method?: string;
  request_headers?: Record<string, any>;
  request_payload?: Record<string, any>;
  response_status?: number;
  response_headers?: Record<string, any>;
  response_payload?: Record<string, any>;
  is_success?: boolean;
  error_message?: string;
  duration_ms?: number;
  retry_attempt: number;
  created_at: string;
  created_by?: string;
}

// Workflow Action Outcome Configuration
export interface WorkflowActionOutcome {
  id: string;
  action_config_id: string;
  outcome_code: MeetingOutcome;
  outcome_label: string;
  description?: string;
  icon_name?: string;
  button_variant?: string;
  next_step_type: 'stay' | 'next' | 'end';
  next_step_id?: string;
  end_state?: 'Approved' | 'Rejected';
  triggers_api: boolean;
  api_config_id?: string;
  creates_new_request: boolean;
  new_request_module?: string;
  requires_remarks: boolean;
  display_order: number;
  is_active: boolean;
}

// Workflow Action Type
export interface WorkflowActionType {
  id: string;
  type_code: string;
  type_name: string;
  description?: string;
  requires_form: boolean;
  requires_api_integration: boolean;
  pauses_workflow: boolean;
  is_system_defined: boolean;
  is_active: boolean;
}

// Workflow API Configuration
export interface WorkflowApiConfiguration {
  id: string;
  config_name: string;
  description?: string;
  http_method: string;
  endpoint_url: string;
  secret_name?: string;
  timeout_seconds: number;
  retry_count: number;
  headers_template?: Record<string, any>;
  body_template?: Record<string, any>;
  success_condition?: Record<string, any>;
  is_active: boolean;
}

// Schedule Meeting Form Data
export interface ScheduleMeetingFormData {
  applicationReference: string;
  workflowInstanceId?: string;
  workflowId?: string;
  stepId?: string;
  actionConfigId?: string;
  meetingType: MeetingType;
  meetingDate: string;
  meetingTime: string;
  contactPerson: string;
  contactEmail?: string;
  contactPhone?: string;
  officeAddress?: string;
  remarks?: string;
}

// Process Outcome Form Data
export interface ProcessOutcomeFormData {
  meetingId: string;
  outcome: MeetingOutcome;
  remarks?: string;
  newDate?: string;
  newTime?: string;
}

// Meeting Filters
export interface MeetingFilters {
  status?: MeetingStatus;
  meetingType?: MeetingType;
  dateFrom?: string;
  dateTo?: string;
  applicationReference?: string;
  meetingReference?: string;
}

// Meeting Detail Response
export interface MeetingDetailResponse {
  meeting: Meeting;
  history: MeetingHistory[];
  outcomes: WorkflowActionOutcome[];
  apiLogs: MeetingApiLog[];
}
