/**
 * SystemLoggingProvider
 * Automatically logs navigation, errors, and provides context for manual logging
 */

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { 
  getCorrelationId, 
  getSessionId, 
  getDeviceInfo,
  setCorrelationId,
  generateCorrelationId 
} from '@/services/correlationIdService';

interface LogData {
  api_name?: string;
  module?: string;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  description?: string;
  before_value?: Record<string, any>;
  after_value?: Record<string, any>;
  execution_time_ms?: number;
  status?: string;
  error_message?: string;
  stack_trace?: string;
}

interface SystemLoggingContextType {
  logTechnical: (data: LogData) => Promise<void>;
  logBusinessEvent: (data: LogData) => Promise<void>;
  logAudit: (data: LogData & { user_name?: string }) => Promise<void>;
  logError: (error: Error, context?: LogData) => Promise<void>;
  logPerformance: (data: LogData & { execution_time_ms: number }) => Promise<void>;
  logIntegration: (data: LogData & { external_service: string }) => Promise<void>;
  startNewCorrelation: () => string;
}

const SystemLoggingContext = createContext<SystemLoggingContextType | null>(null);

export const useSystemLogging = () => {
  const context = useContext(SystemLoggingContext);
  if (!context) {
    throw new Error('useSystemLogging must be used within SystemLoggingProvider');
  }
  return context;
};

export const SystemLoggingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, profile } = useSupabaseAuth();
  const previousPath = useRef<string>('');
  const pageLoadTime = useRef<number>(performance.now());

  const getBaseLogData = useCallback(() => ({
    correlation_id: getCorrelationId(),
    session_id: getSessionId(),
    user_id: user?.id,
    device_info: getDeviceInfo(),
    timestamp: new Date().toISOString(),
    ip_address: null, // Would be set server-side
  }), [user?.id]);

  const startNewCorrelation = useCallback(() => {
    return setCorrelationId(generateCorrelationId());
  }, []);

  // Log technical API calls
  const logTechnical = useCallback(async (data: LogData) => {
    try {
      await supabase.from('system_technical_logs').insert({
        ...getBaseLogData(),
        api_name: data.api_name,
        module: data.module,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        execution_time_ms: data.execution_time_ms,
        status: data.status || 'success',
        severity: data.status === 'failed' ? 'error' : 'info',
      });
    } catch (err) {
      console.error('Failed to log technical event:', err);
    }
  }, [getBaseLogData]);

  // Log business events
  const logBusinessEvent = useCallback(async (data: LogData) => {
    try {
      await supabase.from('system_business_events').insert({
        ...getBaseLogData(),
        module: data.module,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        action: data.action,
        performed_by: profile?.full_name || user?.email || 'Unknown',
        description: data.description,
      });
    } catch (err) {
      console.error('Failed to log business event:', err);
    }
  }, [getBaseLogData, profile, user?.email]);

  // Log audit trail — always uses user_code for user_name
  const logAudit = useCallback(async (data: LogData & { user_name?: string }) => {
    try {
      // Prefer explicit user_name, then user_code, then email. Never use full_name.
      const resolvedUserName = data.user_name || profile?.user_code || user?.email || 'ANONYMOUS';
      await supabase.from('system_audit_trail').insert({
        ...getBaseLogData(),
        module: data.module,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        action: data.action,
        before_value: data.before_value,
        after_value: data.after_value,
        user_name: resolvedUserName,
      });
      });
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  }, [getBaseLogData, profile, user?.email]);

  // Log errors
  const logError = useCallback(async (error: Error, context?: LogData) => {
    try {
      await supabase.from('system_error_logs').insert({
        ...getBaseLogData(),
        error_type: error.name,
        error_message: error.message,
        stack_trace: error.stack,
        severity: 'error',
        module: context?.module,
        api_name: context?.api_name,
        entity_type: context?.entity_type,
        entity_id: context?.entity_id,
      });
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }, [getBaseLogData]);

  // Log performance metrics
  const logPerformance = useCallback(async (data: LogData & { execution_time_ms: number }) => {
    try {
      await supabase.from('system_performance_metrics').insert({
        ...getBaseLogData(),
        api_name: data.api_name,
        module: data.module,
        execution_time_ms: data.execution_time_ms,
        status: data.status || 'success',
      });
    } catch (err) {
      console.error('Failed to log performance:', err);
    }
  }, [getBaseLogData]);

  // Log integration calls
  const logIntegration = useCallback(async (data: LogData & { external_service: string }) => {
    try {
      await supabase.from('system_integration_logs').insert({
        ...getBaseLogData(),
        external_service: data.external_service,
        status: data.status || 'success',
        module: data.module,
      });
    } catch (err) {
      console.error('Failed to log integration:', err);
    }
  }, [getBaseLogData]);

  // Log navigation changes as business events AND audit trail
  useEffect(() => {
    if (user && previousPath.current !== location.pathname) {
      const currentTime = performance.now();
      const timeOnPreviousPage = previousPath.current 
        ? Math.round(currentTime - pageLoadTime.current) 
        : 0;

      // Start new correlation for new page
      startNewCorrelation();

      // Resolve correct user identity — prefer user_code, never fall back to full_name
      const userName = profile?.user_code || user?.email || 'ANONYMOUS';

      // Log the navigation as a business event
      logBusinessEvent({
        module: 'Navigation',
        action: 'page_view',
        entity_type: 'page',
        entity_id: location.pathname,
        description: `Navigated to ${location.pathname}`,
      });

      // Write to system_audit_trail with correct user_code (not full_name)
      logAudit({
        module: 'Navigation',
        action: 'page_view',
        entity_type: 'page',
        entity_id: location.pathname,
        description: `Opened screen: ${location.pathname}`,
        user_name: userName,
      });

      // Log performance metric for previous page if applicable
      if (previousPath.current && timeOnPreviousPage > 0) {
        logPerformance({
          api_name: 'page_session',
          module: previousPath.current,
          execution_time_ms: timeOnPreviousPage,
          status: 'success',
        });
      }

      previousPath.current = location.pathname;
      pageLoadTime.current = currentTime;
    }
  }, [location.pathname, user, profile, logBusinessEvent, logPerformance, logAudit, startNewCorrelation]);

  // Log unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (user) {
        logError(
          event.reason instanceof Error 
            ? event.reason 
            : new Error(String(event.reason)),
          { module: 'UnhandledPromiseRejection' }
        );
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [user, logError]);

  // Log window errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (user) {
        logError(
          event.error instanceof Error 
            ? event.error 
            : new Error(event.message),
          { 
            module: 'WindowError',
            description: `${event.filename}:${event.lineno}:${event.colno}`,
          }
        );
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [user, logError]);

  const value: SystemLoggingContextType = {
    logTechnical,
    logBusinessEvent,
    logAudit,
    logError,
    logPerformance,
    logIntegration,
    startNewCorrelation,
  };

  return (
    <SystemLoggingContext.Provider value={value}>
      {children}
    </SystemLoggingContext.Provider>
  );
};
