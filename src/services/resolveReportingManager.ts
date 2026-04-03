/**
 * Shared utility to resolve a reporting manager for workflow task assignment.
 * Used across all workflow initiation and step progression hooks.
 */
import { supabase } from '@/integrations/supabase/client';

interface ResolvedManager {
  managerId: string;
  managerName: string;
}

/**
 * Resolves the reporting manager for a given user via the database RPC.
 * Returns the manager info or null if resolution fails.
 * Optionally logs the result to workflow_logs.
 */
export async function resolveReportingManagerForTask(
  userId: string,
  instanceId: string,
  stepId: string,
  stepName: string
): Promise<ResolvedManager | null> {
  try {
    const { data, error } = await supabase
      .rpc('resolve_reporting_manager', { p_user_id: userId });

    if (error) {
      console.error('[resolveReportingManager] RPC error:', error);
      await logReportingManagerResolution(instanceId, stepId, stepName, userId, null, null, error.message);
      return null;
    }

    const result = data?.[0];

    if (!result || result.error_message) {
      const reason = result?.error_message || 'Unknown error resolving reporting manager';
      console.warn('[resolveReportingManager]', reason);
      await logReportingManagerResolution(instanceId, stepId, stepName, userId, null, null, reason);
      return null;
    }

    // Log successful resolution
    await logReportingManagerResolution(
      instanceId, stepId, stepName, userId,
      result.manager_id, result.manager_name, null
    );

    return {
      managerId: result.manager_id,
      managerName: result.manager_name,
    };
  } catch (err) {
    console.error('[resolveReportingManager] Unexpected error:', err);
    return null;
  }
}

async function logReportingManagerResolution(
  instanceId: string,
  stepId: string,
  stepName: string,
  initiatorUserId: string,
  managerId: string | null,
  managerName: string | null,
  errorReason: string | null
) {
  try {
    const action = managerId ? 'approver_resolved' : 'reporting_manager_not_found';
    const details = managerId
      ? `Reporting manager resolved: ${managerName} (${managerId}) for initiator ${initiatorUserId}`
      : `Reporting manager not found for initiator ${initiatorUserId}: ${errorReason}`;

    await supabase.from('workflow_logs').insert({
      instance_id: instanceId,
      step_id: stepId,
      step_name: stepName,
      action,
      performed_by: initiatorUserId,
      performed_by_name: 'System',
      details,
      metadata: {
        approver_type: 'reporting_manager',
        initiator_user_id: initiatorUserId,
        resolved_manager_id: managerId,
        resolved_manager_name: managerName,
        error_reason: errorReason,
        resolved_at: new Date().toISOString(),
      } as any,
    });
  } catch (logErr) {
    console.error('[resolveReportingManager] Failed to log resolution:', logErr);
  }
}
