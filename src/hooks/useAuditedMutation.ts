/**
 * useAuditedMutation — Enhanced mutation wrapper with automatic audit logging.
 * 
 * Features:
 * - Automatic before_value capture via fetchCurrentRecord
 * - Change detection: skips audit if no fields actually changed
 * - Automatic after_value from mutation result
 * - Writes to system_audit_trail on success and failure
 * - Captures module, screen, tab, and section context
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { logAuditEntry, computeChangedFields, resolveRouteContext, DB_TRIGGER_TABLES } from '@/services/globalAuditInterceptor';
import { useUserCode } from '@/hooks/useUserCode';

interface AuditedMutationConfig {
  /** Module name, e.g. 'Cashier', 'Registration' */
  module: string;
  /** Entity type, e.g. 'cn_batch', 'er_master' */
  entityType: string;
  /** Action verb, e.g. 'create', 'update', 'delete', 'approve' */
  action: string;
  /** Screen or tab name for richer context */
  screenName?: string;
  tabName?: string;
  sectionName?: string;
  /** Optional: fetch the current DB record before mutation executes (for before_value) */
  fetchCurrentRecord?: (variables: any) => Promise<Record<string, any> | null>;
  /** Optional: extract entity ID from variables or result */
  getEntityId?: (variables: any, result?: any) => string | undefined;
  /** If true, skip audit when before and after are identical (default: true) */
  skipNoOpUpdates?: boolean;
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
  const skipNoOp = audit.skipNoOpUpdates !== false;

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
      const afterValue = result && typeof result === 'object' ? result as Record<string, any> : { value: result };

      // Change detection: skip if no real fields changed
      if (skipNoOp && audit.action === 'update' && beforeValueRef.current && afterValue) {
        const diff = computeChangedFields(beforeValueRef.current, afterValue);
        if (!diff) {
          // No actual changes — skip audit log
          return result;
        }
      }

      // Resolve module from route if not explicitly provided
      const routeCtx = resolveRouteContext(location.pathname);

      logAuditEntry({
        action: audit.action,
        entityType: audit.entityType,
        entityId,
        module: audit.module || routeCtx.module,
        route: location.pathname,
        screenName: audit.screenName || routeCtx.screen,
        tabName: audit.tabName,
        sectionName: audit.sectionName,
        beforeValue: beforeValueRef.current,
        afterValue,
        metadata: { source: 'useAuditedMutation', userCode },
      });

      return result;
    } catch (error: any) {
      const entityId = audit.getEntityId?.(variables, undefined);
      const routeCtx = resolveRouteContext(location.pathname);

      logAuditEntry({
        action: `${audit.action}_failed`,
        entityType: audit.entityType,
        entityId,
        module: audit.module || routeCtx.module,
        route: location.pathname,
        screenName: audit.screenName || routeCtx.screen,
        tabName: audit.tabName,
        sectionName: audit.sectionName,
        beforeValue: beforeValueRef.current,
        metadata: {
          source: 'useAuditedMutation',
          userCode,
          error: error?.message,
        },
      });

      throw error;
    }
  }, [mutationFn, audit, location.pathname, userCode, skipNoOp]);

  return useMutation({
    ...rest,
    mutationFn: wrappedFn,
    onSuccess,
    onError,
  });
}
