import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface WorkflowActionFieldUpdate {
  id: string;
  action_id: string;
  field_name: string;
  field_value: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Fetch field updates for a specific action
export function useActionFieldUpdates(actionId: string | null) {
  return useQuery({
    queryKey: ['workflow-action-field-updates', actionId],
    queryFn: async () => {
      if (!actionId) return [];
      
      const { data, error } = await supabase
        .from('workflow_action_field_updates')
        .select('*')
        .eq('action_id', actionId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as WorkflowActionFieldUpdate[];
    },
    enabled: !!actionId,
  });
}

// Fetch field updates for multiple actions at once
export function useMultipleActionFieldUpdates(actionIds: string[]) {
  return useQuery({
    queryKey: ['workflow-action-field-updates-multi', actionIds],
    queryFn: async () => {
      if (!actionIds.length) return {};
      
      const { data, error } = await supabase
        .from('workflow_action_field_updates')
        .select('*')
        .in('action_id', actionIds)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      
      // Group by action_id
      const grouped: Record<string, WorkflowActionFieldUpdate[]> = {};
      (data || []).forEach((update: WorkflowActionFieldUpdate) => {
        if (!grouped[update.action_id]) {
          grouped[update.action_id] = [];
        }
        grouped[update.action_id].push(update);
      });
      
      return grouped;
    },
    enabled: actionIds.length > 0,
  });
}

// Save field updates for an action (replaces all existing)
export function useSaveActionFieldUpdates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      actionId, 
      fieldUpdates 
    }: { 
      actionId: string; 
      fieldUpdates: Array<{ field_name: string; field_value: string; display_order: number }> 
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Delete existing field updates for this action
      const { error: deleteError } = await supabase
        .from('workflow_action_field_updates')
        .delete()
        .eq('action_id', actionId);
      
      if (deleteError) throw deleteError;
      
      // Insert new field updates
      if (fieldUpdates.length > 0) {
        const { error: insertError } = await supabase
          .from('workflow_action_field_updates')
          .insert(
            fieldUpdates.map((update, index) => ({
              action_id: actionId,
              field_name: update.field_name,
              field_value: update.field_value,
              display_order: index,
              created_by: user.user?.id,
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-action-field-updates', variables.actionId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-action-field-updates-multi'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Execute field updates for an action (called during workflow task processing)
export async function executeFieldUpdates({
  actionId,
  targetTable,
  targetRecordId,
  context,
}: {
  actionId: string;
  targetTable: string;
  targetRecordId: string;
  context: {
    currentUserId: string;
    currentUserName: string;
    workflowStatus: string;
    actionName: string;
    stepName: string;
  };
}): Promise<{ 
  success: boolean; 
  updatedFields: Array<{ field_name: string; old_value: any; new_value: any }>;
  error?: string;
}> {
  try {
    // Fetch field updates for the action
    const { data: fieldUpdates, error: fetchError } = await supabase
      .from('workflow_action_field_updates')
      .select('*')
      .eq('action_id', actionId)
      .order('display_order', { ascending: true });
    
    if (fetchError) throw fetchError;
    
    if (!fieldUpdates || fieldUpdates.length === 0) {
      return { success: true, updatedFields: [] };
    }
    
    // Fetch current record to get old values for logging
    const { data: currentRecord, error: recordError } = await supabase
      .from(targetTable as any)
      .select('*')
      .eq('id', targetRecordId)
      .single();
    
    if (recordError) throw recordError;
    
    // Resolve placeholders and build update object
    const updateObject: Record<string, any> = {};
    const updatedFields: Array<{ field_name: string; old_value: any; new_value: any }> = [];
    
    for (const fieldUpdate of fieldUpdates) {
      const resolvedValue = resolvePlaceholders(fieldUpdate.field_value, context);
      updateObject[fieldUpdate.field_name] = resolvedValue;
      updatedFields.push({
        field_name: fieldUpdate.field_name,
        old_value: currentRecord[fieldUpdate.field_name],
        new_value: resolvedValue,
      });
    }
    
    // Apply the update
    const { error: updateError } = await supabase
      .from(targetTable as any)
      .update(updateObject)
      .eq('id', targetRecordId);
    
    if (updateError) throw updateError;
    
    return { success: true, updatedFields };
  } catch (error: any) {
    return { 
      success: false, 
      updatedFields: [], 
      error: error.message || 'Failed to execute field updates' 
    };
  }
}

// Helper function to resolve placeholders in field values
function resolvePlaceholders(
  value: string, 
  context: {
    currentUserId: string;
    currentUserName: string;
    workflowStatus: string;
    actionName: string;
    stepName: string;
  }
): string {
  const now = new Date();
  
  let resolved = value;
  resolved = resolved.replace(/\{\{current_user\}\}/g, context.currentUserId);
  resolved = resolved.replace(/\{\{current_user_name\}\}/g, context.currentUserName);
  resolved = resolved.replace(/\{\{current_date\}\}/g, now.toISOString().split('T')[0]);
  resolved = resolved.replace(/\{\{current_datetime\}\}/g, now.toISOString());
  resolved = resolved.replace(/\{\{workflow_status\}\}/g, context.workflowStatus);
  resolved = resolved.replace(/\{\{action_name\}\}/g, context.actionName);
  resolved = resolved.replace(/\{\{step_name\}\}/g, context.stepName);
  
  return resolved;
}

// Validate field names against table columns
// Note: This is a simplified version that returns common columns
// In production, you would fetch actual columns from the database schema
export function useValidateFieldNames(tableName: string | null) {
  return useQuery({
    queryKey: ['table-columns', tableName],
    queryFn: async () => {
      if (!tableName) return [];
      
      // Common columns that exist in most application tables
      // In production, this would query information_schema
      const commonColumns = [
        'id', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by',
        'comments', 'notes', 'remarks', 'approved_at', 'approved_by',
        'rejected_at', 'rejected_by', 'reviewed_at', 'reviewed_by',
        'workflow_status', 'application_status', 'is_active', 'is_approved',
        'submission_status', 'verification_status', 'processing_status'
      ];
      
      return commonColumns;
    },
    enabled: !!tableName,
  });
}
