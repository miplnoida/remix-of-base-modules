import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function useAuditDiscussions(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: thread } = useQuery({
    queryKey: ['ia_discussion_threads', entityType, entityId],
    queryFn: async (): Promise<any> => {
      const { data, error } = await (supabase.from('ia_discussion_threads' as any).select('*') as any)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const threadId = thread?.id as string | undefined;

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['ia_discussion_comments', threadId],
    queryFn: async (): Promise<any[]> => {
      if (!threadId) return [];
      const { data, error } = await (supabase.from('ia_discussion_comments' as any).select('*') as any)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!threadId,
  });

  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`discussion-${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ia_discussion_comments', filter: `thread_id=eq.${threadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ia_discussion_comments', threadId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, queryClient]);

  const createThread = useMutation({
    mutationFn: async (data: { entity_type: string; entity_id: string; created_by?: string }) => {
      const { data: result, error } = await (supabase.from('ia_discussion_threads' as any).insert(data as any).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_discussion_threads', entityType, entityId] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const addComment = useMutation({
    mutationFn: async (data: { thread_id: string; author_name: string; content: string; mentioned_users?: string[] }) => {
      const { data: result, error } = await (supabase.from('ia_discussion_comments' as any).insert(data as any).select().single() as any);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_discussion_comments', threadId] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { thread, comments, createThread, addComment, isLoading };
}
