/**
 * useLoggedQuery - A wrapper around useQuery that automatically logs API calls
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useSystemLogger } from './useSystemLogger';

interface LoggedQueryOptions<TData, TError> extends Omit<UseQueryOptions<TData, TError>, 'queryFn'> {
  queryFn: () => Promise<TData>;
  apiName: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  skipLogging?: boolean;
}

export function useLoggedQuery<TData = unknown, TError = Error>(
  options: LoggedQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  const { logTechnical, logError, startNewCorrelation } = useSystemLogger();
  const { apiName, module, entityType, entityId, skipLogging, queryFn, ...queryOptions } = options;
  const startTimeRef = useRef<number>(0);

  const wrappedQueryFn = useCallback(async () => {
    if (skipLogging) {
      return queryFn();
    }

    startNewCorrelation();
    startTimeRef.current = performance.now();

    try {
      const result = await queryFn();
      const executionTime = Math.round(performance.now() - startTimeRef.current);

      // Log successful API call
      logTechnical({
        api_name: apiName,
        module,
        entity_type: entityType,
        entity_id: entityId,
        execution_time_ms: executionTime,
        status: 'success',
        severity: 'info',
      });

      return result;
    } catch (error: any) {
      const executionTime = Math.round(performance.now() - startTimeRef.current);

      // Log failed API call
      logTechnical({
        api_name: apiName,
        module,
        entity_type: entityType,
        entity_id: entityId,
        execution_time_ms: executionTime,
        status: 'failed',
        severity: 'error',
        stack_trace: error?.stack,
      });

      // Also log to error logs
      logError({
        api_name: apiName,
        module,
        entity_type: entityType,
        entity_id: entityId,
        error_type: error?.name || 'QueryError',
        error_message: error?.message,
        stack_trace: error?.stack,
        severity: 'error',
      });

      throw error;
    }
  }, [queryFn, apiName, module, entityType, entityId, skipLogging, logTechnical, logError, startNewCorrelation]);

  return useQuery({
    ...queryOptions,
    queryFn: wrappedQueryFn,
  });
}
