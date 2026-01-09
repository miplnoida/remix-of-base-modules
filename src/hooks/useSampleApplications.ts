import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SampleApplication {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  applicant_comments: string | null;
  status: string;
  applicant_id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  workflow_instance_id: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all sample applications for the current user
export function useSampleApplications() {
  return useQuery({
    queryKey: ['sample-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sample_applications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SampleApplication[];
    },
  });
}

// Fetch single application
export function useSampleApplication(id: string | undefined) {
  return useQuery({
    queryKey: ['sample-application', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('sample_applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as SampleApplication;
    },
    enabled: !!id,
  });
}

// Create sample application
export function useCreateSampleApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { title: string; description: string; amount: number; applicant_comments?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');
      
      // Get user profile for name/email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.user.id)
        .single();
      
      const { data: application, error } = await supabase
        .from('sample_applications')
        .insert({
          title: data.title,
          description: data.description,
          amount: data.amount,
          applicant_comments: data.applicant_comments || null,
          applicant_id: user.user.id,
          applicant_name: profile?.full_name || user.user.email,
          applicant_email: profile?.email || user.user.email,
          status: 'Draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-applications'] });
      toast({ title: 'Success', description: 'Application saved as draft' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update sample application
export function useUpdateSampleApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; amount?: number; applicant_comments?: string }) => {
      const { data: application, error } = await supabase
        .from('sample_applications')
        .update({
          title: data.title,
          description: data.description,
          amount: data.amount,
          applicant_comments: data.applicant_comments,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return application;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sample-applications'] });
      queryClient.invalidateQueries({ queryKey: ['sample-application', variables.id] });
      toast({ title: 'Success', description: 'Application updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Submit sample application for approval
export function useSubmitSampleApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Get the application
      const { data: application, error: appError } = await supabase
        .from('sample_applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (appError) throw appError;
      
      // Update status to Submitted
      const { error: updateError } = await supabase
        .from('sample_applications')
        .update({ 
          status: 'Submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Find workflow trigger for sample_application + submit
      const { data: trigger } = await supabase
        .from('workflow_triggers')
        .select(`
          *,
          module:app_modules!inner(name)
        `)
        .eq('action_name', 'submit')
        .eq('is_active', true);
      
      // Find the sample_application trigger
      const sampleAppTrigger = trigger?.find(t => 
        (t.module as any)?.name === 'sample_application'
      );
      
      if (sampleAppTrigger) {
        // Get user info
        const { data: user } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.user?.id)
          .single();
        
        // Get workflow
        const { data: workflow } = await supabase
          .from('workflow_definitions')
          .select('*, steps:workflow_steps(*)')
          .eq('id', sampleAppTrigger.workflow_id)
          .single();
        
        if (workflow && workflow.steps && workflow.steps.length > 0) {
          // Create workflow instance
          const firstStep = workflow.steps.sort((a: any, b: any) => a.step_number - b.step_number)[0];
          const dueAt = new Date();
          dueAt.setHours(dueAt.getHours() + (workflow.default_sla_hours || 24));
          
          const { data: instance, error: instanceError } = await supabase
            .from('workflow_instances')
            .insert({
              workflow_id: workflow.id,
              workflow_name: workflow.name,
              source_module: 'sample_application',
              source_record_id: id,
              source_record_name: application.title,
              current_step_id: firstStep.id,
              status: 'InProgress',
              started_by: user.user?.id,
              started_by_name: profile?.full_name || user.user?.email,
              due_at: dueAt.toISOString(),
              metadata: {
                applicant_name: application.applicant_name,
                applicant_email: application.applicant_email,
                amount: application.amount
              }
            })
            .select()
            .single();
          
          if (instanceError) throw instanceError;
          
          // Link workflow instance to application
          await supabase
            .from('sample_applications')
            .update({ workflow_instance_id: instance.id })
            .eq('id', id);
          
          // Create first task
          const taskDueAt = new Date();
          taskDueAt.setHours(taskDueAt.getHours() + (firstStep.sla_hours || 24));
          
          await supabase
            .from('workflow_tasks')
            .insert({
              instance_id: instance.id,
              step_id: firstStep.id,
              step_name: firstStep.step_name,
              assigned_role: firstStep.assigned_role,
              assigned_designation: firstStep.assigned_designation,
              status: 'Pending',
              due_at: taskDueAt.toISOString(),
            });
          
          // Log workflow start
          await supabase
            .from('workflow_logs')
            .insert({
              instance_id: instance.id,
              step_id: firstStep.id,
              step_name: firstStep.step_name,
              user_id: user.user?.id,
              user_name: profile?.full_name || user.user?.email,
              action: 'Started',
              new_status: 'InProgress',
              comments: 'Application submitted for approval',
              metadata: { application_id: id }
            });
        }
      }
      
      return application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-workflow-tasks'] });
      toast({ title: 'Success', description: 'Application submitted for approval' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete sample application (only drafts)
export function useDeleteSampleApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sample_applications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-applications'] });
      toast({ title: 'Success', description: 'Application deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
