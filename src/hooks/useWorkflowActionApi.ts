import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WorkflowActionApiConfig {
  id: string;
  workflow_id: string;
  workflow_step_id: string;
  action_code: string;
  http_method: string;
  endpoint_url: string;
  api_key_secret_name: string;
  content_type: string;
  timeout_seconds: number;
  retry_count: number;
  is_active: boolean;
  description?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by?: string;
}

export interface WorkflowActionApiBodyMapping {
  id: string;
  workflow_action_api_id: string;
  json_field_name: string;
  value_source: 'APPLICATION' | 'MEETING' | 'WORKFLOW' | 'SYSTEM' | 'STATIC';
  source_key: string;
  static_value?: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
}

export interface WorkflowApiExecutionLog {
  id: string;
  workflow_instance_id: string;
  workflow_step_id?: string;
  task_id?: string;
  action_code: string;
  api_config_id?: string;
  endpoint_url: string;
  http_method: string;
  request_payload: Record<string, any>;
  response_payload?: Record<string, any>;
  http_status?: number;
  execution_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'TIMEOUT';
  error_message?: string;
  duration_ms?: number;
  retry_attempt: number;
  executed_by?: string;
  executed_at: string;
}

/**
 * Hook to fetch API configuration for a workflow step and action.
 */
export function useWorkflowActionApiConfig(
  workflowId: string | undefined,
  stepId: string | undefined,
  actionCode: string | undefined
) {
  return useQuery({
    queryKey: ['workflow-action-api-config', workflowId, stepId, actionCode],
    queryFn: async () => {
      if (!workflowId || !stepId || !actionCode) return null;

      const { data, error } = await supabase
        .from('workflow_step_action_api')
        .select(`
          *,
          body_mappings:workflow_step_action_api_body(*)
        `)
        .eq('workflow_id', workflowId)
        .eq('workflow_step_id', stepId)
        .eq('action_code', actionCode)
        .maybeSingle();

      if (error) throw error;
      return data as (WorkflowActionApiConfig & { body_mappings: WorkflowActionApiBodyMapping[] }) | null;
    },
    enabled: !!workflowId && !!stepId && !!actionCode,
  });
}

/**
 * Hook to fetch all API configurations for a workflow.
 */
export function useWorkflowApiConfigs(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-api-configs', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];

      const { data, error } = await supabase
        .from('workflow_step_action_api')
        .select(`
          *,
          workflow_step:workflow_steps(step_name),
          body_mappings:workflow_step_action_api_body(*)
        `)
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!workflowId,
  });
}

/**
 * Hook to fetch API execution logs for a workflow instance.
 */
export function useWorkflowApiExecutionLogs(instanceId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-api-execution-logs', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];

      const { data, error } = await supabase
        .from('workflow_api_execution_log')
        .select('*')
        .eq('workflow_instance_id', instanceId)
        .order('executed_at', { ascending: false });

      if (error) throw error;
      return data as WorkflowApiExecutionLog[];
    },
    enabled: !!instanceId,
  });
}

/**
 * Hook to save API configuration for a workflow action.
 */
export function useSaveWorkflowActionApiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Workflow', 'workflow_action_api', 'mutation'],
    mutationFn: async ({
      config,
      bodyMappings,
      createdBy,
    }: {
      config: Omit<WorkflowActionApiConfig, 'id' | 'created_at' | 'updated_at'>;
      bodyMappings: Omit<WorkflowActionApiBodyMapping, 'id' | 'workflow_action_api_id' | 'created_at'>[];
      createdBy: string;
    }) => {
      // Check if config already exists
      const { data: existing } = await supabase
        .from('workflow_step_action_api')
        .select('id')
        .eq('workflow_id', config.workflow_id)
        .eq('workflow_step_id', config.workflow_step_id)
        .eq('action_code', config.action_code)
        .maybeSingle();

      let configId: string;

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('workflow_step_action_api')
          .update({
            ...config,
            updated_by: createdBy,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('id')
          .single();

        if (error) throw error;
        configId = data.id;

        // Delete existing body mappings
        await supabase
          .from('workflow_step_action_api_body')
          .delete()
          .eq('workflow_action_api_id', configId);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('workflow_step_action_api')
          .insert({
            ...config,
            created_by: createdBy,
          })
          .select('id')
          .single();

        if (error) throw error;
        configId = data.id;
      }

      // Insert body mappings
      if (bodyMappings.length > 0) {
        const mappingsToInsert = bodyMappings.map((m, index) => ({
          ...m,
          workflow_action_api_id: configId,
          display_order: m.display_order ?? index,
        }));

        const { error: mappingsError } = await supabase
          .from('workflow_step_action_api_body')
          .insert(mappingsToInsert);

        if (mappingsError) throw mappingsError;
      }

      return { id: configId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['workflow-action-api-config', variables.config.workflow_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['workflow-api-configs', variables.config.workflow_id] 
      });
      toast.success('API configuration saved successfully');
    },
    onError: (error: Error) => {
      console.error('Error saving API config:', error);
      toast.error(`Failed to save API configuration: ${error.message}`);
    },
  });
}

/**
 * Hook to delete API configuration.
 */
export function useDeleteWorkflowActionApiConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Workflow', 'workflow_action_api', 'delete'],
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('workflow_step_action_api')
        .delete()
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-action-api-config'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-api-configs'] });
      toast.success('API configuration deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete API configuration: ${error.message}`);
    },
  });
}

/**
 * Hook to retry a failed API execution.
 */
export function useRetryWorkflowApiExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['Workflow', 'workflow_action_api', 'mutation'],
    mutationFn: async (executionLogId: string) => {
      const { data, error } = await supabase.functions.invoke('workflow-action-api', {
        body: {
          action: 'retry',
          executionLogId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, executionLogId) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-api-execution-logs'] });
      
      if (result.success) {
        toast.success('API retry successful');
      } else {
        toast.warning('API retry failed', {
          description: result.errorMessage,
        });
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to retry API: ${error.message}`);
    },
  });
}

/**
 * Value source options for body mappings.
 */
export const VALUE_SOURCE_OPTIONS = [
  { value: 'APPLICATION', label: 'Application Data', description: 'Data from the source record' },
  { value: 'MEETING', label: 'Meeting Data', description: 'Data from scheduled meeting' },
  { value: 'WORKFLOW', label: 'Workflow Context', description: 'Workflow instance context' },
  { value: 'SYSTEM', label: 'System Values', description: 'System-generated values' },
  { value: 'STATIC', label: 'Static Value', description: 'Fixed/constant value' },
] as const;

/**
 * Common source keys for each value source.
 */
export const SOURCE_KEY_SUGGESTIONS: Record<string, string[]> = {
  APPLICATION: [
    'application_reference_no',
    'application_reference_number',
    'ssn',
    'first_name',
    'last_name',
    'full_name',
    'email',
    'phone',
    'status',
    'employer_name',
    'tax_id',
  ],
  MEETING: [
    'meeting_reference_no',
    'meeting_reference_number',
    'meeting_date',
    'meeting_time',
    'office_address',
    'remarks',
    'contact_person',
    'contact_person_name',
    'status',
  ],
  WORKFLOW: [
    'action_code',
    'instance_id',
    'step_id',
    'task_id',
    'source_module',
    'source_record_id',
    'user_remarks',
  ],
  SYSTEM: [
    'logged_in_user',
    'logged_in_username',
    'current_timestamp',
    'current_date',
    'current_time',
    'user_id',
  ],
  STATIC: [],
};

/**
 * Standard action codes.
 */
export const STANDARD_ACTION_CODES = [
  'Approve',
  'Reject',
  'ScheduleMeeting',
  'SendBack',
  'Query',
  'Review',
  'Forward',
] as const;
