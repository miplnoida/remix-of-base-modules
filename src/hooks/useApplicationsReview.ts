import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';

export type NextStepType = 'next_step' | 'specific_step' | 'end_workflow' | 'send_back_to_applicant';
export type EndState = 'Approved' | 'Rejected' | null;

export interface ApplicationForReview {
  id: string;
  instance_id: string;
  step_id: string;
  step_name: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_role: string | null;
  assigned_designation: string | null;
  status: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  action_taken: string | null;
  comments: string | null;
  created_at: string;
  workflow_instance: {
    id: string;
    workflow_id: string;
    workflow_name: string;
    source_module: string | null;
    source_record_id: string | null;
    source_record_name: string | null;
    current_step_id: string | null;
    status: string;
    started_by: string | null;
    started_by_name: string | null;
    started_at: string;
    completed_at: string | null;
    due_at: string | null;
    metadata: Record<string, any>;
  };
  step_actions: Array<{
    id: string;
    step_id: string;
    action_name: string;
    action_type: string;
    next_step_id: string | null;
    next_step_type: NextStepType;
    end_state: EndState;
    is_final_action: boolean;
    display_order: number;
  }>;
}

export interface ReviewFilters {
  search?: string;
  stepName?: string;
  status?: string;
}

// Fetch applications for review with dynamic step actions
export function useApplicationsForReview(filters: ReviewFilters = {}) {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ['applications-for-review', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get user's roles and designation
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const roles: string[] = userRoles?.map(r => r.role) || [];
      const designation = (profile as any)?.designation;
      
      // Fetch pending/in-progress tasks
      let query = supabase
        .from('workflow_tasks')
        .select(`
          *,
          workflow_instance:workflow_instances(*)
        `)
        .in('status', ['Pending', 'InProgress'])
        .order('created_at', { ascending: false });
      
      const { data: tasks, error } = await query;
      
      if (error) throw error;
      
      // Filter tasks based on role/designation eligibility
      const eligibleTasks = (tasks || []).filter(task => {
        // If task is assigned to a specific user
        if (task.assigned_to === user.id) return true;
        
        // If task has assigned role and user has that role
        if (task.assigned_role && roles.includes(task.assigned_role)) return true;
        
        // If task has assigned designation and user has that designation
        if (task.assigned_designation && designation === task.assigned_designation) return true;
        
        // If no specific assignment, allow anyone (fallback)
        if (!task.assigned_to && !task.assigned_role && !task.assigned_designation) return true;
        
        return false;
      });
      
      // Fetch step actions for each task
      const tasksWithActions: ApplicationForReview[] = await Promise.all(
        eligibleTasks.map(async (task) => {
          const { data: actions } = await supabase
            .from('workflow_step_actions')
            .select('*')
            .eq('step_id', task.step_id)
            .order('display_order', { ascending: true });
          
          return {
            ...task,
            step_actions: actions || [],
          } as ApplicationForReview;
        })
      );
      
      // Apply filters
      let filtered = tasksWithActions;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(t => 
          t.workflow_instance?.source_record_name?.toLowerCase().includes(searchLower) ||
          t.workflow_instance?.workflow_name?.toLowerCase().includes(searchLower) ||
          t.step_name?.toLowerCase().includes(searchLower)
        );
      }
      
      if (filters.stepName) {
        filtered = filtered.filter(t => t.step_name === filters.stepName);
      }
      
      if (filters.status) {
        filtered = filtered.filter(t => t.status === filters.status);
      }
      
      return filtered;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

// Get unique step names for filter dropdown
export function useReviewStepNames() {
  return useQuery({
    queryKey: ['review-step-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select('step_name')
        .in('status', ['Pending', 'InProgress']);
      
      if (error) throw error;
      
      const uniqueNames = [...new Set((data || []).map(t => t.step_name))];
      return uniqueNames.filter(Boolean) as string[];
    },
  });
}

// Process a review action
export function useProcessReviewAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      actionId,
      actionName,
      actionType,
      nextStepType,
      nextStepId,
      endState,
      isFinalAction,
      comments 
    }: { 
      taskId: string;
      actionId: string;
      actionName: string;
      actionType: string;
      nextStepType: NextStepType;
      nextStepId: string | null;
      endState: EndState;
      isFinalAction: boolean;
      comments?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user?.id)
        .single();
      
      // Get the task with instance
      const { data: task, error: taskError } = await supabase
        .from('workflow_tasks')
        .select('*, workflow_instance:workflow_instances(*)')
        .eq('id', taskId)
        .single();
      
      if (taskError) throw taskError;
      
      // Update task as completed
      const { error: updateError } = await supabase
        .from('workflow_tasks')
        .update({
          status: 'Completed',
          action_taken: actionName,
          comments,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);
      
      if (updateError) throw updateError;
      
      // Log the action
      await supabase
        .from('workflow_logs')
        .insert({
          instance_id: task.instance_id,
          step_id: task.step_id,
          step_name: task.step_name,
          user_id: user.user?.id,
          user_name: profile?.full_name,
          action: actionName,
          old_status: task.status,
          new_status: 'Completed',
          comments,
          metadata: { action_id: actionId, action_type: actionType, next_step_type: nextStepType },
        });
      
      // Handle workflow progression based on next_step_type
      const handleNextStep = async () => {
        switch (nextStepType) {
          case 'specific_step':
            // Navigate to specific step
            if (nextStepId) {
              const { data: nextStep } = await supabase
                .from('workflow_steps')
                .select('*')
                .eq('id', nextStepId)
                .single();
              
              if (nextStep) {
                await supabase
                  .from('workflow_tasks')
                  .insert({
                    instance_id: task.instance_id,
                    step_id: nextStep.id,
                    step_name: nextStep.step_name,
                    assigned_role: nextStep.assigned_role,
                    assigned_designation: nextStep.assigned_designation,
                    status: 'Pending',
                    due_at: new Date(Date.now() + (nextStep.sla_hours || 24) * 60 * 60 * 1000).toISOString(),
                  });
                
                await supabase
                  .from('workflow_instances')
                  .update({ current_step_id: nextStep.id })
                  .eq('id', task.instance_id);
              }
            }
            break;
            
          case 'next_step':
            // Find and navigate to next step by step number
            const { data: currentStep } = await supabase
              .from('workflow_steps')
              .select('*')
              .eq('id', task.step_id)
              .single();
            
            if (currentStep && !currentStep.is_final_step) {
              const { data: nextStep } = await supabase
                .from('workflow_steps')
                .select('*')
                .eq('workflow_id', task.workflow_instance.workflow_id)
                .eq('step_number', currentStep.step_number + 1)
                .single();
              
              if (nextStep) {
                await supabase
                  .from('workflow_tasks')
                  .insert({
                    instance_id: task.instance_id,
                    step_id: nextStep.id,
                    step_name: nextStep.step_name,
                    assigned_role: nextStep.assigned_role,
                    assigned_designation: nextStep.assigned_designation,
                    status: 'Pending',
                    due_at: new Date(Date.now() + (nextStep.sla_hours || 24) * 60 * 60 * 1000).toISOString(),
                  });
                
                await supabase
                  .from('workflow_instances')
                  .update({ current_step_id: nextStep.id })
                  .eq('id', task.instance_id);
              } else {
                // No next step found - complete workflow
                await supabase
                  .from('workflow_instances')
                  .update({
                    status: 'Completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', task.instance_id);
              }
            }
            break;
            
          case 'end_workflow':
            // Complete the workflow with specified end state
            const finalStatus = endState === 'Rejected' ? 'Rejected' : 'Completed';
            await supabase
              .from('workflow_instances')
              .update({
                status: finalStatus,
                completed_at: new Date().toISOString(),
              })
              .eq('id', task.instance_id);
            
            // Update source application status if applicable
            if (task.workflow_instance?.source_module === 'sample_application' && task.workflow_instance?.source_record_id) {
              await supabase
                .from('sample_applications')
                .update({ status: endState || 'Approved' })
                .eq('id', task.workflow_instance.source_record_id);
            }
            break;
            
          case 'send_back_to_applicant':
            // Send back to applicant - set workflow to Pending and update source record
            await supabase
              .from('workflow_instances')
              .update({ status: 'Pending' })
              .eq('id', task.instance_id);
            
            // Update source application status
            if (task.workflow_instance?.source_module === 'sample_application' && task.workflow_instance?.source_record_id) {
              await supabase
                .from('sample_applications')
                .update({ status: 'More Info Requested' })
                .eq('id', task.workflow_instance.source_record_id);
            }
            break;
        }
      };
      
      // Handle based on action type for backwards compatibility with legacy data
      if (actionType.toLowerCase() === 'reject' && nextStepType !== 'end_workflow') {
        // Legacy reject behavior - end workflow with rejection
        await supabase
          .from('workflow_instances')
          .update({
            status: 'Rejected',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.instance_id);
        
        if (task.workflow_instance?.source_module === 'sample_application' && task.workflow_instance?.source_record_id) {
          await supabase
            .from('sample_applications')
            .update({ status: 'Rejected' })
            .eq('id', task.workflow_instance.source_record_id);
        }
      } else if (isFinalAction) {
        // Handle final action
        await supabase
          .from('workflow_instances')
          .update({
            status: endState === 'Rejected' ? 'Rejected' : 'Completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.instance_id);
        
        if (task.workflow_instance?.source_module === 'sample_application' && task.workflow_instance?.source_record_id) {
          await supabase
            .from('sample_applications')
            .update({ status: endState || 'Approved' })
            .eq('id', task.workflow_instance.source_record_id);
        }
      } else {
        // Use the next step type routing
        await handleNextStep();
      }
      
      // Trigger notifications
      const { data: notifications } = await supabase
        .from('workflow_action_notifications')
        .select('*')
        .eq('action_id', actionId);
      
      // Process and log each notification
      if (notifications && notifications.length > 0) {
        for (const notification of notifications) {
          try {
            // Fetch the notification template
            const { data: template } = await supabase
              .from('notification_templates')
              .select('*')
              .eq('id', notification.template_id)
              .single();
            
            if (template) {
              // Get applicant/recipient information from the source record
              let recipientEmail = '';
              let recipientUserId: string | null = null;
              let mergeData: Record<string, string> = {
                application_title: task.workflow_instance?.source_record_name || 'Application',
                reviewer_name: profile?.full_name || 'Reviewer',
                comments: comments || '',
              };
              
              // Get applicant info from sample_applications if available
              if (task.workflow_instance?.source_module === 'sample_application' && task.workflow_instance?.source_record_id) {
                const { data: application } = await supabase
                  .from('sample_applications')
                  .select('applicant_name, applicant_email, title')
                  .eq('id', task.workflow_instance.source_record_id)
                  .single();
                
                if (application) {
                  recipientEmail = application.applicant_email || '';
                  mergeData.applicant_name = application.applicant_name || 'Applicant';
                  mergeData.application_title = application.title || mergeData.application_title;
                }
              }
              
              // If no applicant email, try to get from workflow starter
              if (!recipientEmail && task.workflow_instance?.started_by) {
                const { data: starterProfile } = await supabase
                  .from('profiles')
                  .select('email, full_name')
                  .eq('id', task.workflow_instance.started_by)
                  .single();
                
                if (starterProfile) {
                  recipientEmail = starterProfile.email || '';
                  recipientUserId = task.workflow_instance.started_by;
                  mergeData.applicant_name = starterProfile.full_name || mergeData.applicant_name;
                }
              }
              
              // Substitute placeholders in subject and body
              let subject = template.subject || '';
              let body = template.body || '';
              
              Object.entries(mergeData).forEach(([key, value]) => {
                const placeholder = `{{${key}}}`;
                subject = subject.replace(new RegExp(placeholder, 'g'), value);
                body = body.replace(new RegExp(placeholder, 'g'), value);
              });
              
              // Add rejection reason placeholder if applicable
              if (endState === 'Rejected' || actionType.toLowerCase() === 'reject') {
                const rejectionReason = comments || 'No reason provided';
                subject = subject.replace(/{{rejection_reason}}/g, rejectionReason);
                body = body.replace(/{{rejection_reason}}/g, rejectionReason);
              }
              
              // Log the notification
              // Map notification type to valid channel enum
              const channelMap: Record<string, 'email' | 'sms' | 'push' | 'in_app'> = {
                'email': 'email',
                'sms': 'sms',
                'push': 'push',
                'in_app': 'in_app',
                'in-app': 'in_app',
              };
              const channel = channelMap[(notification.notification_type?.toLowerCase() || 'email')] || 'email';
              
              await supabase
                .from('notification_logs')
                .insert({
                  template_id: template.id,
                  channel,
                  recipient_user_id: recipientUserId,
                  recipient_address: recipientEmail || 'no-email@system.local',
                  subject,
                  title: template.title || template.name,
                  body,
                  status: 'queued' as const,
                  triggered_by: user.user?.id,
                  trigger_source: `workflow_action:${actionId}`,
                  metadata: {
                    workflow_id: task.workflow_instance?.workflow_id,
                    workflow_name: task.workflow_instance?.workflow_name,
                    instance_id: task.instance_id,
                    step_id: task.step_id,
                    step_name: task.step_name,
                    action_name: actionName,
                    action_type: actionType,
                  },
                });
              
              console.log('[Notification] Logged notification:', template.name, 'to:', recipientEmail);
            }
          } catch (notifError) {
            console.error('[Notification] Error processing notification:', notifError);
            // Don't throw - notifications shouldn't block workflow
          }
        }
      }
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['sample-applications'] });
      toast({ title: 'Success', description: 'Action completed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
