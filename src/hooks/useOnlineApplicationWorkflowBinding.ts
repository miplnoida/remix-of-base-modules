import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationListItem } from '@/types/externalApplication';
import { logApplicationError } from '@/lib/globalErrorHandler';

// The workflow definition ID for "Online IP Registration Review Workflow"
const ONLINE_IP_WORKFLOW_ID = 'cc5f077d-b7f7-4b2c-a354-4babcfee5b95';
const ONLINE_IP_WORKFLOW_NAME = 'Online IP Registration Review Workflow';
const SOURCE_MODULE = 'online-insured-person-applications';

interface WorkflowStep {
  id: string;
  step_name: string;
  step_number: number;
  sla_hours: number;
  approver_type: string;
  approver_role_ids?: string[];
  approver_designation_ids?: string[];
  approver_user_ids?: string[];
}

/**
 * Bind a single application to a workflow instance
 */
async function bindWorkflowToApplication(
  application: ApplicationListItem,
  userId: string,
  userName: string,
  firstStep: WorkflowStep
): Promise<string | null> {
  const referenceNumber = application.referenceNumber;
  if (!referenceNumber) {
    console.log(`[WorkflowBinding] Skipping application without reference number:`, application.applicationId);
    return null;
  }

  try {
    // Check if workflow instance already exists for this reference number
    const { data: existingInstance, error: checkError } = await supabase
      .from('workflow_instances')
      .select('id')
      .eq('source_module', SOURCE_MODULE)
      .eq('source_record_id', referenceNumber)
      .maybeSingle();

    if (checkError) {
      console.error(`[WorkflowBinding] Error checking existing workflow for ${referenceNumber}:`, checkError);
      return null;
    }

    if (existingInstance) {
      console.log(`[WorkflowBinding] Workflow instance already exists for ${referenceNumber}: ${existingInstance.id}`);
      return existingInstance.id;
    }

    // Create workflow instance
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + 24); // Default SLA

    const recordName = application.fullName || `Application ${referenceNumber}`;

    console.log(`[WorkflowBinding] Creating workflow instance for ${referenceNumber}...`);

    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: ONLINE_IP_WORKFLOW_ID,
        workflow_name: ONLINE_IP_WORKFLOW_NAME,
        source_module: SOURCE_MODULE,
        source_record_id: referenceNumber,
        source_record_name: recordName,
        current_step_id: firstStep.id,
        status: 'InProgress',
        started_by: userId,
        started_by_name: userName,
        due_at: dueAt.toISOString(),
        metadata: {
          reference_number: referenceNumber,
          applicant_name: recordName,
          application_id: application.applicationId,
          email: application.email,
          phone: application.phone,
          status: application.status,
          submitted_at: application.submittedAt,
        }
      })
      .select('id')
      .single();

    if (instanceError || !instance) {
      console.error(`[WorkflowBinding] Error creating workflow instance for ${referenceNumber}:`, instanceError);
      logApplicationError(instanceError || new Error('Failed to create workflow instance'), {
        module: 'online-applications-workflow-binding',
        action: 'create_instance',
        entity_id: referenceNumber,
      });
      return null;
    }

    console.log(`[WorkflowBinding] Created workflow instance ${instance.id} for ${referenceNumber}`);

    // Create first task
    const taskDueAt = new Date();
    taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));

    // Determine task assignment based on approver_type
    const taskAssignment: {
      assigned_role?: string | null;
      assigned_designation?: string | null;
      assigned_to?: string | null;
    } = {};

    const approverType = firstStep.approver_type || 'role';

    if (approverType === 'role' && firstStep.approver_role_ids && firstStep.approver_role_ids.length > 0) {
      const roleIds = firstStep.approver_role_ids;
      if (roleIds.length === 1) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('role_name')
          .eq('id', roleIds[0])
          .single();
        
        if (roleData) {
          taskAssignment.assigned_role = roleData.role_name;
        }
      }
    } else if (approverType === 'designation' && firstStep.approver_designation_ids && firstStep.approver_designation_ids.length > 0) {
      const designationIds = firstStep.approver_designation_ids;
      if (designationIds.length === 1) {
        taskAssignment.assigned_designation = designationIds[0];
      }
    } else if ((approverType === 'user' || approverType === 'specific_users') && firstStep.approver_user_ids && firstStep.approver_user_ids.length > 0) {
      const userIds = firstStep.approver_user_ids;
      if (userIds.length === 1) {
        taskAssignment.assigned_to = userIds[0];
      }
    }

    const { data: taskData, error: taskError } = await supabase
      .from('workflow_tasks')
      .insert({
        instance_id: instance.id,
        step_id: firstStep.id,
        step_name: firstStep.step_name,
        assigned_role: taskAssignment.assigned_role || null,
        assigned_designation: taskAssignment.assigned_designation || null,
        assigned_to: taskAssignment.assigned_to || null,
        status: 'Pending',
        due_at: taskDueAt.toISOString(),
      })
      .select('id')
      .single();

    if (taskError) {
      console.error(`[WorkflowBinding] Error creating workflow task for ${referenceNumber}:`, taskError);
      logApplicationError(taskError, {
        module: 'online-applications-workflow-binding',
        action: 'create_task',
        entity_id: referenceNumber,
      });
    } else {
      console.log(`[WorkflowBinding] Created workflow task ${taskData?.id} for ${referenceNumber}`);
    }

    // Log workflow start
    await supabase
      .from('workflow_logs')
      .insert({
        instance_id: instance.id,
        step_id: firstStep.id,
        step_name: firstStep.step_name,
        action: 'workflow_started',
        performed_by: userId,
        performed_by_name: userName,
        details: `Workflow auto-started for Online IP Application: ${referenceNumber}`,
      });

    // Try to notify approvers (non-blocking)
    if (taskData?.id) {
      try {
        await supabase.functions.invoke('workflow-notify-approvers', {
          body: {
            instance_id: instance.id,
            step_id: firstStep.id,
            task_id: taskData.id,
            workflow_name: ONLINE_IP_WORKFLOW_NAME,
            source_record_name: recordName,
            source_module: SOURCE_MODULE,
          },
        });
        console.log(`[WorkflowBinding] Notified approvers for ${referenceNumber}`);
      } catch (notifyError) {
        console.error('[WorkflowBinding] Failed to notify approvers (non-critical):', notifyError);
      }
    }

    return instance.id;
  } catch (error) {
    console.error(`[WorkflowBinding] Unexpected error binding workflow to ${referenceNumber}:`, error);
    logApplicationError(error instanceof Error ? error : new Error(String(error)), {
      module: 'online-applications-workflow-binding',
      action: 'bind_workflow',
      entity_id: referenceNumber,
    });
    return null;
  }
}

/**
 * Hook to automatically bind workflow instances to online applications.
 * For each application with a reference number, it checks if a workflow instance exists.
 * If not, it creates one and assigns the first task.
 */
export function useOnlineApplicationWorkflowBinding(
  applications: ApplicationListItem[] | undefined,
  enabled: boolean = true
) {
  const hasRunRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email?: string } | null>(null);

  // Get Supabase auth user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSupabaseUser(user ? { id: user.id, email: user.email } : null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSupabaseUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initial debug logging
  console.log('[WorkflowBinding] Hook initialized:', {
    applicationsCount: applications?.length ?? 0,
    enabled,
    hasUser: !!supabaseUser,
    userId: supabaseUser?.id
  });

  useEffect(() => {
    console.log('[WorkflowBinding] useEffect triggered:', {
      enabled,
      applicationsCount: applications?.length ?? 0,
      hasUser: !!supabaseUser,
      isProcessing: isProcessingRef.current
    });

    // Early exit conditions with logging
    if (!enabled) {
      console.log('[WorkflowBinding] Hook disabled, skipping');
      return;
    }
    if (!applications || applications.length === 0) {
      console.log('[WorkflowBinding] No applications to process');
      return;
    }
    if (!supabaseUser) {
      console.log('[WorkflowBinding] No user context, skipping');
      return;
    }
    if (isProcessingRef.current) {
      console.log('[WorkflowBinding] Already processing, skipping');
      return;
    }

    const bindAllWorkflows = async () => {
      isProcessingRef.current = true;
      console.log(`[WorkflowBinding] Starting workflow binding for ${applications.length} applications`);

      try {
        // Verify workflow exists and is active
        const { data: workflowDef, error: workflowError } = await supabase
          .from('workflow_definitions')
          .select('id, name, is_active, default_sla_hours')
          .eq('id', ONLINE_IP_WORKFLOW_ID)
          .single();

        if (workflowError || !workflowDef) {
          console.error('[WorkflowBinding] Online IP Registration Review Workflow not found:', workflowError);
          logApplicationError(workflowError || new Error('Workflow definition not found'), {
            module: 'online-applications-workflow-binding',
            action: 'fetch_workflow_definition',
          });
          return;
        }

        console.log(`[WorkflowBinding] Found workflow: ${workflowDef.name}, active: ${workflowDef.is_active}`);

        if (!workflowDef.is_active) {
          console.log('[WorkflowBinding] Workflow is not active, skipping binding');
          return;
        }

        // Get first step
        const { data: steps, error: stepsError } = await supabase
          .from('workflow_steps')
          .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
          .eq('workflow_id', ONLINE_IP_WORKFLOW_ID)
          .order('step_number', { ascending: true })
          .limit(1);

        if (stepsError || !steps || steps.length === 0) {
          console.error('[WorkflowBinding] No steps found for workflow:', stepsError);
          logApplicationError(stepsError || new Error('Workflow has no steps'), {
            module: 'online-applications-workflow-binding',
            action: 'fetch_workflow_steps',
          });
          return;
        }

        const firstStep = steps[0] as WorkflowStep;
        console.log(`[WorkflowBinding] First step: ${firstStep.step_name} (${firstStep.id})`);

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', supabaseUser.id)
          .single();

        const userName = profile?.full_name || 'System';

        // Get all reference numbers
        const referenceNumbers = applications
          .map(app => app.referenceNumber)
          .filter((ref): ref is string => !!ref);

        if (referenceNumbers.length === 0) {
          console.log('[WorkflowBinding] No applications with reference numbers to bind');
          return;
        }

        console.log(`[WorkflowBinding] Checking ${referenceNumbers.length} applications for existing workflow instances`);

        // Get all existing instances for these applications in one query
        const { data: existingInstances, error: existingError } = await supabase
          .from('workflow_instances')
          .select('source_record_id')
          .eq('source_module', SOURCE_MODULE)
          .in('source_record_id', referenceNumbers);

        if (existingError) {
          console.error('[WorkflowBinding] Error fetching existing workflow instances:', existingError);
          return;
        }

        const existingRefs = new Set(existingInstances?.map(i => i.source_record_id) || []);
        console.log(`[WorkflowBinding] Found ${existingRefs.size} existing workflow instances`);

        // Filter to only applications that need workflow binding and haven't been processed in this session
        const applicationsNeedingWorkflow = applications.filter(
          app => app.referenceNumber && 
                 !existingRefs.has(app.referenceNumber) &&
                 !hasRunRef.current.has(app.referenceNumber)
        );

        if (applicationsNeedingWorkflow.length === 0) {
          console.log('[WorkflowBinding] All applications already have workflow instances or have been processed');
          return;
        }

        console.log(`[WorkflowBinding] Binding workflows for ${applicationsNeedingWorkflow.length} applications`);

        // Process in batches to avoid overwhelming the database
        const BATCH_SIZE = 5;
        for (let i = 0; i < applicationsNeedingWorkflow.length; i += BATCH_SIZE) {
          const batch = applicationsNeedingWorkflow.slice(i, i + BATCH_SIZE);
          console.log(`[WorkflowBinding] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          
          const results = await Promise.all(
            batch.map(async (app) => {
              const result = await bindWorkflowToApplication(app, supabaseUser.id, userName, firstStep);
              // Mark as processed even if failed to avoid retrying immediately
              if (app.referenceNumber) {
                hasRunRef.current.add(app.referenceNumber);
              }
              return result;
            })
          );
          
          const successCount = results.filter(r => r !== null).length;
          console.log(`[WorkflowBinding] Batch completed: ${successCount}/${batch.length} successful`);
        }

        console.log('[WorkflowBinding] Workflow binding completed');
      } catch (error) {
        console.error('[WorkflowBinding] Error in workflow binding process:', error);
        logApplicationError(error instanceof Error ? error : new Error(String(error)), {
          module: 'online-applications-workflow-binding',
          action: 'bind_all_workflows',
        });
      } finally {
        isProcessingRef.current = false;
      }
    };

    bindAllWorkflows();
  }, [applications, enabled, supabaseUser]);
}
