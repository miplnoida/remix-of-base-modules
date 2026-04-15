import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Data can be an array (owners, dependants) or a plain object (scalar tab fields). */
type EditDataPayload = any[] | Record<string, any>;

interface UseMeetingEditDataReturn {
  savedData: EditDataPayload | null;
  hasSavedData: boolean;
  isLoading: boolean;
  isSaving: boolean;
  save: (data: EditDataPayload, originalData?: EditDataPayload, modifiedBy?: string) => Promise<void>;
}

/**
 * Reusable hook for persisting user-edited tab data (locations, dependants,
 * scalar fields, etc.) during the meeting review process.
 *
 * On first load from the external API, call `save(apiData, apiData, userCode)` to
 * snapshot the original. On subsequent visits, `savedData` will be non-null and
 * the caller should seed its UI state from it instead of re-fetching from the API.
 */
export function useMeetingEditData(
  meetingId: string | undefined,
  dataType: string
): UseMeetingEditDataReturn {
  const queryClient = useQueryClient();
  const queryKey = ['meeting-edit-data', meetingId, dataType];

  const { data: row, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!meetingId) return null;
      const { data, error } = await supabase
        .from('meeting_edit_data')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('data_type', dataType)
        .maybeSingle();
      if (error) {
        console.error('useMeetingEditData load error:', error);
        return null;
      }
      return data;
    },
    enabled: !!meetingId,
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: async ({
      dataJson,
      originalApiJson,
      modifiedBy,
    }: {
      dataJson: EditDataPayload;
      originalApiJson?: EditDataPayload;
      modifiedBy?: string;
    }) => {
      if (!meetingId) throw new Error('meetingId is required');

      // Upsert: insert or update on conflict(meeting_id, data_type)
      const payload: Record<string, any> = {
        meeting_id: meetingId,
        data_type: dataType,
        data_json: dataJson,
        modified_by: modifiedBy || null,
      };

      // Only set original_api_json on first insert (when no saved data yet)
      if (!row && originalApiJson) {
        payload.original_api_json = originalApiJson;
      }

      const { error } = await supabase
        .from('meeting_edit_data')
        .upsert(payload as any, { onConflict: 'meeting_id,data_type' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const save = async (data: EditDataPayload, originalData?: EditDataPayload, modifiedBy?: string) => {
    await mutation.mutateAsync({
      dataJson: data,
      originalApiJson: originalData,
      modifiedBy,
    });
  };

  return {
    savedData: row ? (row as any).data_json : null,
    hasSavedData: !!row,
    isLoading,
    isSaving: mutation.isPending,
    save,
  };
}
