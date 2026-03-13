import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function useAuditDiscussions(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch or find thread for this entity
  const { data: thread } = useQuery({
    queryKey: ['ia_discussion_threads', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_discussion_threads' as any)
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch comments for thread
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['ia_discussion_comments', thread?.id],
    queryFn: async () => {
      if (!thread?.id) return [];
      const { data, error } = await supabase
        .from('ia_discussion_comments' as any)
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!thread?.id,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!thread?.id) return;
    const channel = supabase
      .channel(`discussion-${thread.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ia_discussion_comments', filter: `thread_id=eq.${thread.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ia_discussion_comments', thread.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread?.id, queryClient]);

  const createThread = useMutation({
    mutationFn: async (data: { entity_type: string; entity_id: string; created_by?: string }) => {
      const { data: result, error } = await supabase
        .from('ia_discussion_threads' as any)
        .insert(data)
        .select()
        .single();
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
      const { data: result, error } = await supabase
        .from('ia_discussion_comments' as any)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ia_discussion_comments', thread?.id] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { thread, comments, createThread, addComment, isLoading };
}
