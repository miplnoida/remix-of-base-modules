import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

const WORKFLOW_ID = '8983e6e8-6df7-4a04-9d19-0a7e563bde2a';
const FIRST_STEP_ID = 'c6d8db29-3671-4857-b5bb-d99b48b7dbb6';
const FIRST_STEP_NAME = 'Approval Pending';

export interface CardMachineChangeRequest {
  id: string;
  batch_number: string;
  payment_id: number;
  payment_sequence_no: number;
  current_card_machine_id: string | null;
  requested_card_machine_id: string | null;
  workflow_instance_id: string | null;
  status: string;
  comment: string;
  skip_comment: string | null;
  requested_by: string;
  requested_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

/**
 * Fetch all change requests for a batch.
 */
export function useCardMachineChangeRequests(batchNumber: string | undefined) {
  return useQuery({
    queryKey: ['card-machine-change-requests', batchNumber],
    enabled: !!batchNumber,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_card_machine_change_requests')
        .select('*')
        .eq('batch_number', batchNumber!)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CardMachineChangeRequest[];
    },
  });
}

/**
 * Get the active (non-terminal) request for a specific payment line.
 */
export function getActiveRequest(
  requests: CardMachineChangeRequest[],
  paymentId: number,
  seqNo: number
): CardMachineChangeRequest | undefined {
  return requests.find(
    r =>
      r.payment_id === paymentId &&
      r.payment_sequence_no === seqNo &&
      ['Pending', 'InProgress', 'Approved'].includes(r.status)
  );
}

/**
 * Check if batch has any blocking requests (Pending or InProgress).
 */
export function hasBlockingRequests(requests: CardMachineChangeRequest[]): boolean {
  return requests.some(r => r.status === 'Pending' || r.status === 'InProgress');
}

/**
 * Get all approved-but-not-applied requests for the batch.
 */
export function getApprovedPendingRequests(requests: CardMachineChangeRequest[]): CardMachineChangeRequest[] {
  return requests.filter(r => r.status === 'Approved');
}

/**
 * Create a card machine change request and trigger workflow.
 */
export function useCreateCardMachineChangeRequest() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (params: {
      batchNumber: string;
      paymentId: number;
      paymentSequenceNo: number;
      currentCardMachineId: string | null;
      comment: string;
    }) => {
      if (!userCode) throw new Error('User code not available');
      if (!user?.id) throw new Error('Not authenticated');
      if (!params.comment.trim()) throw new Error('Comment is required');

      // 1. Insert the change request
      const { data: request, error: reqError } = await supabase
        .from('cn_card_machine_change_requests')
        .insert({
          batch_number: params.batchNumber,
          payment_id: params.paymentId,
          payment_sequence_no: params.paymentSequenceNo,
          current_card_machine_id: params.currentCardMachineId,
          status: 'Pending',
          comment: params.comment.trim(),
          requested_by: userCode,
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Create workflow instance
      const { data: instance, error: instError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_id: WORKFLOW_ID,
          workflow_name: 'Payment-Batch Changes Approval Workflow',
          source_module: 'batch_card_machine_change',
          source_record_id: request.id,
          source_record_name: `Batch ${params.batchNumber} - Payment ${params.paymentId}`,
          current_step_id: FIRST_STEP_ID,
          status: 'InProgress',
          started_by: user.id,
          started_by_name: userCode,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (instError) throw instError;

      // 3. Resolve approver before creating task
      let assignedTo: string | null = null;
      let assignedToName: string | null = null;

      const { data: stepConfig } = await supabase
        .from('workflow_steps')
        .select('approver_type')
        .eq('id', FIRST_STEP_ID)
        .single();

      if (stepConfig?.approver_type === 'reporting_manager' && user.id) {
        const { resolveReportingManagerForTask } = await import('@/services/resolveReportingManager');
        const resolved = await resolveReportingManagerForTask(
          user.id, instance.id, FIRST_STEP_ID, FIRST_STEP_NAME
        );
        if (resolved) {
          assignedTo = resolved.managerId;
          assignedToName = resolved.managerName;
        }
      }

      // 4. Create first workflow task
      const { error: taskError } = await supabase
        .from('workflow_tasks')
        .insert({
          instance_id: instance.id,
          step_id: FIRST_STEP_ID,
          step_name: FIRST_STEP_NAME,
          status: 'Pending',
          assigned_to: assignedTo,
          assigned_to_name: assignedToName,
          started_at: new Date().toISOString(),
        });

      if (taskError) throw taskError;

      // 4. Insert workflow log
      await supabase.from('workflow_logs').insert({
        instance_id: instance.id,
        step_id: FIRST_STEP_ID,
        step_name: FIRST_STEP_NAME,
        user_id: user.id,
        user_name: userCode,
        action: 'request_submitted',
        old_status: 'New',
        new_status: 'Pending',
        comments: params.comment.trim(),
      });

      // 5. Update request with workflow_instance_id and status to InProgress
      const { error: updError } = await supabase
        .from('cn_card_machine_change_requests')
        .update({
          workflow_instance_id: instance.id,
          status: 'InProgress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updError) throw updError;

      return { ...request, workflow_instance_id: instance.id, status: 'InProgress' };
    },
    onSuccess: (_, params) => {
      toast.success('Change request submitted', {
        description: 'Your card machine change request has been sent for approval.',
      });
      queryClient.invalidateQueries({ queryKey: ['card-machine-change-requests', params.batchNumber] });
    },
    onError: (err: any) => {
      toast.error('Failed to submit change request', {
        description: err.message || 'An error occurred.',
      });
    },
  });
}

/**
 * Apply an approved card machine change (one-time edit).
 */
export function useApplyCardMachineChange() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      paymentId: number;
      paymentSequenceNo: number;
      newCardMachineId: string;
      batchNumber: string;
    }) => {
      if (!userCode) throw new Error('User code not available');

      // Verify status is Approved and not completed
      const { data: req, error: fetchErr } = await supabase
        .from('cn_card_machine_change_requests')
        .select('status, completed_at, workflow_instance_id')
        .eq('id', params.requestId)
        .single();

      if (fetchErr) throw fetchErr;
      if (req.status !== 'Approved') throw new Error('Request is not in Approved status');
      if (req.completed_at) throw new Error('This change has already been applied');

      // Update cn_payment
      const { error: payErr } = await supabase
        .from('cn_payment')
        .update({ card_machine_id: params.newCardMachineId })
        .eq('payment_id', params.paymentId)
        .eq('payment_sequence_no', params.paymentSequenceNo);

      if (payErr) throw payErr;

      // Mark request as Completed
      const { error: updErr } = await supabase
        .from('cn_card_machine_change_requests')
        .update({
          status: 'Completed',
          requested_card_machine_id: params.newCardMachineId,
          completed_at: new Date().toISOString(),
          completed_by: userCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.requestId);

      if (updErr) throw updErr;

      // Close workflow instance
      if (req.workflow_instance_id) {
        await supabase
          .from('workflow_instances')
          .update({
            status: 'Completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', req.workflow_instance_id);

        // Log
        await supabase.from('workflow_logs').insert({
          instance_id: req.workflow_instance_id,
          step_id: FIRST_STEP_ID,
          step_name: FIRST_STEP_NAME,
          user_id: user?.id,
          user_name: userCode,
          action: 'change_applied',
          old_status: 'Approved',
          new_status: 'Completed',
          comments: `Card machine changed to ${params.newCardMachineId}`,
        });
      }
    },
    onSuccess: (_, params) => {
      toast.success('Card machine updated', {
        description: 'The approved card machine change has been applied.',
      });
      queryClient.invalidateQueries({ queryKey: ['card-machine-change-requests', params.batchNumber] });
    },
    onError: (err: any) => {
      toast.error('Failed to apply change', { description: err.message });
    },
  });
}

/**
 * Skip/disregard an approved change request with a mandatory comment.
 */
export function useSkipApprovedChange() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      batchNumber: string;
      skipComment: string;
    }) => {
      if (!userCode) throw new Error('User code not available');
      if (!params.skipComment.trim()) throw new Error('Skip comment is required');

      const { data: req, error: fetchErr } = await supabase
        .from('cn_card_machine_change_requests')
        .select('status, workflow_instance_id')
        .eq('id', params.requestId)
        .single();

      if (fetchErr) throw fetchErr;
      if (req.status !== 'Approved') throw new Error('Request is not in Approved status');

      // Mark as Cancelled
      const { error: updErr } = await supabase
        .from('cn_card_machine_change_requests')
        .update({
          status: 'Cancelled',
          skip_comment: params.skipComment.trim(),
          completed_at: new Date().toISOString(),
          completed_by: userCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.requestId);

      if (updErr) throw updErr;

      // Close workflow & log notification for approver
      if (req.workflow_instance_id) {
        await supabase
          .from('workflow_instances')
          .update({
            status: 'Completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', req.workflow_instance_id);

        await supabase.from('workflow_logs').insert({
          instance_id: req.workflow_instance_id,
          step_id: FIRST_STEP_ID,
          step_name: FIRST_STEP_NAME,
          user_id: user?.id,
          user_name: userCode,
          action: 'approval_skipped',
          old_status: 'Approved',
          new_status: 'Cancelled',
          comments: params.skipComment.trim(),
          metadata: { notification_type: 'approval_skipped', skipped_by: userCode },
        });

        // Notify via configurable notification engine (action_taken trigger for cancellation)
        supabase.functions.invoke('workflow-process-notifications', {
          body: {
            instance_id: req.workflow_instance_id,
            step_id: FIRST_STEP_ID,
            trigger: 'action_taken',
            action_label: 'Cancelled',
            action_by: userCode || 'System',
            comments: params.skipComment.trim(),
          },
        }).then(({ error }) => {
          if (error) console.error('Notification processing on skip failed (non-blocking):', error);
        });
      }
    },
    onSuccess: (_, params) => {
      toast.success('Approval skipped', {
        description: 'The approved change has been disregarded. Approver has been notified.',
      });
      queryClient.invalidateQueries({ queryKey: ['card-machine-change-requests', params.batchNumber] });
    },
    onError: (err: any) => {
      toast.error('Failed to skip approval', { description: err.message });
    },
  });
}

/**
 * Fetch change requests for the approver screen with filters.
 */
export function useCardMachineChangeRequestsForApprover(filters: {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  cashier?: string;
  batchNumber?: string;
}) {
  return useQuery({
    queryKey: ['card-machine-change-requests-approver', filters],
    staleTime: 15_000,
    queryFn: async () => {
      let query = supabase
        .from('cn_card_machine_change_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('requested_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('requested_at', filters.dateTo + 'T23:59:59.999Z');
      }
      if (filters.cashier) {
        query = query.ilike('requested_by', `%${filters.cashier}%`);
      }
      if (filters.batchNumber) {
        query = query.ilike('batch_number', `%${filters.batchNumber}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CardMachineChangeRequest[];
    },
  });
}
