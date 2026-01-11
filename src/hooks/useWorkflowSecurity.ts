import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

export interface WorkflowTaskAccess {
  allowed: boolean;
  reason: string;
  is_admin?: boolean;
  workflow_instance_id?: string;
  secured_table?: string;
  visible_fields?: FieldRule[];
  editable_fields?: FieldRule[];
  available_actions?: string[];
  scope_rules_applied?: any[];
}

export interface FieldRule {
  field_name: string;
  can_view: boolean;
  can_edit: boolean;
  masking_type: 'none' | 'partial' | 'full';
}

export interface WorkflowPolicyTestResult {
  user: {
    id: string;
    name: string;
    email: string;
    is_admin: boolean;
    department_id?: string;
  };
  workflow: {
    id: string;
    name: string;
    secured_module?: string;
    secured_table?: string;
  };
  can_see_workflow: boolean;
  reason: string;
  visible_fields: FieldRule[];
  available_actions: string[];
  scope_rules_applied?: any[];
}

/**
 * Hook to check workflow task access for the current user
 */
export function useWorkflowTaskAccess(workflowInstanceId: string | null, action: 'view' | 'edit' = 'view') {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['workflow-task-access', user?.id, workflowInstanceId, action],
    queryFn: async (): Promise<WorkflowTaskAccess> => {
      if (!user?.id || !workflowInstanceId) {
        return { allowed: false, reason: 'Not authenticated or no workflow instance' };
      }

      const { data, error } = await (supabase.rpc as any)('check_workflow_task_access', {
        _user_id: user.id,
        _workflow_instance_id: workflowInstanceId,
        _action: action
      });

      if (error) throw error;
      return data || { allowed: false, reason: 'Unknown error' };
    },
    enabled: !!user?.id && !!workflowInstanceId
  });
}

/**
 * Hook to filter workflow queue items based on data access policies
 */
export function useSecuredWorkflowQueue() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['secured-workflow-queue', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First get all workflow tasks assigned to this user
      const { data: tasks, error: tasksError } = await supabase
        .from('workflow_tasks')
        .select(`
          *,
          instance:workflow_instances(
            id,
            workflow_id,
            workflow_name,
            source_module,
            source_record_id,
            source_record_name,
            status,
            started_at,
            due_at
          )
        `)
        .in('status', ['Pending', 'InProgress'])
        .or(`assigned_user_id.eq.${user.id}`);

      if (tasksError) throw tasksError;
      if (!tasks?.length) return [];

      // For each task, check if user has data access to the underlying record
      const accessChecks = await Promise.all(
        tasks.map(async (task: any) => {
          const instanceId = task.instance?.id;
          if (!instanceId) return { ...task, hasAccess: false, accessDetails: null };

          try {
            const { data: accessData } = await (supabase.rpc as any)('check_workflow_task_access', {
              _user_id: user.id,
              _workflow_instance_id: instanceId,
              _action: 'view'
            });

            return {
              ...task,
              hasAccess: accessData?.allowed || false,
              accessDetails: accessData
            };
          } catch {
            return { ...task, hasAccess: false, accessDetails: null };
          }
        })
      );

      // Filter to only tasks where user has access
      return accessChecks.filter((task: any) => task.hasAccess);
    },
    enabled: !!user?.id
  });
}

/**
 * Hook to log workflow security events
 */
export function useLogWorkflowSecurityEvent() {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowInstanceId,
      action,
      recordId,
      fieldsViewed,
      fieldsEdited,
      rulesApplied,
      accessGranted,
      denialReason
    }: {
      workflowInstanceId: string;
      action: string;
      recordId?: string;
      fieldsViewed?: string[];
      fieldsEdited?: string[];
      rulesApplied?: any;
      accessGranted: boolean;
      denialReason?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await (supabase.rpc as any)('log_workflow_security_event', {
        _workflow_instance_id: workflowInstanceId,
        _user_id: user.id,
        _action: action,
        _record_id: recordId,
        _fields_viewed: fieldsViewed,
        _fields_edited: fieldsEdited,
        _rules_applied: rulesApplied,
        _access_granted: accessGranted,
        _denial_reason: denialReason
      });

      if (error) throw error;
      return data;
    }
  });
}

/**
 * Hook to validate workflow action permissions
 */
export function useValidateWorkflowAction() {
  const { user } = useSupabaseAuth();
  const logEvent = useLogWorkflowSecurityEvent();

  return useMutation({
    mutationFn: async ({
      workflowInstanceId,
      action
    }: {
      workflowInstanceId: string;
      action: 'approve' | 'reject' | 'query' | 'send_back';
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if user has edit permission on the workflow
      const { data: accessData, error } = await (supabase.rpc as any)('check_workflow_task_access', {
        _user_id: user.id,
        _workflow_instance_id: workflowInstanceId,
        _action: 'edit'
      });

      if (error) throw error;

      const allowed = accessData?.allowed || false;
      const availableActions = accessData?.available_actions || [];

      // Log the access attempt
      await logEvent.mutateAsync({
        workflowInstanceId,
        action,
        accessGranted: allowed && availableActions.includes(action),
        denialReason: !allowed ? accessData?.reason : undefined,
        rulesApplied: accessData?.scope_rules_applied
      });

      if (!allowed) {
        throw new Error(accessData?.reason || 'Access denied');
      }

      if (!availableActions.includes(action)) {
        throw new Error(`Action "${action}" is not permitted for this workflow`);
      }

      return { allowed: true, accessDetails: accessData };
    }
  });
}

/**
 * Hook to test workflow policy for a user
 */
export function useTestWorkflowPolicy() {
  return useMutation({
    mutationFn: async ({
      userId,
      workflowId,
      recordId
    }: {
      userId: string;
      workflowId: string;
      recordId?: string;
    }): Promise<WorkflowPolicyTestResult> => {
      const { data, error } = await (supabase.rpc as any)('test_workflow_policy', {
        _test_user_id: userId,
        _workflow_id: workflowId,
        _record_id: recordId
      });

      if (error) throw error;
      return data;
    }
  });
}

/**
 * Hook to find eligible approvers with data access
 */
export function useFindEligibleApprovers(workflowInstanceId: string | null, stepId: string | null, excludeUsers: string[] = []) {
  return useQuery({
    queryKey: ['eligible-approvers', workflowInstanceId, stepId, excludeUsers],
    queryFn: async () => {
      if (!workflowInstanceId || !stepId) return [];

      const { data, error } = await (supabase.rpc as any)('find_eligible_approver', {
        _workflow_instance_id: workflowInstanceId,
        _step_id: stepId,
        _exclude_users: excludeUsers
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowInstanceId && !!stepId
  });
}

/**
 * Hook to get workflow definitions with security bindings
 */
export function useWorkflowDefinitionsWithSecurity() {
  return useQuery({
    queryKey: ['workflow-definitions-with-security'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .select(`
          *,
          secured_module:app_modules(id, name, display_name)
        `)
        .order('name');

      if (error) throw error;
      return data;
    }
  });
}

/**
 * Hook to update workflow security binding
 */
export function useUpdateWorkflowSecurity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workflowId,
      securedModuleId,
      securedTable
    }: {
      workflowId: string;
      securedModuleId: string | null;
      securedTable: string | null;
    }) => {
      const { data, error } = await supabase
        .from('workflow_definitions')
        .update({
          secured_module_id: securedModuleId,
          secured_table: securedTable
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-definitions-with-security'] });
      toast.success('Workflow security binding updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update workflow security: ' + error.message);
    }
  });
}

/**
 * Utility function to mask field value based on masking type
 */
export function maskWorkflowFieldValue(value: any, maskingType: 'none' | 'partial' | 'full'): string {
  if (value === null || value === undefined) return '';
  const strValue = String(value);
  
  switch (maskingType) {
    case 'full':
      return '****';
    case 'partial':
      if (strValue.length <= 4) return '****';
      return '***' + strValue.slice(-4);
    default:
      return strValue;
  }
}

/**
 * Get field visibility for a specific field
 */
export function getFieldVisibility(fieldName: string, fieldRules: FieldRule[]): FieldRule | null {
  if (!fieldRules?.length) return null;
  return fieldRules.find(r => r.field_name === fieldName) || null;
}

/**
 * Check if a field should be visible
 */
export function isFieldVisible(fieldName: string, fieldRules: FieldRule[], isAdmin: boolean = false): boolean {
  if (isAdmin || !fieldRules?.length) return true;
  const rule = getFieldVisibility(fieldName, fieldRules);
  return rule ? rule.can_view : true; // Default to visible if no rule
}

/**
 * Check if a field should be editable
 */
export function isFieldEditable(fieldName: string, fieldRules: FieldRule[], isAdmin: boolean = false): boolean {
  if (isAdmin || !fieldRules?.length) return true;
  const rule = getFieldVisibility(fieldName, fieldRules);
  return rule ? rule.can_edit : true; // Default to editable if no rule
}

/**
 * Get masking type for a field
 */
export function getFieldMaskingType(fieldName: string, fieldRules: FieldRule[]): 'none' | 'partial' | 'full' {
  if (!fieldRules?.length) return 'none';
  const rule = getFieldVisibility(fieldName, fieldRules);
  return rule?.masking_type || 'none';
}
