import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BnParticipantTaskConfigRow {
  id: string;
  product_version_id: string;
  participant_kind: 'CLAIMANT' | 'EMPLOYER' | 'DOCTOR' | 'OTHER';
  task_code: string;
  task_title: string;
  task_description: string | null;
  screen_template_code: string | null;
  due_offset_days: number;
  blocks_workflow: boolean;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

export type BnParticipantTaskConfigInput =
  Omit<BnParticipantTaskConfigRow, 'id'> & { id?: string };

export function useBnParticipantTaskConfig(versionId: string | undefined) {
  return useQuery({
    queryKey: ['bn_participant_task_config', versionId],
    enabled: !!versionId,
    queryFn: async (): Promise<BnParticipantTaskConfigRow[]> => {
      const { data, error } = await (supabase as any)
        .from('bn_product_participant_task_config')
        .select('id, product_version_id, participant_kind, task_code, task_title, task_description, screen_template_code, due_offset_days, blocks_workflow, is_required, sort_order, is_active')
        .eq('product_version_id', versionId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BnParticipantTaskConfigRow[];
    },
  });
}

export function useUpsertParticipantTaskConfig(versionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn_participant_task_config', 'upsert', versionId],
    mutationFn: async (row: BnParticipantTaskConfigInput) => {
      const payload = { ...row, product_version_id: versionId } as any;
      const { error } = await (supabase as any)
        .from('bn_product_participant_task_config')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn_participant_task_config', versionId] }),
  });
}

export function useDeleteParticipantTaskConfig(versionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn_participant_task_config', 'delete', versionId],
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('bn_product_participant_task_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn_participant_task_config', versionId] }),
  });
}
