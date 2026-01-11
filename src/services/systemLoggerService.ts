/**
 * System Logger Service
 * Non-hook version for use in contexts and edge functions
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  getCorrelationId, 
  getSessionId, 
  getDeviceInfo,
  setCorrelationId,
  generateCorrelationId
} from '@/services/correlationIdService';

interface BaseLogData {
  api_name?: string;
  module?: string;
  entity_type?: string;
  entity_id?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  payload_json?: Record<string, any>;
  ip_address?: string;
}

interface TechnicalLogData extends BaseLogData {
  execution_time_ms?: number;
  status?: 'success' | 'failed';
  request_payload?: Record<string, any>;
  response_payload?: Record<string, any>;
  headers?: Record<string, any>;
  stack_trace?: string;
}

interface ErrorLogData extends BaseLogData {
  error_type?: string;
  error_message?: string;
  stack_trace?: string;
}

interface BusinessEventData extends BaseLogData {
  action?: string;
  performed_by?: string;
  description?: string;
}

interface AuditData extends BaseLogData {
  action?: string;
  before_value?: Record<string, any>;
  after_value?: Record<string, any>;
  user_name?: string;
}

interface SecurityLogData extends BaseLogData {
  event_type?: 'login' | 'logout' | 'password_change' | 'permission_denied' | 'role_change' | 'failed_login';
  user_name?: string;
  success?: boolean;
}

interface IntegrationLogData extends BaseLogData {
  external_service?: string;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  status?: string;
  retry_count?: number;
}

interface PerformanceLogData extends BaseLogData {
  execution_time_ms?: number;
  memory_usage_mb?: number;
  cpu_usage_percent?: number;
  status?: string;
}

interface WorkflowLogData extends BaseLogData {
  workflow_id?: string;
  application_id?: string;
  current_step?: string;
  step_number?: number;
  status?: string;
  step_history?: Record<string, any>;
}

function getBaseLogData(userId?: string) {
  return {
    correlation_id: getCorrelationId(),
    session_id: getSessionId(),
    user_id: userId,
    device_info: getDeviceInfo(),
    timestamp: new Date().toISOString(),
  };
}

// Start a new correlation chain
export function startNewCorrelation(): string {
  return setCorrelationId(generateCorrelationId());
}

// Log technical API call
export async function logTechnical(data: TechnicalLogData, userId?: string) {
  try {
    await supabase.from('system_technical_logs').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log technical event:', error);
  }
}

// Log error
export async function logError(data: ErrorLogData, userId?: string) {
  try {
    await supabase.from('system_error_logs').insert({
      ...getBaseLogData(userId),
      severity: data.severity || 'error',
      ...data,
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

// Log business event
export async function logBusinessEvent(data: BusinessEventData, userId?: string) {
  try {
    await supabase.from('system_business_events').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log business event:', error);
  }
}

// Log audit trail
export async function logAudit(data: AuditData, userId?: string) {
  try {
    await supabase.from('system_audit_trail').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// Log security event
export async function logSecurity(data: SecurityLogData, userId?: string) {
  try {
    await supabase.from('system_security_logs').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

// Log integration call
export async function logIntegration(data: IntegrationLogData, userId?: string) {
  try {
    await supabase.from('system_integration_logs').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log integration:', error);
  }
}

// Log performance metric
export async function logPerformance(data: PerformanceLogData, userId?: string) {
  try {
    await supabase.from('system_performance_metrics').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log performance:', error);
  }
}

// Log workflow execution
export async function logWorkflow(data: WorkflowLogData, userId?: string) {
  try {
    await supabase.from('workflow_execution_logs').insert({
      ...getBaseLogData(userId),
      ...data,
    });
  } catch (error) {
    console.error('Failed to log workflow:', error);
  }
}

export const systemLogger = {
  startNewCorrelation,
  logTechnical,
  logError,
  logBusinessEvent,
  logAudit,
  logSecurity,
  logIntegration,
  logPerformance,
  logWorkflow,
};
