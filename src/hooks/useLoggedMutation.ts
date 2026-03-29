/**
 * useLoggedMutation - A wrapper around useMutation that automatically logs API calls and business events
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useSystemLogger } from './useSystemLogger';

interface LoggedMutationOptions<TData, TError, TVariables, TContext> 
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  apiName: string;
  module?: string;
  entityType?: string;
  action?: string; // e.g., 'create', 'update', 'delete'
  skipLogging?: boolean;
  logBusinessEvent?: boolean;
  getEntityId?: (variables: TVariables, result?: TData) => string | undefined;
  getBeforeValue?: (variables: TVariables) => Record<string, any> | undefined;
  getAfterValue?: (variables: TVariables, result?: TData) => Record<string, any> | undefined;
}

export function useLoggedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: LoggedMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { 
    logTechnical, 
    logError, 
    logBusinessEvent, 
    logAudit,
    startNewCorrelation 
  } = useSystemLogger();
  
  const { 
    apiName, 
    module, 
    entityType, 
    action,
    skipLogging, 
    logBusinessEvent: shouldLogBusinessEvent,
    getEntityId,
    getBeforeValue,
    getAfterValue,
    mutationFn, 
    onSuccess,
    onError,
    ...mutationOptions 
  } = options;

  const startTimeRef = useRef<number>(0);

  const wrappedMutationFn = useCallback(async (variables: TVariables) => {
    if (skipLogging) {
      return mutationFn(variables);
    }

    startNewCorrelation();
    startTimeRef.current = performance.now();

    try {
      const result = await mutationFn(variables);
      const executionTime = Math.round(performance.now() - startTimeRef.current);
      const entityId = getEntityId?.(variables, result);

      // Log successful API call
      logTechnical({
        api_name: apiName,
        module,
        entity_type: entityType,
        entity_id: entityId,
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
        request_payload: variables as Record<string, any>,
      });

      // Log business event if requested
      if (shouldLogBusinessEvent && action) {
        logBusinessEvent({
          module,
          entity_type: entityType,
          entity_id: entityId,
          action,
          description: `${action} ${entityType || 'entity'}`,
        });
      }

      // Log audit trail for updates
      if (action === 'update' || action === 'delete') {
        logAudit({
          module,
          entity_type: entityType,
          entity_id: entityId,
          action,
          before_value: getBeforeValue?.(variables),
          after_value: getAfterValue?.(variables, result),
        });
      }

      return result;
    } catch (error: any) {
      const executionTime = Math.round(performance.now() - startTimeRef.current);
      const entityId = getEntityId?.(variables, undefined);

      // Log failed API call
      logTechnical({
        api_name: apiName,
        module,
        entity_type: entityType,
        entity_id: entityId,
        execution_time_ms: executionTime,
        status: 'failed',
        severity: 'error',
        request_payload: variables as Record<string, any>,
        stack_trace: error?.stack,
      });

      // Also log to error logs
      logError({
        api_name: apiName,
        module,
        entity_type: entityType,
        entity_id: entityId,
        error_type: error?.name || 'MutationError',
        error_message: error?.message,
        stack_trace: error?.stack,
        severity: 'error',
      });

      throw error;
    }
  }, [
    mutationFn, 
    apiName, 
    module, 
    entityType, 
    action,
    skipLogging, 
    shouldLogBusinessEvent,
    getEntityId,
    getBeforeValue,
    getAfterValue,
    logTechnical, 
    logError, 
    logBusinessEvent,
    logAudit,
    startNewCorrelation
  ]);

  return useMutation({
    mutationKey: ['System', 'logged_mutation', 'mutation'],
    ...mutationOptions,
    mutationFn: wrappedMutationFn,
    onSuccess,
    onError,
  });
}
