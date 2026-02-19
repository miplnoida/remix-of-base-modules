/**
 * useWorkflowInitialization
 *
 * Conditional workflow initialization logic for IP Registration pages.
 *
 * Behaviour:
 * - On page load, checks the record's status from ip_master.
 * - If status is 'Z' (Draft): pre-checks whether a Submit workflow binding
 *   exists so the UI can inform the user. No workflow instance is created.
 * - If status is NOT 'Z' (e.g. 'P' — submitted/converted): checks whether a
 *   workflow instance already exists. If not, and a binding is configured,
 *   surfaces a confirmation dialog so the user can decide whether to initiate.
 * - Prevents duplicate workflow instances.
 * - All queries go through Supabase client endpoints with RLS.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  checkWorkflowEligibility,
  type WorkflowEligibilityResult,
} from '@/services/workflowEligibilityService';
import { triggerIPRegistrationWorkflow } from '@/services/workflowTriggerService';
import { toast } from 'sonner';

export interface WorkflowInitState {
  /** Whether the eligibility check is still running */
  isChecking: boolean;
  /** Result of the eligibility check (null until complete) */
  eligibility: WorkflowEligibilityResult | null;
  /** True when the confirmation dialog should be visible */
  showDialog: boolean;
  /** True while a workflow instance is being created */
  isInitiating: boolean;
  /** ID of the created workflow instance (if any) */
  workflowInstanceId: string | null;
  /** Whether a Submit workflow binding exists (useful for Draft records) */
  workflowConfigured: boolean;
  /** Whether a workflow instance already existed before this hook ran */
  existingInstanceFound: boolean;
}

interface UseWorkflowInitializationParams {
  /** The unique_uuid of the ip_master record */
  uniqueUuid: string | undefined;
  /** Current status from ip_master ('Z' = Draft, 'P' = Pending, etc.) */
  status: string | undefined;
  /** SSN of the record (needed for workflow trigger) */
  ssn: string | undefined;
  /** Display name for the record (firstname + surname) */
  recordName: string;
  /** Current user ID */
  userId: string | undefined;
  /** Whether to skip the check entirely (e.g. new mode) */
  skip?: boolean;
}

export function useWorkflowInitialization({
  uniqueUuid,
  status,
  ssn,
  recordName,
  userId,
  skip = false,
}: UseWorkflowInitializationParams): WorkflowInitState & {
  /** Open the confirmation dialog manually */
  openDialog: () => void;
  /** Close the dialog without initiating */
  declineWorkflow: () => void;
  /** Confirm and create the workflow instance */
  confirmWorkflow: () => Promise<void>;
  /** Re-run the eligibility check */
  recheck: () => void;
} {
  const [isChecking, setIsChecking] = useState(false);
  const [eligibility, setEligibility] = useState<WorkflowEligibilityResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [workflowInstanceId, setWorkflowInstanceId] = useState<string | null>(null);
  const [workflowConfigured, setWorkflowConfigured] = useState(false);
  const [existingInstanceFound, setExistingInstanceFound] = useState(false);
  const hasCheckedRef = useRef(false);

  const runEligibilityCheck = useCallback(async () => {
    if (!uniqueUuid || !status || skip) return;

    setIsChecking(true);
    console.log(`[useWorkflowInitialization] Checking eligibility for ${uniqueUuid}, status=${status}`);

    try {
      const result = await checkWorkflowEligibility({
        sourceRecordId: uniqueUuid,
      });

      setEligibility(result);

      if (result.existingInstanceId) {
        setExistingInstanceFound(true);
        setWorkflowInstanceId(result.existingInstanceId);
        console.log(`[useWorkflowInitialization] Existing workflow instance found: ${result.existingInstanceId} (status: ${result.existingInstanceStatus})`);
      }

      if (result.eligible) {
        setWorkflowConfigured(true);

        if (status === 'Z') {
          // Draft: just log that a workflow is configured for submit
          console.log(`[useWorkflowInitialization] Draft record — workflow binding found: "${result.workflowName}". Will be triggered on submit.`);
        } else {
          // Non-draft without active workflow → show confirmation dialog
          console.log(`[useWorkflowInitialization] Non-draft record (status=${status}) eligible for workflow "${result.workflowName}". Showing confirmation dialog.`);
          setShowDialog(true);
        }
      } else {
        // Not eligible — could be no binding, or existing active instance
        setWorkflowConfigured(
          result.reason !== 'No active workflow trigger is configured for this application type.' &&
          result.reason !== 'The workflow definition referenced by the trigger could not be found.' &&
          result.reason !== 'The workflow has no steps configured. Cannot initiate.'
        );
        console.log(`[useWorkflowInitialization] Not eligible: ${result.reason}`);
      }
    } catch (err) {
      console.error('[useWorkflowInitialization] Error during eligibility check:', err);
    } finally {
      setIsChecking(false);
    }
  }, [uniqueUuid, status, skip]);

  // Run on mount / when dependencies change (only once per record)
  useEffect(() => {
    if (hasCheckedRef.current) return;
    if (!uniqueUuid || !status || skip) return;

    hasCheckedRef.current = true;
    runEligibilityCheck();
  }, [uniqueUuid, status, skip, runEligibilityCheck]);

  const openDialog = useCallback(() => {
    if (eligibility?.eligible) {
      setShowDialog(true);
    }
  }, [eligibility]);

  const declineWorkflow = useCallback(() => {
    console.log('[useWorkflowInitialization] User declined workflow initiation');
    setShowDialog(false);

    // Audit log the decline (non-blocking)
    if (uniqueUuid) {
      supabase.from('ip_audit_log').insert({
        table_name: 'ip_master',
        record_id: uniqueUuid,
        unique_uuid: uniqueUuid,
        action: 'WORKFLOW_DECLINED',
        changed_by: userId,
        field_name: 'workflow_instance',
        new_value: eligibility?.workflowName || 'Unknown',
      }).then(({ error }) => {
        if (error) console.error('[useWorkflowInitialization] Failed to log decline:', error);
      });
    }
  }, [uniqueUuid, userId, eligibility]);

  const confirmWorkflow = useCallback(async () => {
    if (!uniqueUuid || !eligibility?.eligible) return;

    setIsInitiating(true);
    console.log(`[useWorkflowInitialization] User confirmed workflow initiation for ${uniqueUuid}`);

    try {
      const instanceId = await triggerIPRegistrationWorkflow({
        uniqueUuid,
        ssn: ssn || '',
        recordName,
        userId,
      });

      if (instanceId) {
        setWorkflowInstanceId(instanceId);
        setExistingInstanceFound(true);
        toast.success(`Workflow "${eligibility.workflowName}" initiated successfully`);
        console.log(`[useWorkflowInitialization] Workflow instance created: ${instanceId}`);

        // Audit log
        await supabase.from('ip_audit_log').insert({
          table_name: 'ip_master',
          record_id: uniqueUuid,
          unique_uuid: uniqueUuid,
          action: 'WORKFLOW_INITIATED',
          changed_by: userId,
          field_name: 'workflow_instance',
          new_value: instanceId,
        });
      } else {
        toast.error('Failed to create workflow instance');
        console.error('[useWorkflowInitialization] triggerIPRegistrationWorkflow returned null');
      }
    } catch (err) {
      console.error('[useWorkflowInitialization] Error initiating workflow:', err);
      toast.error('Error initiating workflow');
    } finally {
      setIsInitiating(false);
      setShowDialog(false);
    }
  }, [uniqueUuid, ssn, recordName, userId, eligibility]);

  const recheck = useCallback(() => {
    hasCheckedRef.current = false;
    setEligibility(null);
    setWorkflowConfigured(false);
    setExistingInstanceFound(false);
    setWorkflowInstanceId(null);
    runEligibilityCheck();
  }, [runEligibilityCheck]);

  return {
    isChecking,
    eligibility,
    showDialog,
    isInitiating,
    workflowInstanceId,
    workflowConfigured,
    existingInstanceFound,
    openDialog,
    declineWorkflow,
    confirmWorkflow,
    recheck,
  };
}
