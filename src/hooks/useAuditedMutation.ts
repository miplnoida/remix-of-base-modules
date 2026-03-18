/**
 * useAuditedMutation — Enhanced mutation wrapper with automatic audit logging.
 * 
 * Features:
 * - Automatic before_value capture via fetchCurrentRecord
 * - Automatic after_value from mutation result
 * - Writes to system_audit_trail on success and failure
 * - Recommended for new development where rich audit data is needed
 * 
 * For existing mutations, the global MutationCache interceptor in App.tsx
 * provides automatic baseline audit logging without any code changes.
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logAuditEntry } from '@/services/globalAuditInterceptor';
import { useUserCode } from '@/hooks/useUserCode';

interface AuditedMutationConfig {
  /** Module name, e.g. 'Cashier', 'Registration' */
  module: string;
  /** Entity type, e.g. 'cn_batch', 'er_master' */
  entityType: string;
  /** Action verb, e.g. 'create', 'update', 'delete', 'approve' */
  action: string;
  /** Optional: fetch the current DB record before mutation executes (for before_value) */
  fetchCurrentRecord?: (variables: any) => Promise<Record<string, any> | null>;
  /** Optional: extract entity ID from variables or result */
  getEntityId?: (variables: any, result?: any) => string | undefined;
}

interface AuditedMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  audit: AuditedMutationConfig;
}

export function useAuditedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: AuditedMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { mutationFn, audit, onSuccess, onError, ...rest } = options;
  const location = useLocation();
  const { userCode } = useUserCode();
  const beforeValueRef = useRef<Record<string, any> | null>(null);

  const wrappedFn = useCallback(async (variables: TVariables) => {
    // Capture before_value if fetcher provided
    if (audit.fetchCurrentRecord) {
      try {
        beforeValueRef.current = await audit.fetchCurrentRecord(variables);
      } catch {
        beforeValueRef.current = null;
      }
    }

    try {
      const result = await mutationFn(variables);
      const entityId = audit.getEntityId?.(variables, result);

      // Log successful audit entry
      logAuditEntry({
        action: audit.action,
        entityType: audit.entityType,
        entityId,
        module: audit.module,
        route: location.pathname,
        beforeValue: beforeValueRef.current,
        afterValue: result && typeof result === 'object' ? result as Record<string, any> : { value: result },
        metadata: { source: 'useAuditedMutation', userCode },
      });

      return result;
    } catch (error: any) {
      const entityId = audit.getEntityId?.(variables, undefined);

      // Log failed audit entry
      logAuditEntry({
        action: `${audit.action}_failed`,
        entityType: audit.entityType,
        entityId,
        module: audit.module,
        route: location.pathname,
        beforeValue: beforeValueRef.current,
        metadata: {
          source: 'useAuditedMutation',
          userCode,
          error: error?.message,
        },
      });

      throw error;
    }
  }, [mutationFn, audit, location.pathname, userCode]);

  return useMutation({
    ...rest,
    mutationFn: wrappedFn,
    onSuccess,
    onError,
  });
}
