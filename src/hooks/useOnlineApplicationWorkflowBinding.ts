import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logApplicationError } from '@/lib/globalErrorHandler';

// Workflow configuration for each application type
export interface WorkflowConfig {
  workflowId: string;
  workflowName: string;
  sourceModule: string;
}

export const WORKFLOW_CONFIGS = {
  'insured-person': {
    workflowId: 'cc5f077d-b7f7-4b2c-a354-4babcfee5b95',
    workflowName: 'Online IP Registration Review Workflow',
    sourceModule: 'online-insured-person-applications',
  },
  'employer': {
    workflowId: 'bf8e92bc-527f-4c67-8c65-1ed5df59fb84',
    workflowName: 'Online Employer Registration Review Workflow V2',
    sourceModule: 'online-employer-applications',
  },
  'doctor': {
    workflowId: '1a9f7432-3ab5-4fea-91b3-93d30a35e249',
    workflowName: 'Online Doctor Registration Review Workflow',
    sourceModule: 'online-doctor-applications',
  },
} as const;

export type ApplicationType = keyof typeof WORKFLOW_CONFIGS;

// Generic application item interface - works with any application type
export interface WorkflowBindableApplication {
  applicationId?: string;
  referenceNumber?: string | null;
  fullName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  status?: string;
  submittedAt?: string | null;
  createdAt?: string;
}

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
  application: WorkflowBindableApplication,
  userId: string,
  userName: string,
  firstStep: WorkflowStep,
  config: WorkflowConfig,
  applicationType: ApplicationType
): Promise<string | null> {
  // Use referenceNumber or applicationId as the unique identifier
  const referenceNumber = application.referenceNumber || application.applicationId;
  if (!referenceNumber) {
    console.log(`[WorkflowBinding:${applicationType}] Skipping application without reference number:`, application.applicationId);
    return null;
  }

  try {
    // Check if workflow instance already exists for this reference number
    const { data: existingInstance, error: checkError } = await supabase
      .from('workflow_instances')
      .select('id')
      .eq('source_module', config.sourceModule)
      .eq('source_record_id', referenceNumber)
      .maybeSingle();

    if (checkError) {
      console.error(`[WorkflowBinding:${applicationType}] Error checking existing workflow for ${referenceNumber}:`, checkError);
      return null;
    }

    if (existingInstance) {
      console.log(`[WorkflowBinding:${applicationType}] Workflow instance already exists for ${referenceNumber}: ${existingInstance.id}`);
      return existingInstance.id;
    }

    // Create workflow instance
    const dueAt = new Date();
    dueAt.setHours(dueAt.getHours() + 24); // Default SLA

    const recordName = application.fullName || application.contactName || `Application ${referenceNumber}`;

    console.log(`[WorkflowBinding:${applicationType}] Creating workflow instance for ${referenceNumber}...`);

    const { data: instance, error: instanceError } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: config.workflowId,
        workflow_name: config.workflowName,
        source_module: config.sourceModule,
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
          phone: application.phone || application.mobile,
          status: application.status,
          submitted_at: application.submittedAt,
          application_type: applicationType,
        }
      })
      .select('id')
      .single();

    if (instanceError || !instance) {
      console.error(`[WorkflowBinding:${applicationType}] Error creating workflow instance for ${referenceNumber}:`, instanceError);
      logApplicationError(instanceError || new Error('Failed to create workflow instance'), {
        module: `online-${applicationType}-applications-workflow-binding`,
        action: 'create_instance',
        entity_id: referenceNumber,
      });
      return null;
    }

    console.log(`[WorkflowBinding:${applicationType}] Created workflow instance ${instance.id} for ${referenceNumber}`);

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
      console.error(`[WorkflowBinding:${applicationType}] Error creating workflow task for ${referenceNumber}:`, taskError);
      logApplicationError(taskError, {
        module: `online-${applicationType}-applications-workflow-binding`,
        action: 'create_task',
        entity_id: referenceNumber,
      });
    } else {
      console.log(`[WorkflowBinding:${applicationType}] Created workflow task ${taskData?.id} for ${referenceNumber}`);
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
        details: `Workflow auto-started for Online ${applicationType.charAt(0).toUpperCase() + applicationType.slice(1)} Application: ${referenceNumber}`,
      });

    // Try to notify approvers (non-blocking)
    if (taskData?.id) {
      try {
        await supabase.functions.invoke('workflow-notify-approvers', {
          body: {
            instance_id: instance.id,
            step_id: firstStep.id,
            task_id: taskData.id,
            workflow_name: config.workflowName,
            source_record_name: recordName,
            source_module: config.sourceModule,
          },
        });
        console.log(`[WorkflowBinding:${applicationType}] Notified approvers for ${referenceNumber}`);
      } catch (notifyError) {
        console.error(`[WorkflowBinding:${applicationType}] Failed to notify approvers (non-critical):`, notifyError);
      }
    }

    return instance.id;
  } catch (error) {
    console.error(`[WorkflowBinding:${applicationType}] Unexpected error binding workflow to ${referenceNumber}:`, error);
    logApplicationError(error instanceof Error ? error : new Error(String(error)), {
      module: `online-${applicationType}-applications-workflow-binding`,
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
 * 
 * @param applications - List of applications to bind
 * @param applicationType - Type of application ('insured-person', 'employer', 'doctor')
 * @param enabled - Whether to enable the binding process
 */
export function useOnlineApplicationWorkflowBinding(
  applications: WorkflowBindableApplication[] | undefined,
  applicationType: ApplicationType = 'insured-person',
  enabled: boolean = true
) {
  const hasRunRef = useRef<Set<string>>(new Set());
  const isProcessingRef = useRef(false);
  const [supabaseUser, setSupabaseUser] = useState<{ id: string; email?: string } | null>(null);

  const config = WORKFLOW_CONFIGS[applicationType];

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
  console.log(`[WorkflowBinding:${applicationType}] Hook initialized:`, {
    applicationsCount: applications?.length ?? 0,
    enabled,
    hasUser: !!supabaseUser,
    userId: supabaseUser?.id
  });

  useEffect(() => {
    console.log(`[WorkflowBinding:${applicationType}] useEffect triggered:`, {
      enabled,
      applicationsCount: applications?.length ?? 0,
      hasUser: !!supabaseUser,
      isProcessing: isProcessingRef.current
    });

    // Early exit conditions with logging
    if (!enabled) {
      console.log(`[WorkflowBinding:${applicationType}] Hook disabled, skipping`);
      return;
    }
    if (!applications || applications.length === 0) {
      console.log(`[WorkflowBinding:${applicationType}] No applications to process`);
      return;
    }
    if (!supabaseUser) {
      console.log(`[WorkflowBinding:${applicationType}] No user context, skipping`);
      return;
    }
    if (isProcessingRef.current) {
      console.log(`[WorkflowBinding:${applicationType}] Already processing, skipping`);
      return;
    }

    const bindAllWorkflows = async () => {
      isProcessingRef.current = true;
      console.log(`[WorkflowBinding:${applicationType}] Starting workflow binding for ${applications.length} applications`);

      try {
        // Verify workflow exists and is active
        const { data: workflowDef, error: workflowError } = await supabase
          .from('workflow_definitions')
          .select('id, name, is_active, default_sla_hours')
          .eq('id', config.workflowId)
          .single();

        if (workflowError || !workflowDef) {
          console.error(`[WorkflowBinding:${applicationType}] ${config.workflowName} not found:`, workflowError);
          logApplicationError(workflowError || new Error('Workflow definition not found'), {
            module: `online-${applicationType}-applications-workflow-binding`,
            action: 'fetch_workflow_definition',
          });
          return;
        }

        console.log(`[WorkflowBinding:${applicationType}] Found workflow: ${workflowDef.name}, active: ${workflowDef.is_active}`);

        if (!workflowDef.is_active) {
          console.log(`[WorkflowBinding:${applicationType}] Workflow is not active, skipping binding`);
          return;
        }

        // Get first step
        const { data: steps, error: stepsError } = await supabase
          .from('workflow_steps')
          .select('id, step_name, step_number, sla_hours, approver_type, approver_role_ids, approver_designation_ids, approver_user_ids')
          .eq('workflow_id', config.workflowId)
          .order('step_number', { ascending: true })
          .limit(1);

        if (stepsError || !steps || steps.length === 0) {
          console.error(`[WorkflowBinding:${applicationType}] No steps found for workflow:`, stepsError);
          logApplicationError(stepsError || new Error('Workflow has no steps'), {
            module: `online-${applicationType}-applications-workflow-binding`,
            action: 'fetch_workflow_steps',
          });
          return;
        }

        const firstStep = steps[0] as WorkflowStep;
        console.log(`[WorkflowBinding:${applicationType}] First step: ${firstStep.step_name} (${firstStep.id})`);

        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', supabaseUser.id)
          .single();

        const userName = profile?.full_name || 'System';

        // Get all reference numbers
        const referenceNumbers = applications
          .map(app => app.referenceNumber || app.applicationId)
          .filter((ref): ref is string => !!ref);

        if (referenceNumbers.length === 0) {
          console.log(`[WorkflowBinding:${applicationType}] No applications with reference numbers to bind`);
          return;
        }

        console.log(`[WorkflowBinding:${applicationType}] Checking ${referenceNumbers.length} applications for existing workflow instances`);

        // Get all existing instances for these applications in one query
        const { data: existingInstances, error: existingError } = await supabase
          .from('workflow_instances')
          .select('source_record_id')
          .eq('source_module', config.sourceModule)
          .in('source_record_id', referenceNumbers);

        if (existingError) {
          console.error(`[WorkflowBinding:${applicationType}] Error fetching existing workflow instances:`, existingError);
          return;
        }

        const existingRefs = new Set(existingInstances?.map(i => i.source_record_id) || []);
        console.log(`[WorkflowBinding:${applicationType}] Found ${existingRefs.size} existing workflow instances`);

        // Filter to only applications that need workflow binding and haven't been processed in this session
        const applicationsNeedingWorkflow = applications.filter(
          app => {
            const ref = app.referenceNumber || app.applicationId;
            return ref && 
                   !existingRefs.has(ref) &&
                   !hasRunRef.current.has(ref);
          }
        );

        if (applicationsNeedingWorkflow.length === 0) {
          console.log(`[WorkflowBinding:${applicationType}] All applications already have workflow instances or have been processed`);
          return;
        }

        console.log(`[WorkflowBinding:${applicationType}] Binding workflows for ${applicationsNeedingWorkflow.length} applications`);

        // Process in batches to avoid overwhelming the database
        const BATCH_SIZE = 5;
        for (let i = 0; i < applicationsNeedingWorkflow.length; i += BATCH_SIZE) {
          const batch = applicationsNeedingWorkflow.slice(i, i + BATCH_SIZE);
          console.log(`[WorkflowBinding:${applicationType}] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          
          const results = await Promise.all(
            batch.map(async (app) => {
              const result = await bindWorkflowToApplication(app, supabaseUser.id, userName, firstStep, config, applicationType);
              // Mark as processed even if failed to avoid retrying immediately
              const ref = app.referenceNumber || app.applicationId;
              if (ref) {
                hasRunRef.current.add(ref);
              }
              return result;
            })
          );
          
          const successCount = results.filter(r => r !== null).length;
          console.log(`[WorkflowBinding:${applicationType}] Batch completed: ${successCount}/${batch.length} successful`);
        }

        console.log(`[WorkflowBinding:${applicationType}] Workflow binding completed`);
      } catch (error) {
        console.error(`[WorkflowBinding:${applicationType}] Error in workflow binding process:`, error);
        logApplicationError(error instanceof Error ? error : new Error(String(error)), {
          module: `online-${applicationType}-applications-workflow-binding`,
          action: 'bind_all_workflows',
        });
      } finally {
        isProcessingRef.current = false;
      }
    };

    bindAllWorkflows();
  }, [applications, enabled, supabaseUser, applicationType, config]);
}

// Legacy export for backward compatibility - uses insured-person config
export { useOnlineApplicationWorkflowBinding as useIPOnlineApplicationWorkflowBinding };
