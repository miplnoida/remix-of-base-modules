import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DocumentFilters {
  searchText?: string;
  docType?: string[];
  caseType?: string[];
  uploadedBy?: string;
  uploadedFrom?: string;
  uploadedTo?: string;
  confidential?: boolean;
  tags?: string[];
  markedAsEvidence?: boolean;
  eSignStatus?: string[];
}

export interface DocumentShare {
  expiresInHours: number;
  watermarkText?: string;
  maxAccessCount?: number;
}

export const useLegalDocuments = (filters?: DocumentFilters) => {
  return useQuery({
    queryKey: ['legal-documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('legal_documents')
        .select(`
          *,
          case:legal_cases(number, title, case_type)
        `)
        .order('uploaded_at', { ascending: false });

      if (filters?.searchText) {
        query = query.or(`name.ilike.%${filters.searchText}%,ocr_text.ilike.%${filters.searchText}%`);
      }

      if (filters?.docType && filters.docType.length > 0) {
        query = query.in('type', filters.docType as any);
      }

      if (filters?.uploadedBy) {
        query = query.eq('uploaded_by', filters.uploadedBy);
      }

      if (filters?.uploadedFrom) {
        query = query.gte('uploaded_at', filters.uploadedFrom);
      }

      if (filters?.uploadedTo) {
        query = query.lte('uploaded_at', filters.uploadedTo);
      }

      if (filters?.confidential !== undefined) {
        query = query.eq('confidential', filters.confidential);
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.markedAsEvidence !== undefined) {
        query = query.eq('marked_as_evidence', filters.markedAsEvidence);
      }

      if (filters?.eSignStatus && filters.eSignStatus.length > 0) {
        query = query.in('esign_status', filters.eSignStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (document: any) => {
      const { data, error } = await supabase
        .from('legal_documents')
        .insert(document)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast({ title: 'Document uploaded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateDocumentVersion = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // First get current version
      const { data: current } = await supabase
        .from('legal_documents')
        .select('version')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('legal_documents')
        .update({ ...updates, version: (current?.version || 1) + 1 })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast({ title: 'New version created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Version creation failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useShareDocument = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ documentId, share }: { documentId: string; share: DocumentShare }) => {
      const accessToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + share.expiresInHours);

      const { data, error } = await supabase
        .from('legal_document_shares')
        .insert({
          document_id: documentId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          expires_at: expiresAt.toISOString(),
          access_token: accessToken,
          watermark_text: share.watermarkText,
          max_access_count: share.maxAccessCount,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, shareUrl: `${window.location.origin}/shared/document/${accessToken}` };
    },
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.shareUrl);
      toast({ title: 'Share link created and copied to clipboard' });
    },
    onError: (error: Error) => {
      toast({ title: 'Share creation failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateDocumentESign = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, eSignData }: { id: string; eSignData: any }) => {
      const { data, error } = await supabase
        .from('legal_documents')
        .update({
          esign_status: 'Sent',
          esign_provider: eSignData.provider,
          esign_envelope_id: eSignData.envelopeId,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast({ title: 'Document sent for eSignature' });
    },
    onError: (error: Error) => {
      toast({ title: 'eSign request failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useToggleEvidence = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, marked }: { id: string; marked: boolean }) => {
      const { data, error } = await supabase
        .from('legal_documents')
        .update({ marked_as_evidence: marked })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast({ 
        title: variables.marked ? 'Marked as evidence' : 'Unmarked as evidence' 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useBulkUpdateDocuments = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: any }) => {
      const { data, error } = await supabase
        .from('legal_documents')
        .update(updates)
        .in('id', ids)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast({ title: 'Documents updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Bulk update failed', description: error.message, variant: 'destructive' });
    },
  });
};

export const useSavedSearches = () => {
  return useQuery({
    queryKey: ['document-saved-searches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_document_saved_searches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useSaveSearch = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, filters, isDefault }: { name: string; filters: DocumentFilters; isDefault?: boolean }) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_document_saved_searches')
        .insert({
          user_id: user.id,
          name,
          filters: filters as any,
          is_default: isDefault || false,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-saved-searches'] });
      toast({ title: 'Search saved successfully' });
    },
  });
};
