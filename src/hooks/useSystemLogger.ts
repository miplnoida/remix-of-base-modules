import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
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

export function useSystemLogger() {
  const { user } = useSupabaseAuth();

  const getBaseLogData = useCallback(() => ({
    correlation_id: getCorrelationId(),
    session_id: getSessionId(),
    user_id: user?.id,
    device_info: getDeviceInfo(),
    timestamp: new Date().toISOString(),
  }), [user?.id]);

  // Start a new correlation chain (call at the start of a new user action)
  const startNewCorrelation = useCallback(() => {
    return setCorrelationId(generateCorrelationId());
  }, []);

  // Log technical API call
  const logTechnical = useCallback(async (data: TechnicalLogData) => {
    try {
      await supabase.from('system_technical_logs').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log technical event:', error);
    }
  }, [getBaseLogData]);

  // Log error
  const logError = useCallback(async (data: ErrorLogData) => {
    try {
      await supabase.from('system_error_logs').insert({
        ...getBaseLogData(),
        severity: data.severity || 'error',
        ...data,
      });
    } catch (error) {
      console.error('Failed to log error:', error);
    }
  }, [getBaseLogData]);

  // Log business event
  const logBusinessEvent = useCallback(async (data: BusinessEventData) => {
    try {
      await supabase.from('system_business_events').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log business event:', error);
    }
  }, [getBaseLogData]);

  // Log audit trail
  const logAudit = useCallback(async (data: AuditData) => {
    try {
      await supabase.from('system_audit_trail').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }, [getBaseLogData]);

  // Log security event
  const logSecurity = useCallback(async (data: SecurityLogData) => {
    try {
      await supabase.from('system_security_logs').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [getBaseLogData]);

  // Log integration call
  const logIntegration = useCallback(async (data: IntegrationLogData) => {
    try {
      await supabase.from('system_integration_logs').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log integration:', error);
    }
  }, [getBaseLogData]);

  // Log performance metric
  const logPerformance = useCallback(async (data: PerformanceLogData) => {
    try {
      await supabase.from('system_performance_metrics').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log performance:', error);
    }
  }, [getBaseLogData]);

  // Log workflow execution
  const logWorkflow = useCallback(async (data: WorkflowLogData) => {
    try {
      await supabase.from('workflow_execution_logs').insert({
        ...getBaseLogData(),
        ...data,
      });
    } catch (error) {
      console.error('Failed to log workflow:', error);
    }
  }, [getBaseLogData]);

  return {
    startNewCorrelation,
    getCorrelationId,
    logTechnical,
    logError,
    logBusinessEvent,
    logAudit,
    logSecurity,
    logIntegration,
    logPerformance,
    logWorkflow,
  };
}
