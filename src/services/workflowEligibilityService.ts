/**
 * Workflow Eligibility Service
 * 
 * Evaluates whether a workflow instance is eligible to be created for a given
 * record. Uses database-driven rules from workflow_triggers, workflow_definitions,
 * and workflow_instances to make dynamic decisions instead of hardcoded logic.
 */
import { supabase } from '@/integrations/supabase/client';

export interface WorkflowEligibilityResult {
  eligible: boolean;
  reason: string;
  /** Details shown in the confirmation dialog */
  workflowName?: string;
  workflowId?: string;
  triggerId?: string;
  firstStepName?: string;
  defaultSlaHours?: number;
  totalSteps?: number;
  /** If a workflow instance already exists */
  existingInstanceId?: string | null;
  existingInstanceStatus?: string | null;
  /** Current application status */
  applicationStatus?: string | null;
}

export interface EligibilityCheckParams {
  /** UUID of the target record (unique_uuid from ip_master) */
  sourceRecordId: string;
  /** Source module identifier */
  sourceModule?: string;
  /** Module ID for workflow_triggers lookup */
  moduleId?: string;
  /** Action name to check trigger for */
  actionName?: string;
}

/**
 * Evaluates whether a workflow instance is eligible to be initiated for a record.
 * 
 * Checks:
 * 1. Active workflow trigger exists for the module + action
 * 2. Workflow definition exists and is valid
 * 3. No existing active/pending workflow instance for this record
 * 4. Workflow has at least one step configured
 */
export async function checkWorkflowEligibility({
  sourceRecordId,
  sourceModule = 'insured_person_registration',
  moduleId = '305eaff7-8446-47e0-a7ac-186da08b91ee',
  actionName = 'submit',
}: EligibilityCheckParams): Promise<WorkflowEligibilityResult> {
  try {
    // 1. Check for existing workflow instances for this record
    const { data: existingInstances, error: existErr } = await supabase
      .from('workflow_instances')
      .select('id, status')
      .eq('source_module', sourceModule)
      .eq('source_record_id', sourceRecordId);

    if (existErr) {
      return {
        eligible: false,
        reason: `Failed to check existing workflows: ${existErr.message}`,
      };
    }

    // If an active/in-progress instance exists, workflow is not eligible
    if (existingInstances && existingInstances.length > 0) {
      const activeInstance = existingInstances.find(
        (i) => i.status === 'InProgress' || i.status === 'Pending'
      );
      if (activeInstance) {
        return {
          eligible: false,
          reason: `An active workflow instance already exists for this record (Status: ${activeInstance.status}).`,
          existingInstanceId: activeInstance.id,
          existingInstanceStatus: activeInstance.status,
        };
      }

      // If completed/cancelled instances exist, still allow new workflow
      const completedInstance = existingInstances.find(
        (i) => i.status === 'Approved' || i.status === 'Rejected'
      );
      if (completedInstance) {
        // Allow re-initiation but note the previous instance
        // Continue to eligibility checks below
      }
    }

    // 2. Look up active workflow trigger for this module + action
    const { data: triggers, error: triggerErr } = await supabase
      .from('workflow_triggers')
      .select('id, workflow_id, action_name, is_active')
      .eq('action_name', actionName)
      .eq('is_active', true)
      .eq('module_id', moduleId);

    if (triggerErr) {
      return {
        eligible: false,
        reason: `Failed to check workflow triggers: ${triggerErr.message}`,
      };
    }

    if (!triggers || triggers.length === 0) {
      return {
        eligible: false,
        reason: 'No active workflow trigger is configured for this application type.',
      };
    }

    const trigger = triggers[0];

    // 3. Get workflow definition
    const { data: workflow, error: wfErr } = await supabase
      .from('workflow_definitions')
      .select('id, name, default_sla_hours')
      .eq('id', trigger.workflow_id)
      .single();

    if (wfErr || !workflow) {
      return {
        eligible: false,
        reason: 'The workflow definition referenced by the trigger could not be found.',
      };
    }

    // 4. Get workflow steps count and first step
    const { data: steps, error: stepsErr } = await supabase
      .from('workflow_steps')
      .select('id, step_name, step_number')
      .eq('workflow_id', workflow.id)
      .order('step_number', { ascending: true });

    if (stepsErr || !steps || steps.length === 0) {
      return {
        eligible: false,
        reason: 'The workflow has no steps configured. Cannot initiate.',
      };
    }

    // All checks passed — workflow is eligible
    return {
      eligible: true,
      reason: 'Workflow is eligible to be initiated.',
      workflowName: workflow.name,
      workflowId: workflow.id,
      triggerId: trigger.id,
      firstStepName: steps[0].step_name,
      defaultSlaHours: workflow.default_sla_hours ?? 24,
      totalSteps: steps.length,
      existingInstanceId: null,
      existingInstanceStatus: null,
    };
  } catch (err) {
    return {
      eligible: false,
      reason: `Eligibility check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
