import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserCode } from '@/hooks/useUserCode';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { toast } from 'sonner';

const CANCEL_WORKFLOW_ID = '65f82f25-e422-438e-8c12-005a23d81d62';
const CANCEL_STEP_ID = 'a072b471-3d03-4bab-86fa-bd45480a78d1';
const CANCEL_STEP_NAME = 'Approval Pending';

export interface ReceiptCancelRequest {
  id: string;
  batch_number: string;
  payment_id: number;
  receipt_id: number;
  receipt_total: number | null;
  workflow_instance_id: string | null;
  status: string;
  reason: string;
  request_type: string;
  requested_by: string;
  requested_at: string;
  completed_at: string | null;
  completed_by: string | null;
  skip_comment: string | null;
}

/**
 * Fetch all cancel requests for a batch.
 */
export function useReceiptCancelRequests(batchNumber: string | undefined) {
  return useQuery({
    queryKey: ['receipt-cancel-requests', batchNumber],
    enabled: !!batchNumber,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_receipt_cancel_requests')
        .select('*')
        .eq('batch_number', batchNumber!)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ReceiptCancelRequest[];
    },
  });
}

/**
 * Fetch active cancel request for a specific payment.
 */
export function useReceiptCancelRequestByPayment(paymentId: number | null) {
  return useQuery({
    queryKey: ['receipt-cancel-request-by-payment', paymentId],
    enabled: !!paymentId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cn_receipt_cancel_requests')
        .select('*')
        .eq('payment_id', paymentId!)
        .in('status', ['Pending', 'InProgress', 'Approved'])
        .order('requested_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data && data.length > 0 ? data[0] : null) as ReceiptCancelRequest | null;
    },
  });
}

/**
 * Get the active (non-terminal) cancel request for a specific payment.
 */
export function getActiveCancelRequest(
  requests: ReceiptCancelRequest[],
  paymentId: number
): ReceiptCancelRequest | undefined {
  return requests.find(
    r => r.payment_id === paymentId && ['Pending', 'InProgress', 'Approved'].includes(r.status)
  );
}

/**
 * Create a receipt cancel request and trigger the approval workflow.
 */
export function useCreateReceiptCancelRequest() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (params: {
      batchNumber: string;
      paymentId: number;
      receiptId: number;
      receiptTotal: number | null;
      reason: string;
    }) => {
      if (!userCode) throw new Error('User code not available');
      if (!user?.id) throw new Error('Not authenticated');
      if (!params.reason.trim()) throw new Error('Cancellation reason is required');

      // 1. Insert the cancel request
      const { data: request, error: reqError } = await supabase
        .from('cn_receipt_cancel_requests')
        .insert({
          batch_number: params.batchNumber,
          payment_id: params.paymentId,
          receipt_id: params.receiptId,
          receipt_total: params.receiptTotal,
          status: 'Pending',
          reason: params.reason.trim(),
          request_type: 'cancel_receipt',
          requested_by: userCode,
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Create workflow instance
      const { data: instance, error: instError } = await supabase
        .from('workflow_instances')
        .insert({
          workflow_id: CANCEL_WORKFLOW_ID,
          workflow_name: 'Approval to Cancel Payment-Receipt Workflow',
          source_module: 'receipt_cancellation',
          source_record_id: request.id,
          source_record_name: `Batch ${params.batchNumber} - Receipt ${params.receiptId}`,
          current_step_id: CANCEL_STEP_ID,
          status: 'InProgress',
          started_by: user.id,
          started_by_name: userCode,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (instError) throw instError;

      // 3. Resolve approver
      let assignedTo: string | null = null;
      let assignedToName: string | null = null;

      const { data: stepConfig } = await supabase
        .from('workflow_steps')
        .select('approver_type')
        .eq('id', CANCEL_STEP_ID)
        .single();

      if (stepConfig?.approver_type === 'reporting_manager' && user.id) {
        const { resolveReportingManagerForTask } = await import('@/services/resolveReportingManager');
        const resolved = await resolveReportingManagerForTask(
          user.id, instance.id, CANCEL_STEP_ID, CANCEL_STEP_NAME
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
          step_id: CANCEL_STEP_ID,
          step_name: CANCEL_STEP_NAME,
          status: 'Pending',
          assigned_to: assignedTo,
          assigned_to_name: assignedToName,
          started_at: new Date().toISOString(),
        });

      if (taskError) throw taskError;

      // 5. Insert workflow log
      await supabase.from('workflow_logs').insert({
        instance_id: instance.id,
        step_id: CANCEL_STEP_ID,
        step_name: CANCEL_STEP_NAME,
        user_id: user.id,
        user_name: userCode,
        action: 'request_submitted',
        old_status: 'New',
        new_status: 'Pending',
        comments: params.reason.trim(),
      });

      // 6. Update request with workflow_instance_id and status
      const { error: updError } = await supabase
        .from('cn_receipt_cancel_requests')
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
      toast.success('Cancellation request submitted', {
        description: 'Your receipt cancellation request has been sent for approval.',
      });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-requests', params.batchNumber] });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-request-by-payment', params.paymentId] });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-requests-approver'] });
    },
    onError: (err: any) => {
      toast.error('Failed to submit cancellation request', {
        description: err.message || 'An error occurred.',
      });
    },
  });
}

/**
 * Apply an approved receipt cancellation.
 */
export function useApplyReceiptCancellation() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      receiptId: number;
      paymentId: number;
      batchNumber: string;
      reason: string;
    }) => {
      if (!userCode) throw new Error('User code not available');

      // Verify status is Approved
      const { data: req, error: fetchErr } = await supabase
        .from('cn_receipt_cancel_requests')
        .select('status, completed_at, workflow_instance_id')
        .eq('id', params.requestId)
        .single();

      if (fetchErr) throw fetchErr;
      if (req.status !== 'Approved') throw new Error('Request is not in Approved status');
      if (req.completed_at) throw new Error('This cancellation has already been applied');

      // Update cn_receipt
      const { error: rcptErr } = await supabase
        .from('cn_receipt')
        .update({
          status: 'C',
          cancel_reason: params.reason,
          cancel_date: new Date().toISOString(),
          cancel_user: userCode,
          updated_by: userCode,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('receipt_id', params.receiptId);

      if (rcptErr) throw rcptErr;

      // Mark request as Completed
      const { error: updErr } = await supabase
        .from('cn_receipt_cancel_requests')
        .update({
          status: 'Completed',
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

        await supabase.from('workflow_logs').insert({
          instance_id: req.workflow_instance_id,
          step_id: CANCEL_STEP_ID,
          step_name: CANCEL_STEP_NAME,
          user_id: user?.id,
          user_name: userCode,
          action: 'cancellation_applied',
          old_status: 'Approved',
          new_status: 'Completed',
          comments: `Receipt ${params.receiptId} cancelled`,
        });
      }
    },
    onSuccess: (_, params) => {
      toast.success('Receipt cancelled', {
        description: 'The approved cancellation has been applied.',
      });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-requests', params.batchNumber] });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-request-by-payment', params.paymentId] });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-requests-approver'] });
    },
    onError: (err: any) => {
      toast.error('Failed to apply cancellation', { description: err.message });
    },
  });
}

/**
 * Skip/disregard an approved cancel request.
 */
export function useSkipReceiptCancellation() {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { user } = useSupabaseAuth();

  return useMutation({
    mutationFn: async (params: {
      requestId: string;
      batchNumber: string;
      paymentId: number;
      skipComment: string;
    }) => {
      if (!userCode) throw new Error('User code not available');
      if (!params.skipComment.trim()) throw new Error('Skip comment is required');

      const { data: req, error: fetchErr } = await supabase
        .from('cn_receipt_cancel_requests')
        .select('status, workflow_instance_id')
        .eq('id', params.requestId)
        .single();

      if (fetchErr) throw fetchErr;
      if (req.status !== 'Approved') throw new Error('Request is not in Approved status');

      const { error: updErr } = await supabase
        .from('cn_receipt_cancel_requests')
        .update({
          status: 'Cancelled',
          skip_comment: params.skipComment.trim(),
          completed_at: new Date().toISOString(),
          completed_by: userCode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.requestId);

      if (updErr) throw updErr;

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
          step_id: CANCEL_STEP_ID,
          step_name: CANCEL_STEP_NAME,
          user_id: user?.id,
          user_name: userCode,
          action: 'approval_skipped',
          old_status: 'Approved',
          new_status: 'Cancelled',
          comments: params.skipComment.trim(),
          metadata: { notification_type: 'approval_skipped', skipped_by: userCode },
        });
      }
    },
    onSuccess: (_, params) => {
      toast.success('Cancellation skipped', {
        description: 'The approved cancellation has been disregarded.',
      });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-requests', params.batchNumber] });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-request-by-payment', params.paymentId] });
      queryClient.invalidateQueries({ queryKey: ['receipt-cancel-requests-approver'] });
    },
    onError: (err: any) => {
      toast.error('Failed to skip cancellation', { description: err.message });
    },
  });
}

/**
 * Fetch cancel requests for the approver screen with filters.
 */
export function useReceiptCancelRequestsForApprover(filters: {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  cashier?: string;
  batchNumber?: string;
}) {
  return useQuery({
    queryKey: ['receipt-cancel-requests-approver', filters],
    staleTime: 15_000,
    queryFn: async () => {
      let query = supabase
        .from('cn_receipt_cancel_requests')
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
      return (data || []) as ReceiptCancelRequest[];
    },
  });
}
