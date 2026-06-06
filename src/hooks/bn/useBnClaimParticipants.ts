import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BnClaimParticipantRow {
  id: string;
  claim_id: string;
  kind: 'CLAIMANT' | 'EMPLOYER' | 'DOCTOR' | 'OTHER';
  display_name: string | null;
  ssn: string | null;
  employer_regno: string | null;
  provider_code: string | null;
  email: string | null;
  phone: string | null;
  status: 'INVITED' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  invite_sent_at: string | null;
  created_at: string;
}

export interface BnExternalTaskRow {
  id: string;
  claim_id: string;
  participant_id: string | null;
  participant_kind: string;
  task_type: string;
  task_title: string;
  task_description: string | null;
  status: 'PENDING' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  due_at: string | null;
  blocks_workflow: boolean;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  payload: Record<string, any>;
  decision_notes: string | null;
}

export function useBnClaimParticipants(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn_claim_participants', claimId],
    enabled: !!claimId,
    queryFn: async (): Promise<BnClaimParticipantRow[]> => {
      const { data, error } = await (supabase as any)
        .from('bn_claim_participant')
        .select('id, claim_id, kind, display_name, ssn, employer_regno, provider_code, email, phone, status, invite_sent_at, created_at')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BnClaimParticipantRow[];
    },
  });
}

export function useBnClaimExternalTasks(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn_external_tasks', claimId],
    enabled: !!claimId,
    queryFn: async (): Promise<BnExternalTaskRow[]> => {
      const { data, error } = await (supabase as any)
        .from('bn_external_task')
        .select('id, claim_id, participant_id, participant_kind, task_type, task_title, task_description, status, due_at, blocks_workflow, submitted_at, submitted_by, reviewed_at, reviewed_by, payload, decision_notes')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BnExternalTaskRow[];
    },
  });
}

type Decision = 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'CANCELLED';

export function useUpdateExternalTaskDecision(claimId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn_external_task', 'decision', claimId],
    mutationFn: async (args: { taskId: string; decision: Decision; notes?: string; userCode?: string }) => {
      const patch: Record<string, any> = {
        status: args.decision,
        decision_notes: args.notes ?? null,
        updated_at: new Date().toISOString(),
      };
      if (args.decision === 'ACCEPTED' || args.decision === 'REJECTED') {
        patch.reviewed_at = new Date().toISOString();
        patch.reviewed_by = args.userCode ?? null;
      }
      if (args.decision === 'PENDING') {
        // reopen: clear review markers and submission so external user can resubmit
        patch.reviewed_at = null;
        patch.reviewed_by = null;
        patch.submitted_at = null;
      }
      const { error } = await (supabase as any)
        .from('bn_external_task')
        .update(patch)
        .eq('id', args.taskId);
      if (error) throw error;

      // Append per-task audit row (best-effort)
      try {
        await (supabase as any).from('bn_external_task_audit').insert({
          task_id: args.taskId,
          event_type: `INTERNAL_${args.decision}`,
          actor: args.userCode ?? 'SYSTEM',
          notes: args.notes ?? null,
        });
      } catch { /* non-blocking */ }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn_external_tasks', claimId] });
    },
  });
}

export function useResendParticipantInvite(claimId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn_claim_participant', 'resend_invite', claimId],
    mutationFn: async (args: { participantId: string }) => {
      const { error } = await (supabase as any)
        .from('bn_claim_participant')
        .update({
          status: 'INVITED',
          invite_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', args.participantId);
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn_claim_participants', claimId] });
    },
  });
}

export function useMaterializeExternalTasks(claimId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn_external_tasks', 'materialize', claimId],
    mutationFn: async () => {
      if (!claimId) throw new Error('claimId required');
      const { data, error } = await (supabase as any).rpc('bn_materialize_external_tasks', { p_claim_id: claimId });
      if (error) throw error;
      return { inserted: (data as number) ?? 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn_external_tasks', claimId] });
    },
  });
}
