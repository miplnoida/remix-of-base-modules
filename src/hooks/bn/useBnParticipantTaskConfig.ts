import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { auditConfigChange } from '@/services/bn/audit/bnAuditService';
import { getCurrentUserCode } from '@/services/bn/audit/getCurrentUserCode';

const safeAudit = async (i: Parameters<typeof auditConfigChange>[0]) => {
  try {
    const performedBy = i.performedBy || (await getCurrentUserCode()) || 'SYSTEM';
    await auditConfigChange({ ...i, performedBy });
  } catch (e) {
    console.warn('[useBnParticipantTaskConfig] audit failed:', e);
  }
};


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
      let before: any = null;
      if (row.id) {
        const { data } = await (supabase as any)
          .from('bn_product_participant_task_config')
          .select('*').eq('id', row.id).maybeSingle();
        before = data ?? null;
      }
      const { data, error } = await (supabase as any)
        .from('bn_product_participant_task_config')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      await safeAudit({
        entityType: 'bn_product_participant_task_config',
        entityId: (data as any)?.id ?? row.id ?? null,
        action: row.id ? 'UPDATE' : 'CREATE',
        performedBy: '',
        beforeValue: before,
        afterValue: data,
      });
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
      const { data: before } = await (supabase as any)
        .from('bn_product_participant_task_config')
        .select('*').eq('id', id).maybeSingle();
      const { error } = await (supabase as any)
        .from('bn_product_participant_task_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await safeAudit({
        entityType: 'bn_product_participant_task_config',
        entityId: id,
        action: 'DELETE',
        performedBy: '',
        beforeValue: before ?? null,
      });
      return { ok: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn_participant_task_config', versionId] }),
  });
}

